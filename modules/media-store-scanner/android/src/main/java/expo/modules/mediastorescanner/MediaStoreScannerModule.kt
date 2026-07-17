package expo.modules.mediastorescanner

import android.content.ContentUris
import android.content.ContentValues
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.os.StatFs
import android.provider.MediaStore
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class MediaStoreScannerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MediaStoreScanner")

    Function("hasFullAccess") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Environment.isExternalStorageManager()
      } else {
        true
      }
    }

    Function("getStorageInfo") {
      val context = appContext.reactContext ?: throw Exception("No context available")

      fun statsFor(path: File): Map<String, Any> {
        val stat = StatFs(path.path)
        val total = stat.blockCountLong * stat.blockSizeLong
        val free = stat.availableBlocksLong * stat.blockSizeLong
        val used = total - free
        return mapOf("total" to total, "used" to used, "free" to free)
      }

      var internal: Map<String, Any> = statsFor(Environment.getExternalStorageDirectory())
      var sdCard: Map<String, Any>? = null

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val storageManager = context.getSystemService(android.os.storage.StorageManager::class.java)
        val volumes = storageManager.storageVolumes

        for (volume in volumes) {
          val dir = volume.directory ?: continue
          try {
            val stats = statsFor(dir)
            if (volume.isRemovable) {
              // Only trust it if it looks like a real, reasonably-sized volume
              val totalBytes = stats["total"] as Long
              if (totalBytes > 100L * 1024 * 1024) { // ignore anything under 100MB, likely a bogus mount
                sdCard = stats
              }
            } else if (volume.isPrimary) {
              internal = stats
            }
          } catch (e: Exception) {
            // skip unreadable volume
          }
        }
      }

      mapOf(
        "internal" to internal,
        "sdCard" to sdCard
      )
    }

    AsyncFunction("saveToDownloads") { fileName: String, base64Content: String, mimeType: String ->
      val context = appContext.reactContext
        ?: throw Exception("No context available")

      val resolver = context.contentResolver
      val values = ContentValues().apply {
        put(MediaStore.Downloads.DISPLAY_NAME, fileName)
        put(MediaStore.Downloads.MIME_TYPE, mimeType)
        put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
      }

      val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
      val itemUri = resolver.insert(collection, values)
        ?: throw Exception("Failed to create file entry in Downloads")

      val bytes = Base64.decode(base64Content, Base64.DEFAULT)
      resolver.openOutputStream(itemUri)?.use { stream ->
        stream.write(bytes)
      } ?: throw Exception("Failed to open output stream")

      itemUri.toString()
    }

    AsyncFunction("convertPdfToImages") { pdfPath: String, outputPrefix: String ->
      val context = appContext.reactContext ?: throw Exception("No context available")
      val resolver = context.contentResolver
      val results = mutableListOf<String>()

      val file = File(pdfPath)
      val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
      val renderer = PdfRenderer(pfd)

      try {
        for (i in 0 until renderer.pageCount) {
          val page = renderer.openPage(i)
          val scale = 2
          val bitmap = Bitmap.createBitmap(page.width * scale, page.height * scale, Bitmap.Config.ARGB_8888)
          bitmap.eraseColor(Color.WHITE)
          page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
          page.close()

          val fileName = "${outputPrefix}_page${i + 1}.png"
          val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, fileName)
            put(MediaStore.Downloads.MIME_TYPE, "image/png")
            put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
          }

          val itemUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw Exception("Failed to create image entry for page ${i + 1}")

          resolver.openOutputStream(itemUri)?.use { stream ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
          } ?: throw Exception("Failed to open output stream for page ${i + 1}")

          bitmap.recycle()
          results.add(itemUri.toString())
        }
      } finally {
        renderer.close()
        pfd.close()
      }

      results
    }

    AsyncFunction("queryAllFiles") {
      val results = mutableListOf<Map<String, Any?>>()
      val context = appContext.reactContext ?: return@AsyncFunction results

      val collection = MediaStore.Files.getContentUri("external")
      val projection = arrayOf(
        MediaStore.Files.FileColumns._ID,
        MediaStore.Files.FileColumns.DISPLAY_NAME,
        MediaStore.Files.FileColumns.DATA,
        MediaStore.Files.FileColumns.SIZE,
        MediaStore.Files.FileColumns.MIME_TYPE
      )

      // Path fragments that only ever contain generated thumbnails, app
      // caches, or other junk that MediaStore happens to index but that
      // isn't a real user-visible file.
      val junkPathFragments = listOf(
        "/.thumbnails/",
        "/.thumbnail/",
        "/thumbnails/",
        "/.cache/",
        "/cache/",
        "/.trashed",
        "/.trash/",
        "/android/data/",
        "/android/obb/",
        "/androidmedia/",
        "/.temp/",
        "/.tmp/"
      )

      fun isJunk(name: String, path: String, size: Long): Boolean {
        if (size <= 0L) return true // zero-byte / corrupt entries
        if (name.startsWith(".")) return true // hidden files
        val lowerPath = path.lowercase()
        if (lowerPath.split("/").any { it.startsWith(".") && it.isNotEmpty() }) return true // any hidden folder in the path
        return junkPathFragments.any { lowerPath.contains(it) }
      }

      val cursor = context.contentResolver.query(collection, projection, null, null, null)
      cursor?.use {
        val idCol = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
        val nameCol = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
        val dataCol = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATA)
        val sizeCol = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.SIZE)
        val mimeCol = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)

        while (it.moveToNext()) {
          val id = it.getLong(idCol)
          val name = it.getString(nameCol) ?: continue
          val path = it.getString(dataCol) ?: ""
          val size = it.getLong(sizeCol)
          val mime = it.getString(mimeCol) ?: ""

          if (isJunk(name, path, size)) continue

          val contentUri = ContentUris.withAppendedId(collection, id)

          results.add(
            mapOf(
              "name" to name,
              "path" to path,
              "uri" to contentUri.toString(),
              "size" to size,
              "mimeType" to mime
            )
          )
        }
      }

      results
    }
  }
}