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
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/screen-header';
import { Colors } from '../constants/app-theme';

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
      <ScreenHeader title="Notes" rightLabel="+ New" onRightPress={openNew} />

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.noteRow} onPress={() => openEdit(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>{item.title || '(untitled)'}</Text>
              <Text style={styles.notePreview} numberOfLines={1}>{item.body}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteNote(item.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notes yet. Tap + New to add one.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.headerActionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveNote}>
              <Text style={[styles.headerActionText, styles.headerSaveText]}>Save</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter a title for your note"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.fieldLabel}>Note</Text>
          <TextInput
            style={styles.bodyInput}
            placeholder="Write your note here..."
            placeholderTextColor={Colors.textMuted}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerActionText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  headerSaveText: { color: Colors.accent },
  title: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  noteTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  notePreview: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  deleteButton: { paddingHorizontal: 10, paddingVertical: 6 },
  empty: { textAlign: 'center', marginTop: 40, color: Colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  bodyInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingTop: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
});