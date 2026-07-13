import React, { useState } from 'react';
import { SafeAreaView, Button, Text, FlatList, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

export default function Index() {
  const [files, setFiles] = useState<string[]>([]);
  const [status, setStatus] = useState('Idle');

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const listFiles = async () => {
    setStatus('Requesting permission...');
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      setStatus('Permission denied');
      return;
    }

    try {
      setStatus('Reading files...');
      // Start with Download folder as a test — external storage root often needs MANAGE_EXTERNAL_STORAGE
      const path = RNFS.DownloadDirectoryPath;
      const result = await RNFS.readDir(path);
      const names = result.map((f) => `${f.isDirectory() ? '[DIR] ' : ''}${f.name}`);
      setFiles(names);
      setStatus(`Found ${names.length} items in Downloads`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button title="List Files in Downloads" onPress={listFiles} />
      <Text style={styles.status}>{status}</Text>
      <FlatList
        data={files}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text style={styles.item}>{item}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16 },
  status: { marginVertical: 10, fontWeight: 'bold' },
  item: { paddingVertical: 4, fontSize: 13 },
});
