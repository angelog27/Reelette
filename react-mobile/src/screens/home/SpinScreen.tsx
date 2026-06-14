import React, { lazy, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

const RouletteScreen = lazy(() =>
  import('../roulette/RouletteScreen').then(m => ({ default: m.RouletteScreen }))
);

function Fallback() {
  return (
    <View style={styles.fallback}>
      <ActivityIndicator color={Colors.accent} size="large" />
    </View>
  );
}

// Roulette is the home screen — no picker, go straight in.
// The onBack prop is satisfied with a no-op since there's nowhere to go back to.
export function SpinScreen() {
  return (
    <Suspense fallback={<Fallback />}>
      <RouletteScreen onBack={() => {}} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
});
