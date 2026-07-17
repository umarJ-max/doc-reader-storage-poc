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
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { PDFDocument } from 'pdf-lib';
import * as base64js from 'base64-js';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/screen-header';
import MediaStoreScanner from '../../modules/media-store-scanner/src/MediaStoreScannerModule';
import { Colors, getCategoryColor } from '../constants/app-theme';

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
      const junkPath = /\/(\.thumbnails|\.thumbnail|thumbnails|\.cache|cache|\.trashed|\.trash|android\/data|android\/obb)\//i;
      const imgs = files
        .filter((f) => /\.(jpg|jpeg|png)$/i.test(f.name))
        .filter((f) => !f.name.startsWith('.'))
        .filter((f) => !junkPath.test(f.path))
        .map((f) => ({ name: f.name, uri: f.uri, path: f.path }));
      setImages(imgs);
    } catch (err: any) {
      setStatus(`Failed to load images: ${err.message}`);
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
      <ScreenHeader title="Images to PDF" />
      <View style={styles.content}>
      <Text style={styles.subtitle}>Select JPG or PNG images — each becomes one page</Text>

      {loading && <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 20 }} />}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {selected.size >= 1 && (
        <TouchableOpacity style={[styles.primaryButton, converting && styles.buttonDisabled]} onPress={convertToPdf} disabled={converting}>
          <Text style={styles.primaryButtonText}>{converting ? 'Converting...' : `Convert ${selected.size} Image(s) to PDF`}</Text>
        </TouchableOpacity>
      )}
      {converting && <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 10 }} />}

      <FlatList
        data={images}
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
      <View style={[styles.fileTypeIcon, { backgroundColor: getCategoryColor('image') }]}>
        <Ionicons name="image" size={16} color="#FFF" />
      </View>
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
  fileTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  item: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary, flex: 1 },
});