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
import * as IntentLauncher from 'expo-intent-launcher';
import { router } from 'expo-router';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';

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
      <Button title="< Back" onPress={() => router.back()} />
      <Text style={styles.title}>PDF to Image</Text>
      <Text style={styles.subtitle}>Select one PDF — every page becomes a PNG image</Text>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected && (
        <Button
          title={converting ? 'Converting...' : 'Convert to Images'}
          onPress={convert}
          disabled={converting}
        />
      )}
      {converting && <ActivityIndicator size="large" style={{ marginTop: 10 }} />}

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
