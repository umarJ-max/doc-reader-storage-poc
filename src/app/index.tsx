import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, Text, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';

const STORAGE_KEY = 'saved_folder_uri';

type FileEntry = { name: string; uri: string; isDirectory: boolean };

export default function Index() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [status, setStatus] = useState('Loading...');
  const [rootUri, setRootUri] = useState<string | null>(null);
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const uri = await AsyncStorage.getItem(STORAGE_KEY);
      if (uri) {
        setRootUri(uri);
        setCurrentUri(uri);
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

      const entries: FileEntry[] = uris.map((u: string) => {
        const name = decodeURIComponent(u.split('/').pop() || u);
        // Heuristic for icon only — real check happens on tap
        const looksLikeFile = /\.[a-zA-Z0-9]{1,5}$/.test(name);
        return { name, uri: u, isDirectory: !looksLikeFile };
      });

      entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setFiles(entries);
      setStatus(`Found ${entries.length} items`);
    } catch (err: any) {
      setStatus(`Access lost, please re-select folder (${err.message})`);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setRootUri(null);
      setCurrentUri(null);
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
      setRootUri(permissions.directoryUri);
      setCurrentUri(permissions.directoryUri);
      setHistory([]);
      readFolder(permissions.directoryUri);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const changeFolder = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setRootUri(null);
    setCurrentUri(null);
    setHistory([]);
    setFiles([]);
    setStatus('No folder selected yet');
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prevHistory = [...history];
    const prevUri = prevHistory.pop()!;
    setHistory(prevHistory);
    setCurrentUri(prevUri);
    readFolder(prevUri);
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
        flags: 1,
        type: mimeType,
      });
    } catch (err: any) {
      setStatus(`Could not open file: ${err.message}`);
    }
  };

  const handlePress = async (entry: FileEntry) => {
    // Try treating it as a folder first — this is the reliable way to tell with SAF
    try {
      const testRead = await FileSystem.StorageAccessFramework.readDirectoryAsync(entry.uri);
      // If we got here without throwing, it IS a folder
      setHistory((prev) => [...prev, currentUri!]);
      setCurrentUri(entry.uri);
      const sorted = [...testRead];
      const mapped: FileEntry[] = sorted.map((u: string) => {
        const name = decodeURIComponent(u.split('/').pop() || u);
        const looksLikeFile = /\.[a-zA-Z0-9]{1,5}$/.test(name);
        return { name, uri: u, isDirectory: !looksLikeFile };
      });
      mapped.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(mapped);
      setStatus(`Found ${mapped.length} items`);
    } catch {
      // Not a folder — open as a file instead
      openFile(entry);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {!rootUri ? (
        <Button title="Pick a Folder and List Files" onPress={pickFolder} />
      ) : (
        <View style={styles.topRow}>
          <Button title="Change Folder" onPress={changeFolder} />
          {history.length > 0 && <Button title="< Back" onPress={goBack} />}
        </View>
      )}
      <Text style={styles.status}>{status}</Text>
      <FlatList
        data={files}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handlePress(item)}>
            <Text style={styles.item}>
              {item.isDirectory ? '📁 ' : '📄 '}
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  status: { marginVertical: 10, fontWeight: 'bold', color: '#000000' },
  item: { paddingVertical: 6, fontSize: 14, color: '#000000' },
});