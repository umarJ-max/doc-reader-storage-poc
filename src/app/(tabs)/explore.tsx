import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/app-theme';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Explore — coming soon</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  text: { fontSize: 16, color: Colors.textSecondary },
});