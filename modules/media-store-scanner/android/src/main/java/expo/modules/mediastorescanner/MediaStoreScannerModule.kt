package expo.modules.mediastorescanner

import android.content.ContentUris
import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

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