import React from 'react';
import { SafeAreaView, Text, StyleSheet, View } from 'react-native';
import ScreenHeader from '../components/screen-header';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" />
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Doc Tools</Text>
          <Text style={styles.aboutSubtext}>Version 1.0.0</Text>
          <Text style={styles.aboutSubtext}>Developed by Umar J</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 8, color: '#000' },
  aboutBox: { marginTop: 8 },
  aboutText: { fontSize: 16, fontWeight: '600', color: '#000' },
  aboutSubtext: { fontSize: 13, color: '#777', marginTop: 4 },
});
