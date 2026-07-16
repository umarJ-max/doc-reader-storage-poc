import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Button,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  View,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

type Note = { id: string; title: string; body: string; updatedAt: number };

const NOTES_KEY = 'app_notes_v1';

export default function NotesTool() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTES_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {
      // start empty if load fails
    }
  };

  const saveNotes = async (updated: Note[]) => {
    setNotes(updated);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
  };

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setBody('');
    setModalVisible(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setTitle(note.title);
    setBody(note.body);
    setModalVisible(true);
  };

  const saveNote = async () => {
    if (!title.trim() && !body.trim()) {
      setModalVisible(false);
      return;
    }
    if (editing) {
      const updated = notes.map((n) =>
        n.id === editing.id ? { ...n, title, body, updatedAt: Date.now() } : n
      );
      await saveNotes(updated);
    } else {
      const newNote: Note = { id: Date.now().toString(), title, body, updatedAt: Date.now() };
      await saveNotes([newNote, ...notes]);
    }
    setModalVisible(false);
  };

  const deleteNote = async (id: string) => {
    await saveNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="< Back" onPress={() => router.back()} />
        <Text style={styles.title}>Notes</Text>
        <Button title="+ New" onPress={openNew} />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.noteRow} onPress={() => openEdit(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>{item.title || '(untitled)'}</Text>
              <Text style={styles.notePreview} numberOfLines={1}>{item.body}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteNote(item.id)}>
              <Text style={styles.deleteText}>🗑</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notes yet. Tap + New to add one.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Button title="Cancel" onPress={() => setModalVisible(false)} />
            <Button title="Save" onPress={saveNote} />
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter a title for your note"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.fieldLabel}>Note</Text>
          <TextInput
            style={styles.bodyInput}
            placeholder="Write your note here..."
            placeholderTextColor="#999"
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  noteTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  notePreview: { fontSize: 13, color: '#777', marginTop: 2 },
  deleteText: { fontSize: 18, paddingHorizontal: 10 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    color: '#000',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
  },
  bodyInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingTop: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
  },
});