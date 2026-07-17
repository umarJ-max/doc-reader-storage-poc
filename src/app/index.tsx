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
  AppState,
  TextInput,
} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/screen-header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';
import { Colors, getCategoryColor } from '../constants/app-theme';

type FileEntry = { name: string; uri: string; path: string; category: string };

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; exts: string[] }[] = [
  { key: 'pdf', label: 'PDF', icon: 'document-text', exts: ['pdf'] },
  { key: 'word', label: 'Word', icon: 'document', exts: ['doc', 'docx'] },
  { key: 'excel', label: 'Excel', icon: 'grid', exts: ['xls', 'xlsx'] },
  { key: 'ppt', label: 'PowerPoint', icon: 'easel', exts: ['ppt', 'pptx'] },
  { key: 'txt', label: 'Text', icon: 'reader', exts: ['txt'] },
  { key: 'zip', label: 'Compressed', icon: 'archive', exts: ['zip', 'rar', '7z'] },
  { key: 'image', label: 'Images', icon: 'image', exts: ['jpg', 'jpeg', 'png', 'gif'] },
  { key: 'video', label: 'Videos', icon: 'videocam', exts: ['mp4', 'mkv', 'mov', 'avi'] },
];

const CATEGORY_TITLES: Record<string, string> = {
  recent: 'Recent Files',
  bookmarks: 'Bookmarks',
  ...Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label])),
};

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

function getCategory(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  for (const cat of CATEGORIES) {
    if (cat.exts.includes(ext)) return cat.key;
  }
  return 'other';
}

// Renders the colorful badge icon for a category tile - either a letter badge (file types)
// or an Ionicons glyph (Recent Files / Bookmarks)
function CategoryIcon({ categoryKey }: { categoryKey: string }) {
  const color = getCategoryColor(categoryKey);
  if (categoryKey === 'recent') {
    return (
      <View style={[styles.iconBadge, { backgroundColor: color }]}>
        <Ionicons name="time" size={22} color="#FFF" />
      </View>
    );
  }
  if (categoryKey === 'bookmarks') {
    return (
      <View style={[styles.iconBadge, { backgroundColor: color }]}>
        <Ionicons name="star" size={22} color="#FFF" />
      </View>
    );
  }
  const cat = CATEGORIES.find((c) => c.key === categoryKey);
  return (
    <View style={[styles.iconBadge, { backgroundColor: color }]}>
      <Ionicons name={cat?.icon || 'document'} size={22} color="#FFF" />
    </View>
  );
}

