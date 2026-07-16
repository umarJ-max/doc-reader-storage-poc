import React from 'react';
import { SafeAreaView, Button, Text, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Button title="< Back" onPress={() => router.back()} />
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.aboutBox}>
        <Text style={styles.aboutText}>Doc Tools</Text>
        <Text style={styles.aboutSubtext}>Version 1.0.0</Text>
        <Text style={styles.aboutSubtext}>Developed by Umar J</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 10, color: '#000' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 8, color: '#000' },
  aboutBox: { marginTop: 8 },
  aboutText: { fontSize: 16, fontWeight: '600', color: '#000' },
  aboutSubtext: { fontSize: 13, color: '#777', marginTop: 4 },
});