import React, { useState, useEffect } from 'react';
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
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';

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

  const toggleSelect = (uri: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  };

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
      <Button title="< Back" onPress={() => router.back()} />
      <Text style={styles.title}>Merge PDF</Text>
      <Text style={styles.subtitle}>Select 2 or more PDFs to combine into one file</Text>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected.size >= 2 && (
        <Button
          title={merging ? 'Merging...' : `Merge ${selected.size} Selected PDFs`}
          onPress={mergePdfs}
          disabled={merging}
        />
      )}
      {merging && <ActivityIndicator size="large" style={{ marginTop: 10 }} />}

      <FlatList
        data={pdfFiles}
        extraData={selected}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.fileRow} onPress={() => toggleSelect(item.uri)}>
            <Text style={styles.checkboxText}>{selected.has(item.uri) ? '☑' : '☐'}</Text>
            <Text style={styles.item}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 10, color: '#000' },
  subtitle: { fontSize: 13, color: '#555', marginBottom: 10 },
  status: { marginVertical: 8, fontWeight: 'bold', color: '#000' },
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkboxText: { fontSize: 20, marginRight: 10 },
  item: { fontSize: 14, color: '#000', flex: 1 },
});
