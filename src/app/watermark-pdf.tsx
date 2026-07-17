import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  SafeAreaView,
  Button,
  Text,
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as base64js from 'base64-js';
import { router } from 'expo-router';
import ScreenHeader from '../components/screen-header';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';
import { Colors } from '../constants/app-theme';

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

  const toggleSelect = useCallback((uri: string) => {
    setSelected((prev) => (prev === uri ? null : uri));
  }, []);

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
      <ScreenHeader title="Watermark PDF" />
      <View style={styles.content}>
      <Text style={styles.subtitle}>Select a PDF and enter watermark text</Text>

      <TextInput
        style={styles.input}
        value={watermarkText}
        onChangeText={setWatermarkText}
        placeholder="Watermark text"
        placeholderTextColor={Colors.textMuted}
      />

      {loading && <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected && (
        <TouchableOpacity style={[styles.primaryButton, processing && styles.buttonDisabled]} onPress={applyWatermark} disabled={processing}>
          <Text style={styles.primaryButtonText}>{processing ? 'Applying...' : 'Apply Watermark'}</Text>
        </TouchableOpacity>
      )}
      {processing && <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 10 }} />}

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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: Colors.textPrimary,
  },
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