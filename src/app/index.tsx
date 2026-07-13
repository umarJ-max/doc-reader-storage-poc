import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';

const STORAGE_KEY = 'saved_folder_uri';

type FileEntry = { name: string; uri: string };

export default function Index() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [status, setStatus] = useState('Loading...');
  const [savedUri, setSavedUri] = useState<string | null>(null);

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
      const entries: FileEntry[] = uris.map((u: string) => ({
        name: decodeURIComponent(u.split('/').pop() || u),
        uri: u,
      }));
      setFiles(entries);
      setStatus(`Found ${entries.length} items`);
    } catch (err: any) {
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

  const getMimeType = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'ppt': return 'application/vnd.ms-powerpoint';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'zip': return 'application/zip';
      case 'txt': return 'text/plain';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return '*/*';
    }
  };

  const openFile = async (file: FileEntry) => {
    try {
      const mimeType = getMimeType(file.name);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: file.uri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: mimeType,
      });
    } catch (err: any) {
      setStatus(`Could not open file: ${err.message}`);
    }
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
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openFile(item)}>
            <Text style={styles.item}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  status: { marginVertical: 10, fontWeight: 'bold', color: '#000000' },
  item: { paddingVertical: 4, fontSize: 13, color: '#000000' },
});