import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Edit2, Save, X, User, Mail, Film, Users, Eye, Lock,
  Bell, LogOut, Trash2, CheckCheck, Loader2, UserPlus, Heart,
  MessageCircle, Shield, ChevronRight, ChevronLeft, Palette, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserProfileModal } from './UserProfileModal';
import { PROVIDER_LOGOS } from '../constants/providers';
import { useTheme, THEMES } from './ThemeContext';
import {
  BASE_URL, getUser, clearUser, clearServices, saveServices,
  getFriends, getUserPublicProfile, saveSocialSettings,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  getNotifPrefs, saveNotifPrefs,
  updateUserAvatar, updateUserEmail, deleteUserAccount,
  updateUserStreaming, updateProfileBanner, searchMovies, getMovieBackdrops,
  updateUserProfile, bustPublicProfileCache,
  type AppNotification, type Friend, type NotifPrefs, type Movie,
} from '../services/api';

// ── Streaming services ────────────────────────────────────────────

const SERVICES: { key: string; label: string; color: string }[] = [
  { key: 'netflix',     label: 'Netflix',      color: '#E50914' },
  { key: 'hboMax',      label: 'Max',          color: '#5B4BDB' },
  { key: 'disneyPlus',  label: 'Disney+',      color: '#113CCF' },
  { key: 'amazonPrime', label: 'Prime Video',  color: '#00A8E1' },
  { key: 'appleTV',     label: 'Apple TV+',    color: '#555555' },
  { key: 'paramount',   label: 'Paramount+',   color: '#0064FF' },
  { key: 'peacock',     label: 'Peacock',      color: '#6B38FB' },
  { key: 'hulu',        label: 'Hulu',         color: '#3DBB3D' },
];

const KEY_TO_DISPLAY: Record<string, string> = {
  netflix:     'Netflix',
  hboMax:      'Max',
  disneyPlus:  'Disney+',
  amazonPrime: 'Prime Video',
  appleTV:     'Apple TV+',
  paramount:   'Paramount+',
  peacock:     'Peacock',
  hulu:        'Hulu',
};

// ── Notification helpers ──────────────────────────────────────────

function notifMessage(n: AppNotification): string {
  const actor = n.actor_username ? `@${n.actor_username}` : 'Someone';
  switch (n.type) {
    case 'friend_request': return `${actor} sent you a friend request`;
    case 'friend_accept':  return `${actor} accepted your friend request`;
    case 'post_like':      return n.data.movie_title ? `${actor} liked your post about ${n.data.movie_title}` : `${actor} liked your post`;
    case 'post_reply':     return n.data.movie_title ? `${actor} replied to your post about ${n.data.movie_title}` : `${actor} replied to your post`;
    case 'friend_watched': return n.data.movie_title ? `${actor} watched ${n.data.movie_title}${n.data.user_rating ? ` · ${n.data.user_rating}/10` : ''}` : `${actor} watched a movie`;
    case 'group_invite':   return n.data.group_name ? `${actor} added you to "${n.data.group_name}"` : `${actor} added you to a group`;
    case 'group_message':  return n.data.group_name ? `${actor} in ${n.data.group_name}: ${n.data.message_preview ?? '…'}` : `${actor} messaged your group`;
    default: return 'New notification';
  }
}

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  const cls = 'w-4 h-4';
  switch (type) {
    case 'friend_request':
    case 'friend_accept':  return <UserPlus className={`${cls} text-blue-400`} />;
    case 'post_like':      return <Heart className={`${cls} text-red-400`} />;
    case 'post_reply':     return <MessageCircle className={`${cls} text-green-400`} />;
    case 'friend_watched': return <Film className={cls} style={{ color: 'var(--reel-accent-hex)' }} />;
    case 'group_invite':   return <Users className={`${cls} text-yellow-400`} />;
    case 'group_message':  return <MessageCircle className={`${cls} text-yellow-400`} />;
    default:               return <Bell className={`${cls} text-zinc-400`} />;
  }
}

function timeAgoShort(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Card wrapper ──────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0e0e0e] border border-white/[0.07] rounded-2xl p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Section title ─────────────────────────────────────────────────

function SectionTitle({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="text-zinc-600">{icon}</span>
      <span className="text-zinc-200 text-sm font-semibold">{label}</span>
    </div>
  );
}

// ── Field input ───────────────────────────────────────────────────

