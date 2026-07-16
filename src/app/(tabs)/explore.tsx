import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Explore — coming soon</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  text: { fontSize: 16, color: '#555' },
});