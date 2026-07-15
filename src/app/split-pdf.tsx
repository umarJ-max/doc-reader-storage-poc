import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Button,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { PDFDocument } from 'pdf-lib';
import * as base64js from 'base64-js';
import { router } from 'expo-router';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';

type FileEntry = { name: string; uri: string; path: string };

export default function SplitPdfTool() {
  const [pdfFiles, setPdfFiles] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [splitting, setSplitting] = useState(false);
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

  const splitInHalf = async () => {
    const file = pdfFiles.find((f) => f.uri === selected);
    if (!file) {
      setStatus('Select a PDF first');
      return;
    }

    setSplitting(true);
    setStatus('Splitting PDF...');

    try {
      const base64 = await FileSystem.readAsStringAsync(`file://${file.path}`, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = base64js.toByteArray(base64);
      const sourcePdf = await PDFDocument.load(bytes);
      const totalPages = sourcePdf.getPageCount();

      if (totalPages < 2) {
        setStatus('PDF needs at least 2 pages to split');
        setSplitting(false);
        return;
      }

      const midpoint = Math.ceil(totalPages / 2);
      const baseName = file.name.replace(/\.pdf$/i, '');

      // Part 1
      const part1 = await PDFDocument.create();
      const part1Pages = await part1.copyPages(sourcePdf, [...Array(midpoint).keys()]);
      part1Pages.forEach((p) => part1.addPage(p));
      const part1Base64 = await part1.saveAsBase64();
      const part1Name = `${baseName}_Part1_${Date.now()}.pdf`;
      const part1Uri = await MediaStoreScanner.saveToDownloads(part1Name, part1Base64, 'application/pdf');

      // Part 2
      const part2 = await PDFDocument.create();
      const remainingIndices = Array.from({ length: totalPages - midpoint }, (_, i) => i + midpoint);
      const part2Pages = await part2.copyPages(sourcePdf, remainingIndices);
      part2Pages.forEach((p) => part2.addPage(p));
      const part2Base64 = await part2.saveAsBase64();
      const part2Name = `${baseName}_Part2_${Date.now()}.pdf`;
      const part2Uri = await MediaStoreScanner.saveToDownloads(part2Name, part2Base64, 'application/pdf');

      setStatus(`Saved 2 files to Downloads: ${part1Name}, ${part2Name}`);
      setSelected(null);

      // Open the first part so the user can immediately confirm it worked
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: part1Uri,
        flags: 1,
        type: 'application/pdf',
      });
    } catch (err: any) {
      setStatus(`Split failed: ${err.message}`);
    }
    setSplitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button title="< Back" onPress={() => router.back()} />
      <Text style={styles.title}>Split PDF</Text>
      <Text style={styles.subtitle}>Select a PDF to split into two equal halves</Text>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected && (
        <Button
          title={splitting ? 'Splitting...' : 'Split in Half'}
          onPress={splitInHalf}
          disabled={splitting}
        />
      )}
      {splitting && <ActivityIndicator size="large" style={{ marginTop: 10 }} />}

      <FlatList
        data={pdfFiles}
        extraData={selected}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.fileRow}
            onPress={() => setSelected(selected === item.uri ? null : item.uri)}
          >
            <Text style={styles.radioText}>{selected === item.uri ? '🔘' : '⚪'}</Text>
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
  radioText: { fontSize: 18, marginRight: 10 },
  item: { fontSize: 14, color: '#000', flex: 1 },
});