function Field({
  label, name, value, type = 'text', disabled, onChange, hint,
}: {
  label: string; name: string; value: string; type?: string;
  disabled: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; hint?: string;
}) {
  return (
    <div>
      <label className="block text-zinc-400 text-xs font-medium mb-1.5">{label}</label>
      <input
        type={type} name={name} value={value} disabled={disabled} onChange={onChange}
        className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-white text-sm
          focus:outline-none transition-all
          disabled:text-zinc-500 disabled:cursor-default placeholder-zinc-700"
        style={{ '--tw-ring-color': 'var(--reel-accent-hex)' } as React.CSSProperties}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#222'; }}
      />
      {hint && <p className="text-zinc-600 text-xs mt-1">{hint}</p>}
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────

function DeleteModal({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const [typed, setTyped] = useState('');
  const confirmed = typed.toLowerCase() === 'delete';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-[#111] border border-red-900/50 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-950/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-950/50 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-white font-semibold text-lg">Delete account</h2>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          This permanently deletes your account, profile, and all data. This cannot be undone.
          Type <span className="text-red-400 font-mono font-semibold">delete</span> to confirm.
        </p>
        <input
          autoFocus
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="Type delete to confirm"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-white text-sm
            focus:border-red-600 focus:outline-none mb-4 placeholder-zinc-700"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!confirmed || loading}
            className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-semibold
              transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none shrink-0"
      style={{ background: checked ? 'var(--reel-accent-hex)' : '#3f3f46' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────

type Tab = 'profile' | 'streaming' | 'notifications' | 'appearance' | 'security';

export function ProfileandSettingsTab() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getUser();
  const userId = currentUser?.user_id ?? '';

  // ── Loading ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  // ── Active tab ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // ── Profile data ─────────────────────────────────────────────────
  const [profile, setProfile] = useState({ displayName: '', username: '', bio: '', email: '', avatarUrl: '' });
  const [draft, setDraft]     = useState({ displayName: '', username: '', bio: '', email: '', avatarUrl: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);

  // ── Profile banner ────────────────────────────────────────────────
  const BANNER_LS_KEY = `reel-banner-${userId}`;
  const [bannerUrl, setBannerUrl]               = useState<string | null>(() => localStorage.getItem(`reel-banner-${userId}`));
  const [bannerQuery, setBannerQuery]           = useState('');
  const [bannerResults, setBannerResults]       = useState<Movie[]>([]);
  const [bannerSearching, setBannerSearching]   = useState(false);
  const [bannerSaving, setBannerSaving]         = useState(false);
  const [selectedBannerMovie, setSelectedBannerMovie] = useState<Movie | null>(null);
  const [movieBackdrops, setMovieBackdrops]     = useState<string[]>([]);
  const [backdropsLoading, setBackdropsLoading] = useState(false);
  const bannerDebounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function runBannerSearch(q: string) {
    if (!q.trim()) { setBannerResults([]); setBannerSearching(false); return; }
    setBannerSearching(true);
    const results = await searchMovies(q);
    setBannerResults(results.filter(m => m.backdrop));
    setBannerSearching(false);
  }

  function handleBannerQueryChange(q: string) {
    setBannerQuery(q);
    setSelectedBannerMovie(null);
    setMovieBackdrops([]);
    if (bannerDebounceRef.current) clearTimeout(bannerDebounceRef.current);
    if (!q.trim()) { setBannerResults([]); return; }
    bannerDebounceRef.current = setTimeout(() => runBannerSearch(q), 2000);
  }

  function handleBannerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (bannerDebounceRef.current) clearTimeout(bannerDebounceRef.current);
      runBannerSearch(bannerQuery);
    }
  }

  async function handleSelectBannerMovie(movie: Movie) {
    setSelectedBannerMovie(movie);
    setBannerResults([]);
    setBannerQuery('');
    setBackdropsLoading(true);
    const backdrops = await getMovieBackdrops(movie.id, movie.type ?? 'movie');
    setMovieBackdrops(backdrops.length ? backdrops : (movie.backdrop ? [movie.backdrop] : []));
    setBackdropsLoading(false);
  }

  async function handleSetBanner(url: string) {
    setBannerSaving(true);
    const r = await updateProfileBanner(userId, url);
    if (r.success) {
      setBannerUrl(url);
      localStorage.setItem(BANNER_LS_KEY, url);
      setSelectedBannerMovie(null);
      setMovieBackdrops([]);
      toast.success('Banner updated');
    } else toast.error('Failed to save banner');
    setBannerSaving(false);
  }

  async function handleRemoveBanner() {
    setBannerSaving(true);
    const r = await updateProfileBanner(userId, null);
    if (r.success) {
      setBannerUrl(null);
      localStorage.removeItem(BANNER_LS_KEY);
      toast.success('Banner removed');
    } else toast.error('Failed to remove banner');
    setBannerSaving(false);
  }

  // ── Social ────────────────────────────────────────────────────────
  const [socialSettings, setSocialSettings] = useState({ showOnlineStatus: true, showMyStuffPublicly: false });
  const [friends, setFriends]               = useState<(Friend & { avatarUrl?: string; displayName?: string })[]>([]);
  const [friendsLoaded, setFriendsLoaded]   = useState(false);
  const [viewProfileId, setViewProfileId]   = useState<string | null>(null);

  // ── Streaming ─────────────────────────────────────────────────────
  const [services, setServices] = useState<Record<string, boolean>>({
    netflix: false, hboMax: false, disneyPlus: false, amazonPrime: false,
    appleTV: false, paramount: false, peacock: false, hulu: false,
  });
  const [servicesSaving, setServicesSaving] = useState(false);

  // ── Notifications ─────────────────────────────────────────────────
  const [notifs, setNotifs]               = useState<AppNotification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    inApp: { friendActivity: true, groupChat: true, newPost: false, newMovieAlerts: true },
    email: { friendActivity: false, groupChat: false, newPost: false, newMovieAlerts: true },
  });
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(false);

  async function toggleNotifPref(channel: 'inApp' | 'email', key: string) {
    const next: NotifPrefs = {
      ...notifPrefs,
      [channel]: { ...notifPrefs[channel], [key]: !notifPrefs[channel][key as keyof NotifPrefs['inApp']] },
    };
    setNotifPrefs(next);
    try {
      await saveNotifPrefs(userId, next);
    } catch {
      // revert on failure
      setNotifPrefs(notifPrefs);
      toast.error('Failed to save notification preferences');
    }
  }

  // ── Security ──────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [pwResetSent, setPwResetSent]         = useState(false);
  const [newEmail, setNewEmail]               = useState('');
  const [emailError, setEmailError]           = useState('');

  // ── Load profile ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoading(true); setLoadErr('');
    fetch(`${BASE_URL}/user/${userId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => {
        const p = {
          displayName: d.displayName || '', username: d.username || '',
          bio: d.bio || '', email: d.email || '',
          avatarUrl: d.avatarUrl || '',
        };
        setProfile(p); setDraft(p);
        setSocialSettings({ showOnlineStatus: d.socialSettings?.showOnlineStatus ?? true, showMyStuffPublicly: d.socialSettings?.showMyStuffPublicly ?? false });
        const loadedBanner = d.profileBannerUrl ?? null;
        setBannerUrl(loadedBanner);
        if (loadedBanner) localStorage.setItem(`reel-banner-${userId}`, loadedBanner);
        else localStorage.removeItem(`reel-banner-${userId}`);
        const s = d.streamingServices || {};
        const resolved = Object.fromEntries(SERVICES.map(sv => [sv.key, !!s[sv.key]]));
        setServices(resolved);
        setLoading(false);
      })
      .catch(() => { setLoadErr('Could not load profile. Is the backend running?'); setLoading(false); });
  }, [userId, retryKey]);

  // ── Load friends (lazy on Profile tab) ───────────────────────────
  useEffect(() => {
    if (activeTab !== 'profile' || friendsLoaded || !userId) return;
    getFriends(userId).then(async raw => {
      const profiles = await Promise.all(raw.map(f => getUserPublicProfile(f.friend_id)));
      setFriends(raw.map((f, i) => ({ ...f, avatarUrl: profiles[i]?.avatarUrl, displayName: profiles[i]?.displayName })));
      setFriendsLoaded(true);
    });
  }, [activeTab, friendsLoaded, userId]);

  // ── Load notifications + prefs (on Notifications tab) ─────────────
  useEffect(() => {
    if (activeTab !== 'notifications' || !userId) return;
    setNotifsLoading(true);
    setNotifPrefsLoading(true);
    getNotifications(userId).then(n => { setNotifs(n); setNotifsLoading(false); });
    getNotifPrefs(userId).then(p => { setNotifPrefs(p); setNotifPrefsLoading(false); });
  }, [activeTab, userId]);

  // ── Profile handlers ──────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setDraft(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const r = await updateUserProfile(userId, { displayName: draft.displayName, username: draft.username, bio: draft.bio });
      if (!r.success) throw new Error(r.message);
      setProfile(p => ({ ...p, ...draft }));
      setEditing(false);
      toast.success('Profile saved');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to save profile');
    } finally { setSaving(false); }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await updateUserAvatar(userId, dataUrl);
      setProfile(p => ({ ...p, avatarUrl: dataUrl }));
      setDraft(p => ({ ...p, avatarUrl: dataUrl }));
      toast.success('Avatar updated');
    };
    reader.readAsDataURL(file);
  }

  async function handleSocialToggle(key: 'showOnlineStatus' | 'showMyStuffPublicly', val: boolean) {
    const updated = { ...socialSettings, [key]: val };
    setSocialSettings(updated);
    await saveSocialSettings(userId, updated).catch(() => {});
  }

  // ── Streaming handlers ────────────────────────────────────────────
  async function handleToggleService(key: string) {
    const updated = { ...services, [key]: !services[key] };
    setServices(updated);
    saveServices(updated);
    window.dispatchEvent(new StorageEvent('storage'));
    setServicesSaving(true);
    try {
      await updateUserStreaming(userId, updated);
      toast.success('Streaming services saved');
    } catch { toast.error('Failed to save services'); }
    finally { setServicesSaving(false); }
  }

  // ── Notification handlers ─────────────────────────────────────────
  async function handleMarkRead(notif: AppNotification) {
    if (notif.read) return;
    await markNotificationRead(userId, notif.notification_id);
    setNotifs(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, read: true } : n));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(userId);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  }

  // ── Security handlers ─────────────────────────────────────────────
  async function handlePasswordReset() {
    try {
      await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      });
      setPwResetSent(true);
      toast.success('Password reset email sent');
    } catch { toast.error('Failed to send reset email'); }
  }

  async function handleEmailUpdate() {
    setEmailError('');
    if (!newEmail.trim() || !newEmail.includes('@')) { setEmailError('Enter a valid email address'); return; }
    setEmailSaving(true);
    const r = await updateUserEmail(userId, newEmail.trim());
    setEmailSaving(false);
    if (r.success) {
      setProfile(p => ({ ...p, email: newEmail.trim() }));
      setNewEmail('');
      toast.success('Email updated');
    } else {
      setEmailError(r.message || 'Failed to update email');
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    const r = await deleteUserAccount(userId);
    setDeleteLoading(false);
    if (r.success) {
      clearUser(); clearServices();
      localStorage.removeItem('user_id');
      navigate('/login');
    } else {
      toast.error(r.message || 'Failed to delete account');
      setShowDeleteModal(false);
    }
  }

  function handleLogout() {
    clearUser(); clearServices();
    localStorage.removeItem('user_id');
    navigate('/login');
  }

  // ── Render guards ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--reel-accent-hex)' }} />
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400 text-sm">{loadErr}</p>
        <button
          onClick={() => { setLoading(true); setRetryKey(k => k + 1); }}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: 'var(--reel-accent-hex)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { themeId, setThemeId, theme } = useTheme();
  const unreadCount = notifs.filter(n => !n.read).length;

  const TABS: { id: Tab; label: string; short: string; badge?: number }[] = [
    { id: 'profile',       label: 'Profile',       short: 'Profile' },
    { id: 'streaming',     label: 'Streaming',     short: 'Streams' },
    { id: 'notifications', label: 'Notifications', short: 'Notifs', badge: unreadCount },
    { id: 'appearance',    label: 'Appearance',    short: 'Theme' },
    { id: 'security',      label: 'Security',      short: 'Security' },
  ];

  return (
    <div className="min-h-screen bg-[#080808] relative">

      {viewProfileId && <UserProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />}
      {showDeleteModal && <DeleteModal onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteModal(false)} loading={deleteLoading} />}

      {/* ── Full-width banner ─────────────────────────────────────────── */}
      <div className="relative z-10 h-56 sm:h-72 lg:h-80 w-full overflow-hidden">
        {bannerUrl ? (
          <>
            <img
              src={bannerUrl}
              alt="Profile banner"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#090909]/90" />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0"
              style={{ background: `linear-gradient(145deg, ${theme.accent}22 0%, transparent 55%), linear-gradient(to bottom, transparent 50%, #090909 100%)` }} />
            <div className="pointer-events-none absolute -top-32 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.12] blur-3xl"
              style={{ background: theme.accent }} />
          </>
        )}
      </div>

      {/* ── Content (constrained) ──────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16">

        {/* ── Avatar + profile info — overlaps banner ──────────────── */}
        <div className="-mt-14 sm:-mt-16 mb-5 flex items-end justify-between gap-3">
          <div className="flex items-end gap-4 min-w-0 flex-1">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#1a1a1a] overflow-hidden"
                style={{ boxShadow: `0 0 0 4px #090909, 0 8px 40px ${theme.accent}40` }}>
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-zinc-700"><User size={40} /></div>
                }
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-95"
                style={{ background: 'var(--reel-accent-hex)', color: 'var(--reel-accent-text, #080808)' }}
                title="Change photo"
              >
                <Camera size={13} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name + username + bio */}
            <div className="flex-1 min-w-0 pb-1" style={{ textShadow: bannerUrl ? '0 1px 6px rgba(0,0,0,0.9)' : undefined }}>
              {editing ? (
                <input
                  name="displayName" value={draft.displayName} onChange={handleChange}
                  className="bg-transparent text-white text-2xl font-bold w-full focus:outline-none border-b pb-0.5 transition-colors"
                  style={{ borderBottomColor: 'var(--reel-accent-hex)' }}
                />
              ) : (
                <h1 className="text-white text-2xl font-bold truncate">{profile.displayName || profile.username}</h1>
              )}
              <p className="text-zinc-400 text-sm mt-0.5">@{profile.username}</p>
              {!editing && profile.bio && <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{profile.bio}</p>}
            </div>
          </div>

          {/* Edit / Save buttons */}
          <div className="flex items-center gap-2 shrink-0 pb-1">
            {editing ? (
              <>
                <button
                  onClick={() => { setDraft(profile); setEditing(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs transition-all"
                >
                  <X size={13} /> Cancel
                </button>
                <button
                  onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'var(--reel-accent-hex)', color: 'var(--reel-accent-text, #080808)' }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs transition-all border border-zinc-700/60 backdrop-blur-sm"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-[#0a0a0a] rounded-xl p-1 mb-6 border border-[#1e1e1e]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 px-1 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150
                ${activeTab === tab.id
                  ? 'bg-[#1e1e1e] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {(tab.badge ?? 0) > 0 && (
                <span
                  className="w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: 'var(--reel-accent-hex)' }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROFILE TAB                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            {/* Basic info */}
            <Card>
              <SectionTitle label="Basic information" icon={<User size={16} />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Display name" name="displayName" value={editing ? draft.displayName : profile.displayName}
                  disabled={!editing} onChange={handleChange} />
                <Field label="Username" name="username" value={editing ? draft.username : profile.username}
                  disabled={!editing} onChange={handleChange} />
              </div>
              <div className="mt-4">
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Bio</label>
                <textarea
                  name="bio" value={editing ? draft.bio : profile.bio} disabled={!editing}
                  onChange={e => setDraft(p => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-white text-sm
                    focus:outline-none transition-all disabled:text-zinc-500 disabled:cursor-default resize-none placeholder-zinc-700"
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#222'; }}
                />
              </div>
              <div className="mt-4">
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Email</label>
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0a0a] border border-[#222] rounded-xl">
                  <Mail size={15} className="text-zinc-600 shrink-0" />
                  <span className="text-zinc-400 text-sm flex-1">{profile.email || '—'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border text-zinc-500 border-zinc-700">verified</span>
                </div>
              </div>
            </Card>

            {/* Profile banner */}
            <Card>
              <SectionTitle label="Profile Banner" icon={<Film size={16} />} />

              {/* Current banner preview */}
              <div className="relative w-full h-28 rounded-xl overflow-hidden mb-4 bg-[#0a0a0a] border border-[#222]">
                {bannerUrl ? (
                  <>
                    <img src={bannerUrl} alt="Profile banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <button
                      onClick={handleRemoveBanner}
                      disabled={bannerSaving}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Film size={22} className="text-zinc-700" />
                    <span className="text-zinc-600 text-xs">No banner set — search a movie below</span>
                  </div>
                )}
              </div>

              {/* Search input — always visible unless viewing backdrop gallery */}
              {!selectedBannerMovie && (
                <div className="relative">
                  <input
                    type="text"
                    value={bannerQuery}
                    onChange={e => handleBannerQueryChange(e.target.value)}
                    onKeyDown={handleBannerKeyDown}
                    placeholder="Search a movie or show…"
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-white text-sm
                      focus:outline-none transition-all placeholder-zinc-700"
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#222'; }}
                  />
                  {bannerSearching && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" />
                  )}
                </div>
              )}

              {/* Movie list — clean rows, click to load all backdrops */}
              {!selectedBannerMovie && bannerResults.length > 0 && (
                <div className="mt-2 rounded-xl border border-[#222] overflow-hidden">
                  {bannerResults.slice(0, 8).map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectBannerMovie(m)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left ${i > 0 ? 'border-t border-[#1a1a1a]' : ''}`}
                    >
                      {m.poster
                        ? <img src={m.poster} alt={m.title} className="w-9 h-[54px] object-cover rounded-md shrink-0" />
                        : <div className="w-9 h-[54px] bg-[#1a1a1a] rounded-md shrink-0 flex items-center justify-center"><Film size={14} className="text-zinc-600" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{m.title}</p>
                        <p className="text-zinc-500 text-xs">{m.year}{m.type === 'show' ? ' · Series' : ''}</p>
                      </div>
                      <ChevronRight size={16} className="text-zinc-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {!selectedBannerMovie && bannerResults.length === 0 && bannerQuery.trim() && !bannerSearching && (
                <p className="text-zinc-600 text-xs mt-3">No results found.</p>
              )}

              {/* Backdrop gallery for the selected movie */}
              {selectedBannerMovie && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => { setSelectedBannerMovie(null); setMovieBackdrops([]); }}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors shrink-0"
                    >
                      <ChevronLeft size={14} /> Back
                    </button>
                    <span className="text-zinc-300 text-sm font-medium truncate">{selectedBannerMovie.title}</span>
                    <span className="text-zinc-600 text-xs ml-auto shrink-0">
                      {backdropsLoading ? '…' : `${movieBackdrops.length} backdrop${movieBackdrops.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {backdropsLoading ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-zinc-600 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Loading…
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                      {movieBackdrops.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => handleSetBanner(url)}
                          disabled={bannerSaving}
                          className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-[var(--reel-accent-hex)] transition-all group disabled:opacity-50"
                        >
                          <img src={url} alt={`Backdrop ${i + 1}`} className="w-full aspect-video object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            {bannerSaving ? <Loader2 size={16} className="animate-spin text-white" /> : <Check size={18} className="text-white" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Social settings */}
            <Card>
              <SectionTitle label="Social" icon={<Users size={16} />} />
              <div className="space-y-3 mb-5">
                {[
                  { key: 'showOnlineStatus' as const,    label: 'Show online status',      icon: <Eye size={15} className="text-zinc-500" /> },
                  { key: 'showMyStuffPublicly' as const, label: 'Show My Stuff publicly',  icon: <Lock size={15} className="text-zinc-500" /> },
                ].map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border border-[#222] rounded-xl">
                    <div className="flex items-center gap-3">{icon}<span className="text-zinc-300 text-sm">{label}</span></div>
                    <Toggle checked={socialSettings[key]} onChange={v => handleSocialToggle(key, v)} />
                  </div>
                ))}
              </div>

              {/* Friends */}
              <div className="border-t border-[#1e1e1e] pt-5">
                <p className="text-zinc-400 text-sm font-medium mb-3">
                  Friends {friendsLoaded && `(${friends.length})`}
                </p>
                {!friendsLoaded ? (
                  <div className="flex items-center gap-2 text-zinc-600 text-sm">
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--reel-accent-hex)' }} />
                    Loading…
                  </div>
                ) : friends.length === 0 ? (
                  <p className="text-zinc-600 text-sm">No friends yet — head to Social to connect.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {friends.slice(0, 12).map(f => (
                      <button key={f.friend_id} title={f.displayName || f.friend_username}
                        onClick={() => setViewProfileId(f.friend_id)}
                        className="group flex flex-col items-center gap-1">
                        <div
                          className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#2a2a2a] transition-all"
                          style={{ '--hover-border': 'var(--reel-accent-hex)' } as React.CSSProperties}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--reel-accent-hex)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a2a'; }}
                        >
                          {f.avatarUrl
                            ? <img src={f.avatarUrl} alt={f.friend_username} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center text-zinc-500 text-xs font-bold">
                                {(f.displayName || f.friend_username).slice(0, 2).toUpperCase()}
                              </div>
                          }
                        </div>
                        <span className="text-zinc-600 text-[10px] group-hover:text-zinc-300 transition-colors max-w-[44px] truncate">
                          {f.friend_username}
                        </span>
                      </button>
                    ))}
                    {friends.length > 12 && (
                      <div className="w-11 h-11 rounded-full bg-[#1a1a1a] border-2 border-dashed border-[#2a2a2a] flex items-center justify-center text-zinc-500 text-xs">
                        +{friends.length - 12}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STREAMING TAB                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'streaming' && (
          <Card>
            <SectionTitle label="Streaming services" icon={<Film size={16} />} />
            <p className="text-zinc-500 text-sm mb-6">
              Select the services you subscribe to. Your Discover page will filter content to these providers.
            </p>
            <div className="grid grid-cols-4 gap-2 sm:gap-5">
              {SERVICES.map(svc => {
                const active  = !!services[svc.key];
                const logoKey = KEY_TO_DISPLAY[svc.key];
                const logo    = PROVIDER_LOGOS[logoKey];
                return (
                  <button
                    key={svc.key}
                    onClick={() => handleToggleService(svc.key)}
                    className="flex flex-col items-center gap-2.5 transition-all duration-200"
                    style={{ opacity: active ? 1 : 0.4 }}
                  >
                    <div className="relative w-full">
                      <img
                        src={logo}
                        alt={svc.label}
                        className="w-full aspect-square rounded-2xl object-cover transition-all duration-250"
                        style={{
                          boxShadow: active ? `0 0 28px ${svc.color}70, 0 0 8px ${svc.color}40` : 'none',
                          transform: active ? 'scale(1.04)' : 'scale(1)',
                        }}
                      />
                      {active && (
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20" />
                      )}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: active ? '#fff' : '#6b7280' }}>
                      {svc.label}
                    </span>
                    <div style={{
                      height: 2,
                      width: active ? '60%' : 0,
                      background: svc.color,
                      borderRadius: 1,
                      transition: 'width 0.25s',
                    }} />
                  </button>
                );
              })}
            </div>
            <p className="text-zinc-600 text-xs mt-6 text-center">
              {servicesSaving ? 'Saving…' : 'Changes save automatically and update your Discover page instantly.'}
            </p>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* NOTIFICATIONS TAB                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'notifications' && (
          <div className="space-y-5">
          {/* Notification preferences */}
          <Card>
            <SectionTitle label="Notification Preferences" icon={<Bell size={16} />} />
            {notifPrefsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--reel-accent-hex)' }} />
              </div>
            ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* In-App column */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-3">In-App</p>
                <div className="space-y-3">
                  {[
                    { key: 'friendActivity', label: 'Friend Activity' },
                    { key: 'groupChat',      label: 'Group Chat' },
                    { key: 'newPost',        label: 'Community Posts' },
                    { key: 'newMovieAlerts', label: 'New Movie Alerts' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">{label}</span>
                      <Toggle
                        checked={notifPrefs.inApp[key as keyof typeof notifPrefs.inApp]}
                        onChange={() => toggleNotifPref('inApp', key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {/* Email column */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-3">Email</p>
                <div className="space-y-3">
                  {[
                    { key: 'friendActivity', label: 'Friend Activity' },
                    { key: 'groupChat',      label: 'Group Chat' },
                    { key: 'newPost',        label: 'Community Posts' },
                    { key: 'newMovieAlerts', label: 'New Movie Alerts' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">{label}</span>
                      <Toggle
                        checked={notifPrefs.email[key as keyof typeof notifPrefs.email]}
                        onChange={() => toggleNotifPref('email', key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}
          </Card>

          {/* Notification feed */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <SectionTitle label="Recent Notifications" icon={<Bell size={16} />} />
              {notifs.some(n => !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors -mt-5"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>

            {notifsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--reel-accent-hex)' }} />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-zinc-600">
                <Bell size={32} className="opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifs.map(n => (
                  <button
                    key={n.notification_id}
                    onClick={() => handleMarkRead(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all
                      ${n.read ? 'hover:bg-[#141414]' : 'bg-[#141414] hover:bg-[#1a1a1a]'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <NotifIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.read ? 'text-zinc-500' : 'text-zinc-200'}`}>
                        {notifMessage(n)}
                      </p>
                      <p className="text-zinc-600 text-xs mt-0.5">{timeAgoShort(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--reel-accent-hex)' }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* APPEARANCE TAB                                              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'appearance' && (
          <div className="space-y-5">
            <Card>
              <SectionTitle label="App theme" icon={<Palette size={16} />} />
              <p className="text-zinc-500 text-sm mb-6">
                Choose a visual theme. The accent color, background tint, and ambient effects change site‑wide instantly.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {THEMES.map(t => {
                  const active = themeId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setThemeId(t.id);
                        bustPublicProfileCache(userId);
                        updateUserProfile(userId, { themeId: t.id });
                      }}
                      className={`relative rounded-2xl overflow-hidden text-left transition-all duration-200 focus:outline-none ${
                        active ? 'ring-2 scale-[1.02]' : 'ring-1 ring-white/[0.08] hover:ring-white/20 hover:scale-[1.01]'
                      }`}
                      style={{ ringColor: active ? t.accent : undefined } as React.CSSProperties}
                    >
                      {/* Preview gradient */}
                      <div className="h-20 w-full relative" style={{ background: t.cardGradient }}>
                        {/* Accent dot */}
                        <div className="absolute top-3 left-3 w-5 h-5 rounded-full shadow-lg"
                          style={{ background: t.accent, boxShadow: `0 0 10px ${t.accent}80` }} />
                        {/* Active checkmark */}
                        {active && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: t.accent }}>
                            <Check size={11} className="text-black font-bold" />
                          </div>
                        )}
                        {/* Effect label */}
                        {t.effect && (
                          <div className="absolute bottom-2 right-2 text-[9px] font-medium opacity-50"
                            style={{ color: t.accent }}>
                            {t.effect}
                          </div>
                        )}
                      </div>
                      {/* Name + font sample */}
                      <div className="px-3 py-2.5 bg-[#0d0d0d]">
                        <p className="text-white text-xs font-semibold leading-none"
                          style={{ fontFamily: t.fontFamily }}>{t.name}</p>
                        <p className="text-zinc-600 text-[10px] mt-0.5 truncate"
                          style={{ fontFamily: t.fontFamily }}>{t.tagline}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Live preview strip */}
            <Card>
              <SectionTitle label="Current accent" icon={<Palette size={16} />} />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl shadow-lg shrink-0"
                  style={{ background: theme.accent, boxShadow: `0 0 24px ${theme.accent}60` }} />
                <div>
                  <p className="text-white text-sm font-semibold" style={{ fontFamily: theme.fontFamily }}>{theme.name}</p>
                  <p className="text-zinc-500 text-xs mt-0.5" style={{ fontFamily: theme.fontFamily }}>{theme.tagline}</p>
                  <p className="text-zinc-600 text-[11px] mt-1 font-mono">{theme.accent}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                {(['bg', 'button', 'ring'] as const).map(role => (
                  <div key={role} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0a0a0a] border border-[#1e1e1e]">
                    <div className="w-4 h-4 rounded-md shrink-0"
                      style={{
                        background:  role === 'bg'     ? `${theme.accent}22` : 'transparent',
                        border:      role === 'ring'   ? `2px solid ${theme.accent}` : role === 'button' ? 'none' : `1px solid ${theme.accent}44`,
                        boxShadow:   role === 'button' ? `inset 0 0 0 100px ${theme.accent}` : undefined,
                      }} />
                    <span className="text-zinc-500 text-[11px] capitalize">{role}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECURITY TAB                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            {/* Email update */}
            <Card>
              <SectionTitle label="Email address" icon={<Mail size={16} />} />
              <p className="text-zinc-500 text-sm mb-4">
                Current: <span className="text-zinc-300">{profile.email}</span>
              </p>
              <div className="flex gap-3">
                <input
                  value={newEmail}
                  onChange={e => { setNewEmail(e.target.value); setEmailError(''); }}
                  type="email"
                  placeholder="New email address"
                  className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 text-white text-sm
                    focus:outline-none transition-all placeholder-zinc-700"
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#222'; }}
                />
                <button
                  onClick={handleEmailUpdate}
                  disabled={emailSaving || !newEmail.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ background: 'var(--reel-accent-hex)', color: 'var(--reel-accent-text, #080808)' }}
                >
                  {emailSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Update
                </button>
              </div>
              {emailError && <p className="text-red-400 text-xs mt-2">{emailError}</p>}
            </Card>

            {/* Password */}
            <Card>
              <SectionTitle label="Password" icon={<Lock size={16} />} />
              <p className="text-zinc-500 text-sm mb-4">
                We'll send a reset link to <span className="text-zinc-300">{profile.email}</span>.
              </p>
              {pwResetSent ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCheck size={16} /> Reset email sent — check your inbox.
                </div>
              ) : (
                <button
                  onClick={handlePasswordReset}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#2a2a2a]
                    hover:border-zinc-600 text-zinc-300 hover:text-white rounded-xl text-sm transition-all"
                >
                  <Shield size={15} /> Send password reset email
                  <ChevronRight size={14} className="ml-auto text-zinc-600" />
                </button>
              )}
            </Card>

            {/* Session */}
            <Card>
              <SectionTitle label="Session" icon={<LogOut size={16} />} />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#0a0a0a] border border-[#222]
                  hover:border-zinc-700 rounded-xl text-zinc-300 hover:text-white text-sm transition-all group"
              >
                <LogOut size={15} className="text-zinc-500 group-hover:text-zinc-300" />
                Log out
                <ChevronRight size={14} className="ml-auto text-zinc-600" />
              </button>
            </Card>

            {/* Danger zone */}
            <Card className="border-red-950/40">
              <SectionTitle label="Danger zone" icon={<Trash2 size={16} />} />
              <p className="text-zinc-500 text-sm mb-4">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-950/30 hover:bg-red-950/50 border border-red-900/40
                  hover:border-red-700/60 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition-all"
              >
                <Trash2 size={15} /> Delete my account
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
