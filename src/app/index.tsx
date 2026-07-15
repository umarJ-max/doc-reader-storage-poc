import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  Button,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';

const ROOT_PATH = 'file:///storage/emulated/0/';

// Always-block: genuinely private/system, never useful
const HARD_SKIP = ['/Android/data', '/Android/obb', '/.thumbnails', '/.trash', '/LOST.DIR'];

// Known junk inside Android/media (stickers, statuses, cached sent/received media previews)
const JUNK_MEDIA_KEYWORDS = [
  'sticker', 'status', 'wallpaper', 'profile photo', 'voice note',
  'sent images', 'sent video', 'received images', 'received video',
  '.shared', '.trashed', 'sent/images', 'sent/video', 'received/images', 'received/video',
];

function shouldSkipPath(fullPath: string): boolean {
  if (HARD_SKIP.some((p) => fullPath.includes(p))) return true;

  const lower = fullPath.toLowerCase();
  if (lower.includes('/android/media/')) {
    // Inside Android/media specifically — block known junk, but let real "Documents" folders through
    if (JUNK_MEDIA_KEYWORDS.some((k) => lower.includes(k))) return true;
  }
  return false;
}

type FileEntry = { name: string; uri: string; category: string };

const CATEGORIES: { key: string; label: string; exts: string[] }[] = [
  { key: 'pdf', label: 'PDF', exts: ['pdf'] },
  { key: 'word', label: 'Word', exts: ['doc', 'docx'] },
  { key: 'excel', label: 'Excel', exts: ['xls', 'xlsx'] },
  { key: 'ppt', label: 'PowerPoint', exts: ['ppt', 'pptx'] },
  { key: 'txt', label: 'Text', exts: ['txt'] },
  { key: 'zip', label: 'Compressed', exts: ['zip', 'rar', '7z'] },
  { key: 'image', label: 'Images', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
  { key: 'video', label: 'Videos', exts: ['mp4', 'mkv', 'mov', 'avi'] },
];

function getCategory(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  for (const cat of CATEGORIES) {
    if (cat.exts.includes(ext)) return cat.key;
  }
  return 'other';
}

export default function Index() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null); // null = checking
  const [scanning, setScanning] = useState(false);
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const checkAccess = useCallback(async () => {
    try {
      await FileSystem.readDirectoryAsync(ROOT_PATH);
      setHasAccess(true);
    } catch {
      setHasAccess(false);
    }
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const requestAccess = async () => {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
        { data: 'package:com.umarj1.docreaderstoragepoc' } // matches app.json android.package
      );
    } catch {
      // Fallback to the general settings page if the app-specific one fails
      await IntentLauncher.startActivityAsync('android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION');
    }
  };

  const runScan = async () => {
    setScanning(true);
    setStatus('Querying MediaStore (native)...');
    try {
      const nativeFiles = await MediaStoreScanner.queryAllFiles();
      const results: FileEntry[] = nativeFiles
        .filter((f) => f.name && f.name.length > 0)
        .map((f) => ({
          name: f.name,
          uri: f.uri, // content:// URI, already directly openable — no FileProvider conversion needed
          category: getCategory(f.name),
        }));

      setAllFiles(results);
      const categorized = results.filter((f) => f.category !== 'other').length;
      const other = results.length - categorized;
      setStatus(`Scan complete (native) — ${results.length} files (${other} uncategorized)`);
    } catch (err: any) {
      setStatus(`Native scan failed: ${err.message}`);
    }
    setScanning(false);
  };

  const getMimeType = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'ppt': return 'application/vnd.ms-powerpoint';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'zip': return 'application/zip';
      case 'txt': return 'text/plain';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'mp4': return 'video/mp4';
      default: return '*/*';
    }
  };

  const openFile = async (file: FileEntry) => {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: file.uri, // already a content:// URI from MediaStore, directly openable
        flags: 1,
        type: getMimeType(file.name),
      });
    } catch (err: any) {
      setStatus(`Could not open file: ${err.message}`);
    }
  };

  // ---- RENDER: Permission gate ----
  if (hasAccess === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Checking permissions...</Text>
      </SafeAreaView>
    );
  }

  if (hasAccess === false) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.status}>This app needs full file access to scan your device.</Text>
        <Button title="Grant Access" onPress={requestAccess} />
        <View style={{ height: 12 }} />
        <Button title="I've granted it — check again" onPress={checkAccess} />
      </SafeAreaView>
    );
  }

  // ---- RENDER: Category file list ----
  if (selectedCategory) {
    const filtered = allFiles.filter((f) => f.category === selectedCategory);
    return (
      <SafeAreaView style={styles.container}>
        <Button title="< Back to Categories" onPress={() => setSelectedCategory(null)} />
        <Text style={styles.status}>{filtered.length} files</Text>
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => i.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openFile(item)}>
              <Text style={styles.item}>📄 {item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // ---- RENDER: Home category grid ----
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Document Reader</Text>
      {allFiles.length === 0 ? (
        <Button title={scanning ? 'Scanning...' : 'Scan Device'} onPress={runScan} disabled={scanning} />
      ) : (
        <Button title="Re-scan Device" onPress={runScan} disabled={scanning} />
      )}
      {scanning && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      <Text style={styles.status}>{status}</Text>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        numColumns={2}
        renderItem={({ item }) => {
          const count = allFiles.filter((f) => f.category === item.key).length;
          return (
            <TouchableOpacity style={styles.categoryBox} onPress={() => setSelectedCategory(item.key)}>
              <Text style={styles.categoryLabel}>{item.label}</Text>
              <Text style={styles.categoryCount}>{count}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#000' },
  status: { marginVertical: 10, fontWeight: 'bold', color: '#000', textAlign: 'center' },
  item: { paddingVertical: 6, fontSize: 14, color: '#000' },
  categoryBox: {
    flex: 1,
    margin: 6,
    padding: 20,
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    alignItems: 'center',
  },
  categoryLabel: { fontSize: 15, fontWeight: '600', color: '#000' },
  categoryCount: { fontSize: 22, fontWeight: 'bold', color: '#208AEF', marginTop: 6 },
});