import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Reelette</Text>
      <ActivityIndicator size="large" color={Colors.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.accent,
    letterSpacing: 1,
  },
  spinner: {
    marginTop: 8,
  },
});
