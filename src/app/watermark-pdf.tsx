import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Button,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as base64js from 'base64-js';
import { router } from 'expo-router';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';

type FileEntry = { name: string; uri: string; path: string };

export default function WatermarkPdfTool() {
  const [pdfFiles, setPdfFiles] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
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

  const applyWatermark = async () => {
    const file = pdfFiles.find((f) => f.uri === selected);
    if (!file) {
      setStatus('Select a PDF first');
      return;
    }
    if (!watermarkText.trim()) {
      setStatus('Enter watermark text');
      return;
    }

    setProcessing(true);
    setStatus('Applying watermark...');

    try {
      const base64 = await FileSystem.readAsStringAsync(`file://${file.path}`, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = base64js.toByteArray(base64);
      const pdfDoc = await PDFDocument.load(bytes);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        const fontSize = 50;
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

        page.drawText(watermarkText, {
          x: width / 2 - textWidth / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.3,
          rotate: degrees(45),
        });
      }

      const outputBase64 = await pdfDoc.saveAsBase64();
      const outputName = `Watermarked_${Date.now()}.pdf`;
      const savedUri = await MediaStoreScanner.saveToDownloads(outputName, outputBase64, 'application/pdf');

      setStatus(`Saved to Downloads — ${outputName}`);
      setSelected(null);

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: savedUri,
        flags: 1,
        type: 'application/pdf',
      });
    } catch (err: any) {
      setStatus(`Watermark failed: ${err.message}`);
    }
    setProcessing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button title="< Back" onPress={() => router.back()} />
      <Text style={styles.title}>Watermark PDF</Text>
      <Text style={styles.subtitle}>Select a PDF and enter watermark text</Text>

      <TextInput
        style={styles.input}
        value={watermarkText}
        onChangeText={setWatermarkText}
        placeholder="Watermark text"
      />

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected && (
        <Button
          title={processing ? 'Applying...' : 'Apply Watermark'}
          onPress={applyWatermark}
          disabled={processing}
        />
      )}
      {processing && <ActivityIndicator size="large" style={{ marginTop: 10 }} />}

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
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    color: '#000',
  },
  status: { marginVertical: 8, fontWeight: 'bold', color: '#000' },
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  radioText: { fontSize: 18, marginRight: 10 },
  item: { fontSize: 14, color: '#000', flex: 1 },
});
