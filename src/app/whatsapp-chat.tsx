import React, { useState } from 'react';
import { SafeAreaView, Button, Text, StyleSheet, TextInput, Linking, Alert } from 'react-native';
import { router } from 'expo-router';

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
      <Button title="< Back" onPress={() => router.back()} />
      <Text style={styles.title}>WhatsApp Direct Chat</Text>
      <Text style={styles.subtitle}>Enter a number (with country code) to start a chat instantly</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 923001234567"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Button title="Open Chat" onPress={openChat} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 10, color: '#000' },
  subtitle: { fontSize: 13, color: '#555', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    color: '#000',
    fontSize: 16,
  },
});
