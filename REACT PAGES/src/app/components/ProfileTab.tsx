import { useState, useEffect, useRef } from 'react';
import peacockLogo from '../../assets/Peacock.png';
import {
  Edit2, Edit3, User, Mail, Film, Palette,
  Users, Shield, Share2, Eye, EyeOff, Lock, Settings,
  Globe, Languages, Apple, Loader2, Check, Upload,
} from 'lucide-react';
import {
  getUser, saveUser, getUserProfile, updateUserProfile, updateUserAvatar,
  getUserStreaming, updateUserStreaming,
  getWatchedMovies, getWatchLater, getFriends,
  type UserProfile,
} from '../services/api';

// ─── Resize image to max 256×256 JPEG via canvas ─────────────
async function resizeImageToDataUrl(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx; }
        } else {
          if (height > maxPx) { width = Math.round(width * maxPx / height); height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = evt.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Streaming platform config ────────────────────────────────
const PLATFORMS = [
  { key: 'netflix',     name: 'Netflix',      logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',    color: 'red' },
  { key: 'appleTV',     name: 'Apple TV+',    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',      color: 'dimgray' },
  { key: 'hboMax',      name: 'HBO Max',      logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',           color: '#5B31B9' },
  { key: 'disneyPlus',  name: 'Disney+',      logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',        color: '#00A2FF' },
  { key: 'hulu',        name: 'Hulu',         logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/hulu.svg',          color: '#1CE783' },
  { key: 'amazonPrime', name: 'Amazon Prime', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png',           color: '#00A8E1' },
  { key: 'paramount',   name: 'Paramount+',   logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/paramountplus.svg', color: 'blue' },
  { key: 'peacock',     name: 'Peacock',      logo: peacockLogo,                                                                     color: 'multicolor' },
];

const GENRES = ['Action','Drama','Sci-Fi','Horror','Comedy','Thriller','Romance','Documentary','Animation','Fantasy'];

// ─── Section wrapper ──────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-800/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full" />
          <h2 className="text-white uppercase tracking-wider">{title}</h2>
        </div>
        <span className="text-zinc-600">{icon}</span>
      </div>
      {children}
    </div>
  );
}

// ─── SaveButton ───────────────────────────────────────────────
function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all border border-red-600 flex items-center gap-2 shadow-lg shadow-red-600/20 hover:shadow-red-600/40 disabled:opacity-60"
    >
      {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Edit3 size={16} />}
      {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
    </button>
  );
}

// ─── Main ProfileTab ──────────────────────────────────────────
export function ProfileTab() {
  const sessionUser = getUser();
  const userId = sessionUser?.user_id ?? '';

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Editable form fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);
  const [infoError, setInfoError] = useState('');

  // Streaming services
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [savingServices, setSavingServices] = useState(false);
  const [savedServices, setSavedServices] = useState(false);

  // Stats
  const [watchedCount, setWatchedCount] = useState<number | null>(null);
  const [watchlistCount, setWatchlistCount] = useState<number | null>(null);
  const [friendsCount, setFriendsCount] = useState<number | null>(null);

  // Copy profile link
  const [copied, setCopied] = useState(false);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | undefined>(undefined);

  // Load everything on mount
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getUserProfile(userId),
      getUserStreaming(userId),
      getWatchedMovies(userId),
      getWatchLater(userId),
      getFriends(userId),
    ]).then(([prof, svc, watched, watchlist, friends]) => {
      if (prof) {
        setProfile(prof);
        setDisplayName(prof.displayName || '');
        setUsername(prof.username || '');
        setBio(prof.bio || '');
        setCustomAvatar((prof as any).avatarUrl || undefined);
      }
      setServices(svc || {});
      setWatchedCount(watched.length);
      setWatchlistCount(watchlist.length);
      setFriendsCount(friends.length);
      setLoadingProfile(false);
    });
  }, [userId]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      const r = await updateUserAvatar(userId, dataUrl);
      if (r.success) {
        setCustomAvatar(dataUrl);
        // Persist in localStorage so other parts of the app pick it up immediately
        const s = getUser();
        if (s) saveUser({ ...s, avatarUrl: dataUrl });
      }
    } catch {
      // silently ignore resize errors
    }
    setUploadingAvatar(false);
    e.target.value = '';
  };

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    setInfoError('');
    const r = await updateUserProfile(userId, { displayName, bio });
    if (r.success) {
      // Keep localStorage username in sync
      const s = getUser();
      if (s) saveUser({ ...s, username: s.username });
      setSavedInfo(true);
      setTimeout(() => setSavedInfo(false), 2500);
    } else {
      setInfoError(r.message || 'Failed to save');
    }
    setSavingInfo(false);
  };

  const handleSaveServices = async () => {
    setSavingServices(true);
    await updateUserStreaming(userId, services);
    setSavedServices(true);
    setTimeout(() => setSavedServices(false), 2500);
    setSavingServices(false);
  };

  const toggleService = (key: string) => {
    setServices(prev => ({ ...prev, [key]: !prev[key] }));
    setSavedServices(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/home/profile?user=${userId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username || userId)}`;
  const displayAvatar = customAvatar || dicebearUrl;

  return (
    <div>
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {/* Page Title */}
      <div className="px-0 pt-0 pb-4">
        <h1 className="text-2xl font-bold text-white relative inline-block">
          Profile
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent" />
        </h1>
      </div>

      {/* Banner */}
      <div className="h-48 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black relative overflow-hidden mb-0">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-transparent" />
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]" />
      </div>

      {/* Profile Header Row */}
      <div className="px-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-10 gap-6">
          {/* Avatar */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-4 border-zinc-950 overflow-hidden shadow-2xl">
                {loadingProfile ? (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                ) : (
                  <img src={displayAvatar} alt={displayName || username} className="w-full h-full object-cover" />
                )}
              </div>
              {/* Camera button triggers file picker */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Change profile photo"
                className="absolute bottom-0 right-0 w-10 h-10 bg-red-600 hover:bg-red-700 disabled:bg-red-800 rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110"
              >
                {uploadingAvatar
                  ? <Loader2 size={18} className="text-white animate-spin" />
                  : <Upload size={18} className="text-white" />}
              </button>
            </div>

            <div className="space-y-1">
              {loadingProfile ? (
                <div className="space-y-2">
                  <div className="h-6 w-36 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <h1 className="text-white text-2xl font-bold tracking-tight">{displayName || username}</h1>
                  <p className="text-zinc-400">@{username}</p>
                  {bio && <p className="text-zinc-500 max-w-md text-sm">{bio}</p>}
                  {/* Stats */}
                  <div className="flex items-center gap-6 pt-2">
                    <div className="text-center">
                      <p className="text-white font-bold">{watchedCount ?? '—'}</p>
                      <p className="text-zinc-500 text-xs">Watched</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold">{watchlistCount ?? '—'}</p>
                      <p className="text-zinc-500 text-xs">Watchlist</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold">{friendsCount ?? '—'}</p>
                      <p className="text-zinc-500 text-xs">Friends</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 self-start md:self-auto">
            <Edit2 size={16} />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="px-8 pb-16 space-y-6">

        {/* ── Basic Information ─────────────────────────────── */}
        <Section title="Basic Information" icon={<User size={20} />}>
          <div className="space-y-4">
            <div>
              <label className="block text-zinc-400 mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setSavedInfo(false); }}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-2">Username</label>
              <input
                type="text"
                value={username}
                disabled
                className="w-full bg-zinc-950/30 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-500 cursor-not-allowed"
              />
              <p className="text-zinc-600 text-xs mt-1">Username cannot be changed after registration.</p>
            </div>
            <div>
              <label className="block text-zinc-400 mb-2">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => { setBio(e.target.value); setSavedInfo(false); }}
                placeholder="Tell the world about your movie taste…"
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="email"
                  value={profile?.email ?? sessionUser?.email ?? ''}
                  disabled
                  className="w-full bg-zinc-950/30 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          {infoError && <p className="text-red-400 text-sm mt-3">{infoError}</p>}
          <div className="mt-6 flex justify-end">
            <SaveButton saving={savingInfo} saved={savedInfo} onClick={handleSaveInfo} />
          </div>
        </Section>

        {/* ── Movie Preferences ─────────────────────────────── */}
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-800/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-red-600 rounded-full" />
              <h2 className="text-white uppercase tracking-wider">Movie Preferences</h2>
            </div>
            <Film size={20} className="text-zinc-600" />
          </div>
          <div className="space-y-6">
            {/* Favorite Genres */}
            <div>
              <label className="block text-zinc-400 mb-3">Favorite Genres</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => (
                  <button key={genre} className="px-4 py-2 bg-zinc-950/50 hover:bg-red-600 border border-zinc-800 hover:border-red-600 text-zinc-400 hover:text-white rounded-lg transition-all">
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Streaming Platforms */}
            <div>
              <label className="block text-zinc-400 mb-3">Streaming Platforms</label>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {PLATFORMS.map(p => {
                  const active = !!services[p.key];
                  return (
                    <button
                      key={p.key}
                      onClick={() => toggleService(p.key)}
                      title={p.name}
                      className="aspect-square border rounded-xl flex flex-col items-center justify-center gap-2 transition-all group"
                      style={{
                        backgroundColor: active ? (p.color === 'multicolor' ? 'transparent' : p.color) : 'black',
                        background: active && p.color === 'multicolor' ? 'linear-gradient(90deg, yellow, red, green, blue, purple)' : undefined,
                        borderColor: active ? 'white' : 'dimgray',
                        outline: active ? '2px solid rgba(255,255,255,0.3)' : 'none',
                      }}
                    >
                      <div className="w-14 h-14 flex items-center justify-center bg-white rounded-md p-1">
                        <img src={p.logo} alt={p.name} className="w-12 h-12 object-contain" />
                      </div>
                      <span className={`text-xs ${active ? 'text-white font-semibold' : 'text-zinc-400'} transition-all`}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <SaveButton saving={savingServices} saved={savedServices} onClick={handleSaveServices} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Appearance ──────────────────────────────────── */}
          <Section title="Appearance" icon={<Palette size={20} />}>
            <label className="block text-zinc-400 mb-3">Theme Style</label>
            <div className="space-y-3">
              <button className="w-full p-10 bg-red-600 border-2 border-red-600 rounded-xl flex flex-col items-center text-center gap-1 transition-all">
                <span className="text-white font-semibold text-2xl">Modern</span>
                <p className="text-sm text-red-100">Dark, cinematic, and premium.</p>
              </button>
              <button className="w-full p-10 bg-zinc-950/50 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-red-600 rounded-xl flex flex-col items-center text-center gap-1 transition-all group">
                <span className="text-zinc-300 group-hover:text-white font-semibold text-2xl">Retro</span>
                <p className="text-sm text-zinc-500 group-hover:text-zinc-400">Warm tones, vintage charm.</p>
              </button>
            </div>
          </Section>

          {/* ── Social & Privacy ─────────────────────────────── */}
          <Section title="Social & Privacy" icon={<Users size={20} />}>
            <div className="space-y-5">
              <div>
                <label className="block text-zinc-400 mb-3">
                  Friends <span className="text-zinc-600">({friendsCount ?? '…'})</span>
                </label>
                <p className="text-zinc-500 text-sm">Manage your friends in the Social tab.</p>
              </div>

              <div>
                <label className="block text-zinc-400 mb-3">Privacy Settings</label>
                <div className="space-y-3">
                  {[
                    { icon: <Eye size={18} />, label: 'Show Activity Status', def: true },
                    { icon: <Lock size={18} />, label: 'Show Watchlist Publicly', def: false },
                    { icon: <EyeOff size={18} />, label: 'Hide Ratings & Reviews', def: false },
                  ].map(item => (
                    <label key={item.label} className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 group-hover:text-red-400">{item.icon}</span>
                        <span className="text-zinc-300">{item.label}</span>
                      </div>
                      <input type="checkbox" defaultChecked={item.def} className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-600 focus:ring-offset-0" />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-3">Share Profile</label>
                <button
                  onClick={handleCopyLink}
                  className="w-full p-3 bg-zinc-950/50 hover:bg-red-600 border border-zinc-800 hover:border-red-600 rounded-lg text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  {copied ? <Check size={18} /> : <Share2 size={18} />}
                  {copied ? 'Copied!' : 'Copy Profile Link'}
                </button>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Account Details ──────────────────────────────── */}
        <Section title="Account Details" icon={<Settings size={20} />}>
          <div className="space-y-6">
            <div>
              <label className="block text-zinc-400 mb-3">Region / Location</label>
              <div className="relative">
                <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <select className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-red-600 focus:outline-none appearance-none">
                  <option>United States</option><option>Canada</option><option>United Kingdom</option>
                  <option>Australia</option><option>Germany</option><option>France</option>
                  <option>Japan</option><option>India</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 mb-3">Preferred Language</label>
              <div className="relative">
                <Languages size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <select className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-red-600 focus:outline-none appearance-none">
                  <option>English</option><option>Spanish</option><option>French</option>
                  <option>German</option><option>Japanese</option><option>Portuguese</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 mb-3">Connected Accounts</label>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                      <Globe size={20} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-zinc-300">Google</p>
                      <p className="text-xs text-zinc-600">{profile?.email ?? '—'}</p>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/50 hover:border-red-600 rounded-lg transition-all">
                    Disconnect
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                      <Apple size={20} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-zinc-300">Apple</p>
                      <p className="text-xs text-zinc-600">Not connected</p>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-all">
                    Connect
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 mb-3">Danger Zone</label>
              <button className="w-full p-3 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 hover:border-red-700 rounded-lg text-red-400 hover:text-red-300 transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-red-600" />
                  <span>Delete Account</span>
                </div>
                <span className="text-red-700">→</span>
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
