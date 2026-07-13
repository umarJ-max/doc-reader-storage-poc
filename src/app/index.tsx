import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, Text, FlatList, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'saved_folder_uri';

export default function Index() {
  const [files, setFiles] = useState<string[]>([]);
  const [status, setStatus] = useState('Loading...');
  const [savedUri, setSavedUri] = useState<string | null>(null);

  // On app start, check if we already have a saved folder URI
  useEffect(() => {
    (async () => {
      const uri = await AsyncStorage.getItem(STORAGE_KEY);
      if (uri) {
        setSavedUri(uri);
        readFolder(uri);
      } else {
        setStatus('No folder selected yet');
      }
    })();
  }, []);

  const readFolder = async (uri: string) => {
    try {
      setStatus('Reading folder...');
      const uris = await FileSystem.StorageAccessFramework.readDirectoryAsync(uri);
      const names = uris.map((u: string) => decodeURIComponent(u.split('/').pop() || u));
      setFiles(names);
      setStatus(`Found ${names.length} items`);
    } catch (err: any) {
      // Saved permission may have been revoked — clear it and ask again
      setStatus(`Access lost, please re-select folder (${err.message})`);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSavedUri(null);
    }
  };

  const pickFolder = async () => {
    try {
      setStatus('Requesting folder access...');
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        setStatus('Permission denied');
        return;
      }

      await AsyncStorage.setItem(STORAGE_KEY, permissions.directoryUri);
      setSavedUri(permissions.directoryUri);
      readFolder(permissions.directoryUri);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const changeFolder = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSavedUri(null);
    setFiles([]);
    setStatus('No folder selected yet');
  };

  return (
    <SafeAreaView style={styles.container}>
      {!savedUri ? (
        <Button title="Pick a Folder and List Files" onPress={pickFolder} />
      ) : (
        <Button title="Change Folder" onPress={changeFolder} />
      )}
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
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  status: { marginVertical: 10, fontWeight: 'bold', color: '#000000' },
  item: { paddingVertical: 4, fontSize: 13, color: '#000000' },
});