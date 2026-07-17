import React, { useState, useEffect, useCallback, memo } from 'react';
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
import { PDFDocument } from 'pdf-lib';
import * as base64js from 'base64-js';
import { router } from 'expo-router';
import ScreenHeader from '../components/screen-header';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';
import { Colors } from '../constants/app-theme';

type FileEntry = { name: string; uri: string; path: string };

export default function MergePdfTool() {
  const [pdfFiles, setPdfFiles] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
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
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  }, []);

  const mergePdfs = async () => {
    const filesToMerge = pdfFiles.filter((f) => selected.has(f.uri));
    if (filesToMerge.length < 2) {
      setStatus('Select at least 2 PDFs to merge');
      return;
    }

    setMerging(true);
    setStatus(`Merging ${filesToMerge.length} PDFs...`);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of filesToMerge) {
        const base64 = await FileSystem.readAsStringAsync(`file://${file.path}`, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes = base64js.toByteArray(base64);
        const sourcePdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBase64 = await mergedPdf.saveAsBase64();
      const outputName = `Merged_${Date.now()}.pdf`;
      const savedUri = await MediaStoreScanner.saveToDownloads(outputName, mergedBase64, 'application/pdf');

      setStatus(`Saved to Downloads — ${outputName}`);
      setSelected(new Set());

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: savedUri,
        flags: 1,
        type: 'application/pdf',
      });
    } catch (err: any) {
      setStatus(`Merge failed: ${err.message}`);
    }
    setMerging(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Merge PDF" />
      <View style={styles.content}>
      <Text style={styles.subtitle}>Select 2 or more PDFs to combine into one file</Text>

      {loading && <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected.size >= 2 && (
        <TouchableOpacity style={[styles.primaryButton, merging && styles.buttonDisabled]} onPress={mergePdfs} disabled={merging}>
          <Text style={styles.primaryButtonText}>{merging ? 'Merging...' : `Merge ${selected.size} Selected PDFs`}</Text>
        </TouchableOpacity>
      )}
      {merging && <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 10 }} />}

      <FlatList
        data={pdfFiles}
        extraData={selected}
        keyExtractor={(item, i) => i.toString()}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <FileRow item={item} isSelected={selected.has(item.uri)} onToggle={toggleSelect} />
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
      <Text style={styles.checkboxText}>{isSelected ? '☑' : '☐'}</Text>
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
  checkboxText: { fontSize: 20, marginRight: 10, color: Colors.accent },
  item: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary, flex: 1 },
});