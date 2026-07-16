import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet, Button, View, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

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
      <SafeAreaView style={styles.center}>
        <Button title="< Back" onPress={() => router.back()} />
        <Text style={styles.text}>Camera access is needed to scan {isBarcodeMode ? 'barcodes' : 'QR codes'}</Text>
        <Button title="Grant Camera Access" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="< Back" onPress={() => router.back()} />
        <Text style={styles.title}>{isBarcodeMode ? 'Scan Barcode' : 'Scan QR Code'}</Text>
      </View>

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
          <Button title="Copy" onPress={copyValue} />
          <View style={{ height: 10 }} />
          <Button title="Scan Again" onPress={scanAgain} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  header: { paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#FFF' },
  title: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: '#000' },
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
    borderColor: '#208AEF',
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
  text: { color: '#000', textAlign: 'center', marginVertical: 16 },
  resultBox: { flex: 1, backgroundColor: '#FFF', padding: 20, justifyContent: 'center' },
  resultLabel: { fontSize: 14, color: '#555', marginBottom: 8 },
  resultValue: { fontSize: 16, color: '#000', marginBottom: 20, fontWeight: '600' },
});