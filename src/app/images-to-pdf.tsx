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

export default function ImagesToPdfTool() {
  const [images, setImages] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const files = await MediaStoreScanner.queryAllFiles();
      const imgs = files
        .filter((f) => /\.(jpg|jpeg|png)$/i.test(f.name))
        .map((f) => ({ name: f.name, uri: f.uri, path: f.path }));
      setImages(imgs);
    } catch (err: any) {
      setStatus(`Failed to load images: ${err.message}`);
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

  const convertToPdf = async () => {
    const filesToConvert = images.filter((f) => selected.has(f.uri));
    if (filesToConvert.length < 1) {
      setStatus('Select at least 1 image');
      return;
    }

    setConverting(true);
    setStatus(`Converting ${filesToConvert.length} image(s) to PDF...`);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of filesToConvert) {
        const base64 = await FileSystem.readAsStringAsync(`file://${file.path}`, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes = base64js.toByteArray(base64);

        const isPng = /\.png$/i.test(file.name);
        const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }

      const outputBase64 = await pdfDoc.saveAsBase64();
      const outputName = `Images_${Date.now()}.pdf`;
      const savedUri = await MediaStoreScanner.saveToDownloads(outputName, outputBase64, 'application/pdf');

      setStatus(`Saved to Downloads — ${outputName}`);
      setSelected(new Set());

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: savedUri,
        flags: 1,
        type: 'application/pdf',
      });
    } catch (err: any) {
      setStatus(`Conversion failed: ${err.message}`);
    }
    setConverting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button title="< Back" onPress={() => router.back()} />
      <Text style={styles.title}>Images to PDF</Text>
      <Text style={styles.subtitle}>Select JPG or PNG images — each becomes one page</Text>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected.size >= 1 && (
        <Button
          title={converting ? 'Converting...' : `Convert ${selected.size} Image(s) to PDF`}
          onPress={convertToPdf}
          disabled={converting}
        />
      )}
      {converting && <ActivityIndicator size="large" style={{ marginTop: 10 }} />}

      <FlatList
        data={images}
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
