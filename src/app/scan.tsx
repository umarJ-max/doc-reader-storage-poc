import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import ScreenHeader from '../components/screen-header';
import { Colors } from '../constants/app-theme';

export default function ScannerTool() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const isBarcodeMode = mode === 'barcode';
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const barcodeTypes = isBarcodeMode
    ? ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e']
    : ['qr'];

  const handleScan = (result: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    setScannedValue(result.data);
  };

  const copyValue = async () => {
    if (scannedValue) {
      await Clipboard.setStringAsync(scannedValue);
      Alert.alert('Copied', 'Value copied to clipboard');
    }
  };

  const scanAgain = () => {
    setScannedValue(null);
    setScanning(true);
  };

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <ScreenHeader title={isBarcodeMode ? 'Scan Barcode' : 'Scan QR Code'} />
        <View style={styles.center}>
          <Text style={styles.text}>Camera access is needed to scan {isBarcodeMode ? 'barcodes' : 'QR codes'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={isBarcodeMode ? 'Scan Barcode' : 'Scan QR Code'} />

      {scanning ? (
        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: barcodeTypes as any }}
            onBarcodeScanned={handleScan}
          />
          <View style={styles.overlayContainer} pointerEvents="none">
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.hintText}>
              Point camera at a {isBarcodeMode ? 'barcode' : 'QR code'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Scanned Value:</Text>
          <Text selectable style={styles.resultValue}>{scannedValue}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={copyValue}>
            <Text style={styles.primaryButtonText}>Copy</Text>
          </TouchableOpacity>
          <View style={{ height: 10 }} />
          <TouchableOpacity style={styles.secondaryButton} onPress={scanAgain}>
            <Text style={styles.secondaryButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingHorizontal: 16, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: Colors.textPrimary },
  camera: { flex: 1 },
  cameraWrapper: { flex: 1 },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 12 },
  hintText: {
    color: '#FFF',
    marginTop: 24,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  text: { color: Colors.textSecondary, textAlign: 'center', marginVertical: 16 },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
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
  resultBox: { flex: 1, backgroundColor: Colors.background, padding: 20, justifyContent: 'center' },
  resultLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  resultValue: { fontSize: 16, color: Colors.textPrimary, marginBottom: 20, fontWeight: '600' },
});