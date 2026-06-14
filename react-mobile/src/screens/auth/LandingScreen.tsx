import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';

type Mode = 'landing' | 'login' | 'register';

export function LandingScreen() {
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('landing');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    if (mode === 'register' && !username.trim()) {
      Alert.alert('Missing fields', 'Username is required.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, username.trim());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'landing') {
    return (
      <LinearGradient
        colors={['#0A0A0A', '#160e30', '#0A0A0A']}
        style={[styles.landing, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.landingContent}>
          <Text style={styles.logoText}>Reelette</Text>
          <Text style={styles.tagline}>
            Spin for your next movie.{'\n'}Discover what to watch tonight.
          </Text>

          <View style={styles.featureList}>
            {['🎰 Roulette-style movie picker', '🎬 Discover across all your services', '👥 Share reviews with friends', '📋 Track everything you watched'].map(f => (
              <Text key={f} style={styles.featureItem}>{f}</Text>
            ))}
          </View>
        </View>

        <View style={styles.landingActions}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setMode('register')}>
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setMode('login')}>
            <Text style={styles.btnSecondaryText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.authContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.authScroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => setMode('landing')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.authTitle}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </Text>
        <Text style={styles.authSubtitle}>
          {mode === 'login' ? 'Sign in to continue' : 'Join Reelette today'}
        </Text>

        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={Colors.textFaint}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#0A0A0A" />
            : <Text style={styles.btnPrimaryText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchMode}
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Landing
  landing: { flex: 1, justifyContent: 'space-between' },
  landingContent: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  logoText: {
    fontSize: 48, fontWeight: '900', color: Colors.accent,
    letterSpacing: 1, marginBottom: 16,
  },
  tagline: {
    fontSize: 20, fontWeight: '600', color: Colors.textPrimary,
    lineHeight: 28, marginBottom: 40,
  },
  featureList: { gap: 12 },
  featureItem: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  landingActions: { paddingHorizontal: 24, gap: 12 },

  // Auth
  authContainer: { flex: 1, backgroundColor: Colors.bg },
  authScroll: { paddingHorizontal: 24 },
  backBtn: { marginBottom: 32 },
  backText: { color: Colors.textMuted, fontSize: 15 },
  authTitle: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  authSubtitle: { fontSize: 15, color: Colors.textMuted, marginBottom: 32 },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 12,
  },
  switchMode: { alignItems: 'center', marginTop: 20 },
  switchText: { color: Colors.textMuted, fontSize: 14 },

  // Buttons
  btnPrimary: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: { color: '#0A0A0A', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
});
