import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getUser, getUserProfile, updateUserProfile, getUserStreaming,
  updateUserStreaming, saveServices, deleteUserAccount,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { PROVIDERS } from '../../constants/providers';
import type { UserProfile, CurrentUser } from '../../types';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editBio, setEditBio] = useState('');
  const [editName, setEditName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const load = useCallback(async () => {
    const u = await getUser();
    if (!u) { setLoading(false); return; }
    setUser(u);
    const [prof, svc] = await Promise.all([
      getUserProfile(u.user_id),
      getUserStreaming(u.user_id),
    ]);
    setProfile(prof);
    setServices(svc);
    setEditBio(prof.bio ?? '');
    setEditName(prof.displayName ?? u.username);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    await updateUserProfile(user.user_id, { displayName: editName, bio: editBio });
    setIsEditing(false);
    setSaving(false);
  }

  async function handleServiceToggle(key: string, value: boolean) {
    if (!user) return;
    const updated = { ...services, [key]: value };
    setServices(updated);
    await updateUserStreaming(user.user_id, updated);
    await saveServices(updated);
  }

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  async function handleDeleteAccount() {
    if (!user) return;
    Alert.alert(
      'Delete account?',
      'This permanently deletes all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            await deleteUserAccount(user.user_id);
            await signOut();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Not signed in.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
    >
      {/* Avatar + name */}
      <View style={styles.profileHeader}>
        {profile?.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{user.username.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.displayName}>{profile?.displayName ?? user.username}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {/* Edit profile */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={Colors.accent} />
              : <Text style={styles.editBtn}>{isEditing ? 'Save' : 'Edit'}</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Display name</Text>
        <TextInput
          style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
          value={editName}
          onChangeText={setEditName}
          editable={isEditing}
          placeholderTextColor={Colors.textFaint}
        />

        <Text style={styles.fieldLabel}>Bio</Text>
        <TextInput
          style={[styles.fieldInput, styles.bioInput, !isEditing && styles.fieldInputDisabled]}
          value={editBio}
          onChangeText={setEditBio}
          editable={isEditing}
          multiline
          placeholder="Tell people about your taste in movies…"
          placeholderTextColor={Colors.textFaint}
        />
      </View>

      {/* Streaming services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streaming Services</Text>
        <Text style={styles.sectionDesc}>Turn on the services you subscribe to so Roulette and Discover filter correctly.</Text>
        {PROVIDERS.map(p => (
          <View key={p.key} style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>{p.label}</Text>
            <Switch
              value={!!services[p.key]}
              onValueChange={v => handleServiceToggle(p.key, v)}
              thumbColor={services[p.key] ? Colors.accent : Colors.textFaint}
              trackColor={{ true: Colors.accent + '44', false: Colors.bgElevated }}
            />
          </View>
        ))}
      </View>

      {/* Account actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 20 },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },

  profileHeader: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: Colors.accent },
  displayName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  username: { fontSize: 14, color: Colors.textMuted, marginBottom: 4 },
  email: { fontSize: 13, color: Colors.textFaint },

  section: {
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionDesc: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  editBtn: { color: Colors.accent, fontSize: 15, fontWeight: '600' },

  fieldLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  fieldInput: {
    backgroundColor: Colors.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10, color: Colors.textPrimary, fontSize: 15,
  },
  fieldInputDisabled: { opacity: 0.7 },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },

  serviceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  serviceLabel: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },

  signOutBtn: {
    backgroundColor: Colors.bgElevated, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 10,
  },
  signOutText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
