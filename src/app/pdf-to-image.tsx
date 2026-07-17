import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  SafeAreaView,
  Button,
  Text,
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { router } from 'expo-router';
import ScreenHeader from '../components/screen-header';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';
import { Colors } from '../constants/app-theme';

type FileEntry = { name: string; uri: string; path: string };

export default function PdfToImageTool() {
  const [pdfFiles, setPdfFiles] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null); // single selection
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadPdfs();
  }, []);

  const loadPdfs = async () => {
    setLoading(true);
    try {
      const files = await MediaStoreScanner.queryAllFiles();
      const pdfs = files
        .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
        .map((f) => ({ name: f.name, uri: f.uri, path: f.path }));
      setPdfFiles(pdfs);
    } catch (err: any) {
      setStatus(`Failed to load PDFs: ${err.message}`);
    }
    setLoading(false);
  };

  const toggleSelect = useCallback((uri: string) => {
    setSelected((prev) => (prev === uri ? null : uri));
  }, []);

  const convert = async () => {
    const file = pdfFiles.find((f) => f.uri === selected);
    if (!file) {
      setStatus('Select a PDF first');
      return;
    }

    setConverting(true);
    setStatus('Converting pages to images...');

    try {
      const prefix = file.name.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const resultUris = await MediaStoreScanner.convertPdfToImages(file.path, prefix);

      setStatus(`Saved ${resultUris.length} image(s) to Downloads`);
      setSelected(null);

      // Open the first page so the user can immediately confirm it worked
      if (resultUris.length > 0) {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: resultUris[0],
          flags: 1,
          type: 'image/png',
        });
      }
    } catch (err: any) {
      setStatus(`Conversion failed: ${err.message}`);
    }
    setConverting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="PDF to Image" />
      <View style={styles.content}>
      <Text style={styles.subtitle}>Select one PDF — every page becomes a PNG image</Text>

      {loading && <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected && (
        <TouchableOpacity style={[styles.primaryButton, converting && styles.buttonDisabled]} onPress={convert} disabled={converting}>
          <Text style={styles.primaryButtonText}>{converting ? 'Converting...' : 'Convert to Images'}</Text>
        </TouchableOpacity>
      )}
      {converting && <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 10 }} />}

      <FlatList
        data={pdfFiles}
        extraData={selected}
        keyExtractor={(item, i) => i.toString()}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <FileRow item={item} isSelected={selected === item.uri} onToggle={toggleSelect} />
        )}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={8}
        removeClippedSubviews
      />
      </View>

    </SafeAreaView>
  );
}

const FileRow = memo(function FileRow({
  item,
  isSelected,
  onToggle,
}: {
  item: FileEntry;
  isSelected: boolean;
  onToggle: (uri: string) => void;
}) {
  return (
    <TouchableOpacity style={styles.fileRow} onPress={() => onToggle(item.uri)} activeOpacity={0.6}>
      <Text style={styles.radioText}>{isSelected ? '🔘' : '⚪'}</Text>
      <Text style={styles.item} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 10, color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  status: { marginVertical: 8, fontWeight: '600', color: Colors.textSecondary },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  divider: { height: 1, backgroundColor: Colors.border },
  radioText: { fontSize: 18, marginRight: 10 },
  item: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary, flex: 1 },
});