export default function Index() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [recentFiles, setRecentFiles] = useState<(FileEntry & { openedAt: number })[]>([]);
  const [bookmarkedUris, setBookmarkedUris] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [storageInfo, setStorageInfo] = useState<{
    internal: { total: number; used: number; free: number };
    sdCard: { total: number; used: number; free: number } | null;
  } | null>(null);

  const BOOKMARKS_KEY = 'bookmarked_files_v1';
  const RECENT_KEY = 'recent_files_v1';

  const loadBookmarks = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
      if (raw) setBookmarkedUris(new Set(JSON.parse(raw)));
    } catch {
      // start empty if load fails
    }
  }, []);

  const toggleBookmark = async (uri: string) => {
    const next = new Set(bookmarkedUris);
    if (next.has(uri)) next.delete(uri);
    else next.add(uri);
    setBookmarkedUris(next);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(next)));
  };

  const loadRecent = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) setRecentFiles(JSON.parse(raw));
    } catch {
      // ignore, just start with empty recent list
    }
  }, []);

  const addToRecent = async (file: FileEntry) => {
    try {
      const existing = recentFiles.filter((f) => f.uri !== file.uri);
      const updated = [{ ...file, openedAt: Date.now() }, ...existing].slice(0, 15);
      setRecentFiles(updated);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // non-critical, don't block file opening if this fails
    }
  };

  const checkAccess = useCallback(() => {
    try {
      const granted = MediaStoreScanner.hasFullAccess();
      setHasAccess(granted);
    } catch {
      setHasAccess(false);
    }
  }, []);

  // Guards against two scans firing back-to-back (e.g. mount + immediate
  // AppState 'active' event on some devices).
  const scanInFlightRef = React.useRef(false);
  const statusClearTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const runScan = useCallback(async () => {
    if (scanInFlightRef.current) return;
    scanInFlightRef.current = true;
    setScanning(true);
    if (statusClearTimer.current) clearTimeout(statusClearTimer.current);
    try {
      const nativeFiles = await MediaStoreScanner.queryAllFiles();
      const results: FileEntry[] = nativeFiles
        .filter((f) => f.name && f.name.length > 0)
        .map((f) => ({
          name: f.name,
          uri: f.uri,
          path: f.path,
          category: getCategory(f.name),
        }));

      setAllFiles(results);
      setStatus(`Up to date — ${results.length} files`);
    } catch (err: any) {
      setStatus(`Scan failed: ${err.message}`);
    }
    setScanning(false);
    scanInFlightRef.current = false;
    // Clear the status line shortly after so it doesn't linger as clutter.
    statusClearTimer.current = setTimeout(() => setStatus(''), 2500);
  }, []);

  // Auto-scan on first mount and every time the app returns to the
  // foreground — no manual "Scan Device" button required.
  useEffect(() => {
    checkAccess();
    loadRecent();
    loadBookmarks();
    try {
      const info = MediaStoreScanner.getStorageInfo();
      setStorageInfo(info);
    } catch {
      // storage info is non-critical, fail silently
    }
    return () => {
      if (statusClearTimer.current) clearTimeout(statusClearTimer.current);
    };
  }, [checkAccess]);

  // Re-check permission and re-scan every time the app comes to the
  // foreground (covers "open app → always up to date" without a manual button).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkAccess();
        if (hasAccess) runScan();
      }
    });
    return () => subscription.remove();
  }, [checkAccess, hasAccess, runScan]);

  useEffect(() => {
    if (hasAccess) {
      runScan();
    }
  }, [hasAccess, runScan]);

  const requestAccess = async () => {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
        { data: 'package:com.umarj1.docreaderstoragepoc' }
      );
    } catch {
      await IntentLauncher.startActivityAsync('android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION');
    }
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
        data: file.uri,
        flags: 1,
        type: getMimeType(file.name),
      });
      addToRecent(file);
    } catch (err: any) {
      setStatus(`Could not open file: ${err.message}`);
    }
  };

  // ---- RENDER: Permission gate ----
  if (hasAccess === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.mutedText}>Checking permissions...</Text>
      </SafeAreaView>
    );
  }

  if (hasAccess === false) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionIconBadge}>
          <Ionicons name="folder-open" size={40} color={Colors.accent} />
        </View>
        <Text style={styles.permissionTitle}>Access Your Files</Text>
        <Text style={styles.permissionText}>
          Doc Tools needs full file access to find and manage your documents, PDFs, images and more. Grant "Allow management of all files" on the next screen.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestAccess}>
          <Text style={styles.primaryButtonText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textLinkButton} onPress={checkAccess}>
          <Text style={styles.secondaryButtonText}>I've granted it — check again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ---- RENDER: Category file list (tap to open, star to bookmark) ----
  if (selectedCategory) {
    const filtered = selectedCategory === 'recent'
      ? recentFiles
      : selectedCategory === 'bookmarks'
      ? allFiles.filter((f) => bookmarkedUris.has(f.uri))
      : allFiles.filter((f) => f.category === selectedCategory);

    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={CATEGORY_TITLES[selectedCategory] || 'Files'} onBack={() => setSelectedCategory(null)} />
        <View style={styles.content}>
          <Text style={styles.status}>{filtered.length} files</Text>

          <FlatList
            key="file-list"
            data={filtered}
            extraData={bookmarkedUris}
            keyExtractor={(item, i) => i.toString()}
            ItemSeparatorComponent={() => <View style={styles.fileDivider} />}
            renderItem={({ item }) => (
              <View style={styles.fileRow}>
                <View style={[styles.fileTypeIcon, { backgroundColor: getCategoryColor(item.category) }]}>
                  <Ionicons name={CATEGORIES.find((c) => c.key === item.category)?.icon || 'document'} size={16} color="#FFF" />
                </View>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => openFile(item)}>
                  <Text style={styles.item} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleBookmark(item.uri)} style={styles.bookmarkStar}>
                  <Ionicons
                    name={bookmarkedUris.has(item.uri) ? 'star' : 'star-outline'}
                    size={20}
                    color={bookmarkedUris.has(item.uri) ? '#F5B301' : Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ---- RENDER: Search results (overrides grid while searching) ----
  if (searchQuery.trim().length > 0) {
    const results = allFiles.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Doc Tools</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search anything..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          <Text style={styles.status}>{results.length} results</Text>
          <FlatList
            key="search-results"
            data={results}
            extraData={bookmarkedUris}
            keyExtractor={(item, i) => i.toString()}
            ItemSeparatorComponent={() => <View style={styles.fileDivider} />}
            renderItem={({ item }) => (
              <View style={styles.fileRow}>
                <View style={[styles.fileTypeIcon, { backgroundColor: getCategoryColor(item.category) }]}>
                  <Ionicons name={CATEGORIES.find((c) => c.key === item.category)?.icon || 'document'} size={16} color="#FFF" />
                </View>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => openFile(item)}>
                  <Text style={styles.item} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleBookmark(item.uri)} style={styles.bookmarkStar}>
                  <Ionicons
                    name={bookmarkedUris.has(item.uri) ? 'star' : 'star-outline'}
                    size={20}
                    color={bookmarkedUris.has(item.uri) ? '#F5B301' : Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ---- RENDER: Home category grid ----
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Doc Tools</Text>
          <TouchableOpacity
            onPress={runScan}
            disabled={scanning}
            style={styles.refreshButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {scanning ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anything..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {status ? <Text style={styles.statusSmall}>{status}</Text> : null}

        <FlatList
          key="category-grid"
          data={[
            { key: 'recent', label: 'Recent Files', badge: '', exts: [] },
            { key: 'bookmarks', label: 'Bookmarks', badge: '', exts: [] },
            ...CATEGORIES,
          ]}
          keyExtractor={(item) => item.key}
          numColumns={2}
          extraData={[allFiles, recentFiles, bookmarkedUris]}
          renderItem={({ item }) => {
            const count =
              item.key === 'recent'
                ? recentFiles.length
                : item.key === 'bookmarks'
                ? bookmarkedUris.size
                : allFiles.filter((f) => f.category === item.key).length;
            return (
              <TouchableOpacity style={styles.categoryBox} onPress={() => setSelectedCategory(item.key)}>
                <CategoryIcon categoryKey={item.key} />
                <Text style={styles.categoryLabel}>{item.label}</Text>
                <Text style={styles.categoryCount}>{count} Files</Text>
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Discover Your Files</Text>}
          ListFooterComponent={
            <View>
              <Text style={styles.sectionTitle}>Tools</Text>
              <View style={styles.toolsRow}>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/merge-pdf' as any)}>
                  <Ionicons name="git-merge" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>Merge PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/images-to-pdf' as any)}>
                  <Ionicons name="images" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>Images to PDF</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toolsRow}>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/pdf-to-image' as any)}>
                  <Ionicons name="image" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>PDF to Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/watermark-pdf' as any)}>
                  <Ionicons name="water" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>Watermark PDF</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toolsRow}>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/split-pdf' as any)}>
                  <Ionicons name="cut" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>Split PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/notes' as any)}>
                  <Ionicons name="document-text" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>Create Notes</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toolsRow}>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/scan?mode=qr' as any)}>
                  <Ionicons name="qr-code" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>Scan QR Code</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/scan?mode=barcode' as any)}>
                  <Ionicons name="barcode" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>Scan Barcode</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toolsRow}>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/whatsapp-chat' as any)}>
                  <Ionicons name="logo-whatsapp" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>WhatsApp Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBox} onPress={() => router.push('/settings' as any)}>
                  <Ionicons name="settings" size={22} color={Colors.accent} />
                  <Text style={styles.toolLabel}>Settings</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>File Manager</Text>
              {storageInfo && (
                <View>
                  <View style={styles.storageBox}>
                    <Text style={styles.storageLabel}>Internal Storage</Text>
                    <Text style={styles.storageValue}>
                      {formatBytes(storageInfo.internal.used)} of {formatBytes(storageInfo.internal.total)} used
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(100, (storageInfo.internal.used / storageInfo.internal.total) * 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                  {storageInfo.sdCard && (
                    <View style={styles.storageBox}>
                      <Text style={styles.storageLabel}>Memory Card</Text>
                      <Text style={styles.storageValue}>
                        {formatBytes(storageInfo.sdCard.used)} of {formatBytes(storageInfo.sdCard.total)} used
                      </Text>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(100, (storageInfo.sdCard.used / storageInfo.sdCard.total) * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: Colors.background },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: Colors.background,
  },
  permissionIconBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  textLinkButton: { paddingVertical: 10, marginTop: 6 },
  content: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 50,
    marginBottom: 14,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedText: { color: Colors.textSecondary, marginTop: 10 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 4,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  status: { marginVertical: 10, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  statusSmall: { marginBottom: 8, fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  item: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  fileDivider: { height: 1, backgroundColor: Colors.border },
  fileTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookmarkStar: { paddingHorizontal: 10, paddingVertical: 6 },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: Colors.accent, fontWeight: '600', fontSize: 14 },
  categoryBox: {
    flex: 1,
    margin: 6,
    padding: 18,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    alignItems: 'center',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  categoryLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  categoryCount: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: Colors.textPrimary },
  toolsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  storageBox: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  storageLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  storageValue: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  toolBox: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  toolLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
});