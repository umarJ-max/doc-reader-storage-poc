import React from 'react';
import { SafeAreaView, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/screen-header';
import { Colors } from '../constants/app-theme';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" />
      <View style={styles.content}>

        <View style={styles.appCard}>
          <View style={styles.appIconBadge}>
            <Ionicons name="document-text" size={30} color="#FFF" />
          </View>
          <Text style={styles.appName}>Doc Tools</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.rowLabel}>Developer</Text>
            <Text style={styles.rowValue}>Umar J</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="pricetag-outline" size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="logo-github" size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.rowLabel}>Source</Text>
            <Text style={styles.rowValue}>umarj-max</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>Made with care for document management on Android.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  appCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  appIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  appVersion: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
  },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  rowValue: { fontSize: 14, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 52 },
  footerNote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
