import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/app-theme';

type Props = {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
};

export default function ScreenHeader({ title, onBack, rightLabel, onRightPress }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconButton} onPress={onBack || (() => router.back())}>
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {rightLabel ? (
        <TouchableOpacity style={styles.rightButton} onPress={onRightPress}>
          <Text style={styles.rightButtonText}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  rightButton: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rightButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },
});