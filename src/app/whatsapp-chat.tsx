import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet, TextInput, Linking, Alert, View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '../components/screen-header';
import { Colors } from '../constants/app-theme';

export default function WhatsAppChatTool() {
  const [phone, setPhone] = useState('');

  const openChat = async () => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (!cleaned) {
      Alert.alert('Enter a number', 'Please enter a valid phone number including country code');
      return;
    }
    const url = `https://wa.me/${cleaned}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open WhatsApp', 'Make sure WhatsApp is installed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="WhatsApp Direct Chat" />
      <View style={styles.content}>
      <Text style={styles.subtitle}>Enter a number (with country code) to start a chat instantly</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 923001234567"
        placeholderTextColor={Colors.textMuted}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.primaryButton} onPress={openChat}>
        <Text style={styles.primaryButtonText}>Open Chat</Text>
      </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 10, color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});