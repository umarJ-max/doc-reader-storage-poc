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
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: barcodeTypes as any }}
          onBarcodeScanned={handleScan}
        />
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
  text: { color: '#000', textAlign: 'center', marginVertical: 16 },
  resultBox: { flex: 1, backgroundColor: '#FFF', padding: 20, justifyContent: 'center' },
  resultLabel: { fontSize: 14, color: '#555', marginBottom: 8 },
  resultValue: { fontSize: 16, color: '#000', marginBottom: 20, fontWeight: '600' },
});
