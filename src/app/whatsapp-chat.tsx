import React, { useState } from 'react';
import { SafeAreaView, Button, Text, StyleSheet, TextInput, Linking, Alert, View } from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '../components/screen-header';

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
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Button title="Open Chat" onPress={openChat} />      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 16 },
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
