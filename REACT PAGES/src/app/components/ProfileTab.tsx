import React, { useEffect, useState } from 'react';
import peacockLogo from '../../assets/Peacock.png';
import { BASE_URL, getFriends, getUserPublicProfile, saveSocialSettings } from '../services/api';
import type { Friend } from '../services/api';
import { UserProfileModal } from './UserProfileModal';
import { useTheme } from './ThemeContext';
import {
  Camera,
  Edit2,
  Edit3,
  User,
  Mail,
  Film,
  Moon,
  Sun,
  Palette,
  Users,
  Eye,
  Lock,
  Settings,
  Globe,
  Apple,
  Loader2,
} from 'lucide-react';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const BANNER_PRESETS = [
  { id: 'default', label: 'Cinematic', swatch: '#27272a', gradient: 'linear-gradient(135deg,#18181b 0%,#09090b 60%,#000 100%)' },
  { id: 'crimson', label: 'Crimson', swatch: '#7f1d1d', gradient: 'linear-gradient(135deg,#450a0a 0%,#0d0d0d 60%,#000 100%)' },
  { id: 'midnight', label: 'Midnight', swatch: '#1e3a8a', gradient: 'linear-gradient(135deg,#0c1a3d 0%,#0d0d0d 60%,#000 100%)' },
  { id: 'dusk', label: 'Dusk', swatch: '#4c1d95', gradient: 'linear-gradient(135deg,#2e1065 0%,#0d0d0d 60%,#000 100%)' },
  { id: 'forest', label: 'Forest', swatch: '#14532d', gradient: 'linear-gradient(135deg,#052e16 0%,#0d0d0d 60%,#000 100%)' },
  { id: 'ember', label: 'Ember', swatch: '#92400e', gradient: 'linear-gradient(135deg,#451a03 0%,#0d0d0d 60%,#000 100%)' },
  { id: 'ocean', label: 'Ocean', swatch: '#134e4a', gradient: 'linear-gradient(135deg,#042f2e 0%,#0d0d0d 60%,#000 100%)' },
  { id: 'rose', label: 'Rose', swatch: '#9f1239', gradient: 'linear-gradient(135deg,#500724 0%,#0d0d0d 60%,#000 100%)' },
];

function getBannerGradient(id: string) {
  return (BANNER_PRESETS.find((p) => p.id === id) ?? BANNER_PRESETS[0]).gradient;
}

function ProfileHeader({
  profile,
  avatarUrl,
  bannerBg,
  isEditing,
  onEdit,
  onAvatarChange,
  onBannerChange,
}: {
  profile: { displayName: string; username: string; bio: string };
  avatarUrl?: string;
  bannerBg: string;
  isEditing: boolean;
  onEdit: () => void;
  onAvatarChange: (dataUrl: string) => void;
  onBannerChange: (presetId: string) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onAvatarChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative">
      <div className="px-8 pt-12 pb-8">
        <h1 className="text-2xl tracking-tight text-foreground relative inline-block">
          Profile
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)]"></div>
        </h1>
      </div>

      <div className="h-48 relative" style={{ background: getBannerGradient(bannerBg) }}>
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] pointer-events-none" />

        {isEditing && (
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 bg-background/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border">
            <span className="text-muted-foreground text-[10px] mr-1 uppercase tracking-wider">Banner</span>
            {BANNER_PRESETS.map((p) => (
              <button
                key={p.id}
                title={p.label}
                onClick={() => onBannerChange(p.id)}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 focus:outline-none"
                style={{
                  backgroundColor: p.swatch,
                  borderColor: bannerBg === p.id ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6" style={{ marginTop: '-40px' }}>
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="relative group flex-shrink-0 z-10">
              <div className="w-32 h-32 rounded-full bg-card border-4 border-border overflow-hidden shadow-2xl">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Camera size={40} />
                  </div>
                )}
              </div>

              {isEditing && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110"
                    title="Change photo"
                  >
                    <Camera size={18} className="text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>

            <div className="space-y-1 pb-1">
              <h1 className="text-foreground tracking-tight">{profile.displayName}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
              <p className="text-muted-foreground max-w-md">{profile.bio}</p>
            </div>
          </div>

          <button
            onClick={onEdit}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30 self-end md:self-auto"
          >
            <Edit2 size={16} />
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileInfoSection({
  profile,
  draftProfile,
  isEditing,
  onChange,
  onSave,
  onCancel,
}: {
  profile: {
    avatarUrl?: string;
    displayName: string;
    username: string;
    bio: string;
    email: string;
  };
  draftProfile: {
    avatarUrl?: string;
    displayName: string;
    username: string;
    bio: string;
    email: string;
  };
  isEditing: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const data = isEditing ? draftProfile : profile;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-foreground uppercase tracking-wider">Basic Information</h2>
        </div>
        <User size={20} className="text-muted-foreground" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-muted-foreground mb-2">Display Name</label>
          <input
            type="text"
            name="displayName"
            value={data.displayName}
            onChange={onChange}
            disabled={!isEditing}
            className="w-full bg-background/80 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all disabled:opacity-80"
          />
        </div>

        <div>
          <label className="block text-muted-foreground mb-2">Username</label>
          <input
            type="text"
            name="username"
            value={data.username}
            onChange={onChange}
            disabled={!isEditing}
            className="w-full bg-background/80 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all disabled:opacity-80"
          />
        </div>

        <div>
          <label className="block text-muted-foreground mb-2">Bio</label>
          <textarea
            rows={3}
            name="bio"
            value={data.bio}
            onChange={onChange}
            disabled={!isEditing}
            className="w-full bg-background/80 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all resize-none disabled:opacity-80"
          />
        </div>

        <div>
          <label className="block text-muted-foreground mb-2">Email Address</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              name="email"
              value={data.email}
              disabled
              className="w-full bg-background/80 border border-border rounded-lg pl-10 pr-4 py-2.5 text-muted-foreground focus:outline-none cursor-not-allowed disabled:opacity-80"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {isEditing && (
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
          >
            Cancel
          </button>
        )}

        <button
          onClick={onSave}
          disabled={!isEditing}
          className={`px-5 py-2 rounded-lg transition-all border flex items-center gap-2 ${
            isEditing
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-lg shadow-red-600/20 hover:shadow-red-600/40'
              : 'bg-muted text-muted-foreground border-border cursor-not-allowed'
          }`}
        >
          <Edit3 size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}

function MoviePersonalizationSection({
  moviePreferences,
  onToggleStreamingService,
  onSavePreferences,
  isSavingPreferences,
}: {
  moviePreferences: {
    streamingServices: Record<string, boolean>;
  };
  onToggleStreamingService: (serviceKey: string) => void;
  onSavePreferences: () => void;
  isSavingPreferences: boolean;
}) {
  const platforms = [
    { key: 'netflix', name: 'Netflix', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', color: 'red' },
    { key: 'appleTV', name: 'Apple TV+', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', color: 'dimgray' },
    { key: 'hboMax', name: 'HBO Max', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg', color: '#5B31B9' },
    { key: 'disneyPlus', name: 'Disney+', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', color: '#00A2FF' },
    { key: 'hulu', name: 'Hulu', logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/hulu.svg', color: '#1CE783' },
    { key: 'amazonPrime', name: 'Amazon Prime', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', color: '#00A8E1' },
    { key: 'paramount', name: 'Paramount+', logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/paramountplus.svg', color: 'blue' },
    { key: 'peacock', name: 'Peacock', logo: peacockLogo, color: 'multicolor' },
  ];

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-foreground uppercase tracking-wider">Streaming Services</h2>
        </div>
        <Film size={20} className="text-muted-foreground" />
      </div>

      <div>
        <label className="block text-muted-foreground mb-3">Preferred Streaming Platforms</label>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {platforms.map((platform) => {
            const isSelected = !!moviePreferences.streamingServices[platform.key];

            return (
              <button
                key={platform.name}
                type="button"
                onClick={() => onToggleStreamingService(platform.key)}
                className={`aspect-square border rounded-xl flex flex-col items-center justify-center gap-2 transition-all group ${
                  isSelected ? 'ring-2 ring-red-500' : ''
                }`}
                style={{
                  background:
                    isSelected && platform.color === 'multicolor'
                      ? 'linear-gradient(90deg, yellow, red, green, blue, purple)'
                      : isSelected
                      ? platform.color
                      : 'var(--background)',
                  borderColor: isSelected ? 'white' : 'var(--border)',
                }}
              >
                <div className="w-14 h-14 flex items-center justify-center bg-card rounded-md p-1 border border-border">
                  <img
                    src={platform.logo}
                    alt={platform.name}
                    className="w-12 h-12 object-contain brightness-75 group-hover:brightness-100 transition-all"
                  />
                </div>

                <span className="text-lg text-foreground group-hover:text-foreground transition-all text-center leading-tight">
                  {platform.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onSavePreferences}
          disabled={isSavingPreferences}
          className={`px-5 py-2 rounded-lg transition-all border flex items-center gap-2 ${
            isSavingPreferences
              ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-lg shadow-red-600/20 hover:shadow-red-600/40'
          }`}
        >
          <Edit3 size={16} />
          {isSavingPreferences ? 'Saving...' : 'Save Services'}
        </button>
      </div>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-foreground uppercase tracking-wider">Appearance</h2>
        </div>
        <Palette size={20} className="text-muted-foreground" />
      </div>

      <label className="block text-muted-foreground mb-3">Style</label>

      <div className="space-y-3">
        <button
          onClick={() => setTheme('dark')}
          className={`w-full p-14 border-2 rounded-xl flex flex-col items-center text-center gap-1 transition-all ${
            theme === 'dark'
              ? 'bg-red-600 border-red-600'
              : 'bg-card/60 hover:bg-accent border-border hover:border-red-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <Moon size={22} className={theme === 'dark' ? 'text-white' : 'text-muted-foreground'} />
            <span className={`font-semibold text-3xl ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>
              Dark
            </span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-red-100' : 'text-muted-foreground'}`}>
            Dark, cinematic, and premium. Deep blacks, glowing reds, smooth gradients, and a sleek movie theater vibe.
          </p>
        </button>

        <button
          onClick={() => setTheme('light')}
          className={`w-full p-14 border-2 rounded-xl flex flex-col items-center text-center gap-1 transition-all ${
            theme === 'light'
              ? 'bg-red-600 border-red-600'
              : 'bg-card/60 hover:bg-accent border-border hover:border-red-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <Sun size={22} className={theme === 'light' ? 'text-white' : 'text-muted-foreground'} />
            <span className={`font-semibold text-3xl ${theme === 'light' ? 'text-white' : 'text-foreground'}`}>
              Light
            </span>
          </div>
          <p className={`text-sm ${theme === 'light' ? 'text-red-100' : 'text-muted-foreground'}`}>
            A bright and airy theme with a modern look and feel. Slick tabs that maintain that theatre-like feel.
          </p>
        </button>
      </div>
    </div>
  );
}

interface SocialFriend extends Friend {
  avatarUrl?: string;
  displayName?: string;
}

function SocialSection({
  userId,
  onOpenProfile,
  socialSettings,
  onSocialSettingToggle,
}: {
  userId: string;
  onOpenProfile: (uid: string) => void;
  socialSettings: { showOnlineStatus: boolean; showMyStuffPublicly: boolean };
  onSocialSettingToggle: (key: 'showOnlineStatus' | 'showMyStuffPublicly', value: boolean) => void;
}) {
  const [friends, setFriends] = useState<SocialFriend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const PREVIEW_COUNT = 7;

  useEffect(() => {
    if (!userId) return;
    setLoadingFriends(true);
    getFriends(userId).then(async (rawFriends) => {
      const profiles = await Promise.all(rawFriends.map((f) => getUserPublicProfile(f.friend_id)));
      setFriends(
        rawFriends.map((f, i) => ({
          ...f,
          avatarUrl: profiles[i]?.avatarUrl,
          displayName: profiles[i]?.displayName,
        }))
      );
      setLoadingFriends(false);
    });
  }, [userId]);

  const visibleFriends = showAll ? friends : friends.slice(0, PREVIEW_COUNT);
  const remaining = friends.length - PREVIEW_COUNT;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-foreground uppercase tracking-wider">Social</h2>
        </div>
        <Users size={20} className="text-muted-foreground" />
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-muted-foreground mb-3">
            Friends List {!loadingFriends && `(${friends.length})`}
          </label>

          {loadingFriends ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading friends…</span>
            </div>
          ) : friends.length === 0 ? (
            <p className="text-muted-foreground text-sm py-2">No friends yet — head to Social to connect!</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {visibleFriends.map((friend) => (
                  <button
                    key={friend.friend_id}
                    title={friend.displayName || friend.friend_username}
                    onClick={() => onOpenProfile(friend.friend_id)}
                    className="group relative flex flex-col items-center gap-1"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border group-hover:border-red-500 transition-all shadow-lg">
                      {friend.avatarUrl ? (
                        <img
                          src={friend.avatarUrl}
                          alt={friend.friend_username}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-semibold">
                          {(friend.displayName || friend.friend_username).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-muted-foreground text-[10px] group-hover:text-foreground transition-colors max-w-[48px] truncate">
                      {friend.friend_username}
                    </span>
                  </button>
                ))}

                {!showAll && remaining > 0 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-12 h-12 rounded-full bg-muted hover:bg-accent border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground text-xs font-medium transition-all"
                  >
                    +{remaining}
                  </button>
                )}
              </div>

              {showAll && friends.length > PREVIEW_COUNT && (
                <button
                  onClick={() => setShowAll(false)}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors mb-1"
                >
                  Show less
                </button>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-muted-foreground mb-3">Social Settings</label>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:border-red-500/40 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <Eye size={18} className="text-muted-foreground group-hover:text-red-400" />
                <span className="text-foreground">Show Online Status</span>
              </div>
              <input
                type="checkbox"
                checked={socialSettings.showOnlineStatus}
                onChange={(e) => onSocialSettingToggle('showOnlineStatus', e.target.checked)}
                className="w-5 h-5 rounded bg-background border-border text-red-600 focus:ring-red-600 focus:ring-offset-0"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:border-red-500/40 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-muted-foreground group-hover:text-red-400" />
                <span className="text-foreground">Show MyStuff Publicly</span>
              </div>
              <input
                type="checkbox"
                checked={socialSettings.showMyStuffPublicly}
                onChange={(e) => onSocialSettingToggle('showMyStuffPublicly', e.target.checked)}
                className="w-5 h-5 rounded bg-background border-border text-red-600 focus:ring-red-600 focus:ring-offset-0"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountDetailsSection({
  providers,
  email,
  emailVerified,
  joinedAt,
}: {
  providers: { providerId: string; email: string }[];
  email: string;
  emailVerified: boolean;
  joinedAt: string;
}) {
  const PROVIDER_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
    'google.com': { label: 'Google', icon: <GoogleIcon size={20} /> },
    'apple.com': { label: 'Apple', icon: <Apple size={20} className="text-zinc-200" /> },
    password: { label: 'Email / Password', icon: <Mail size={20} className="text-muted-foreground" /> },
  };

  const ALL_PROVIDERS = ['google.com', 'apple.com', 'password'];
  const connectedIds = new Set(providers.map((p) => p.providerId));

  const joinedFormatted = joinedAt
    ? new Date(joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-foreground uppercase tracking-wider">Account Details</h2>
        </div>
        <Settings size={20} className="text-muted-foreground" />
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-muted-foreground mb-2">Email Address</label>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-background/60 border border-border rounded-lg">
            <Mail size={16} className="text-muted-foreground shrink-0" />
            <span className="text-foreground flex-1">{email || '—'}</span>
            {email && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  emailVerified
                    ? 'text-green-400 border-green-800 bg-green-950/50'
                    : 'text-yellow-400 border-yellow-800 bg-yellow-950/50'
                }`}
              >
                {emailVerified ? 'Verified' : 'Unverified'}
              </span>
            )}
          </div>
        </div>

        {joinedFormatted && (
          <div>
            <label className="block text-muted-foreground mb-2">Member Since</label>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-background/60 border border-border rounded-lg">
              <Globe size={16} className="text-muted-foreground shrink-0" />
              <span className="text-foreground">{joinedFormatted}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-muted-foreground mb-3">Sign-in Methods</label>
          <div className="space-y-3">
            {ALL_PROVIDERS.map((id) => {
              const cfg = PROVIDER_CONFIG[id];
              const connected = connectedIds.has(id);
              const providerEmail = providers.find((p) => p.providerId === id)?.email || '';
              return (
                <div key={id} className="flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center border border-border">
                      {cfg?.icon}
                    </div>
                    <div>
                      <p className="text-foreground">{cfg?.label ?? id}</p>
                      <p className="text-xs text-muted-foreground">
                        {connected ? providerEmail || 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {connected ? (
                    <span className="px-3 py-1 text-xs text-green-400 border border-green-800 bg-green-950/40 rounded-full">
                      Connected
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs text-muted-foreground border border-border rounded-full">
                      Not linked
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SocialFriend extends Friend {
  avatarUrl?: string;
  displayName?: string;
}

export function ProfileTab() {
  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    bio: '',
    email: '',
    avatarUrl: '',
    profileBannerBg: 'default',
  });

  const [draftProfile, setDraftProfile] = useState({
    displayName: '',
    username: '',
    bio: '',
    email: '',
    avatarUrl: '',
    profileBannerBg: 'default',
  });

  const [socialSettings, setSocialSettings] = useState({
    showOnlineStatus: true,
    showMyStuffPublicly: false,
  });

  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const [moviePreferences, setMoviePreferences] = useState({
    streamingServices: {
      netflix: false,
      appleTV: false,
      hboMax: false,
      disneyPlus: false,
      hulu: false,
      amazonPrime: false,
      paramount: false,
      peacock: false,
    },
  });

  const [providers, setProviders] = useState<{ providerId: string; email: string }[]>([]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [joinedAt, setJoinedAt] = useState('');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setLoadError('');
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        setLoadError('No user session found. Please log in again.');
        setIsLoadingProfile(false);
        return;
      }

      try {
        const profileFetch = await fetch(`${BASE_URL}/user/${userId}`);
        if (!profileFetch.ok) {
          throw new Error(`Server returned ${profileFetch.status} for user profile`);
        }
        const profileRes = await profileFetch.json();
        if (profileRes.error) {
          throw new Error(profileRes.error);
        }

        const loadedProfile = {
          displayName: profileRes.displayName || '',
          username: profileRes.username || '',
          bio: profileRes.bio || '',
          email: profileRes.email || '',
          avatarUrl: profileRes.avatarUrl || '',
          profileBannerBg: profileRes.profileBannerBg || 'default',
        };

        setProfile(loadedProfile);
        setDraftProfile(loadedProfile);
        setProviders(profileRes.providerData || []);
        setEmailVerified(profileRes.emailVerified || false);
        setJoinedAt(profileRes.joinedAt || '');
        setSocialSettings({
          showOnlineStatus: profileRes.socialSettings?.showOnlineStatus ?? true,
          showMyStuffPublicly: profileRes.socialSettings?.showMyStuffPublicly ?? false,
        });

        const streaming = profileRes.streamingServices || {};

        setMoviePreferences({
          streamingServices: {
            netflix: !!streaming.netflix,
            appleTV: !!streaming.appleTV,
            hboMax: !!streaming.hboMax,
            disneyPlus: !!streaming.disneyPlus,
            hulu: !!streaming.hulu,
            amazonPrime: !!streaming.amazonPrime,
            paramount: !!streaming.paramount,
            peacock: !!streaming.peacock,
          },
        });
      } catch (error) {
        console.error('Failed to load profile:', error);
        setLoadError('Could not reach the server. Make sure the backend is running.');
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadProfile();
  }, [retryCount]);

  function handleStartEditing() {
    setDraftProfile(profile);
    setIsEditingProfile(true);
  }

  function handleProfileChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setDraftProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSaveProfile() {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        console.error('No user_id found');
        return;
      }

      const response = await fetch(`${BASE_URL}/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: draftProfile.displayName,
          username: draftProfile.username,
          bio: draftProfile.bio,
          profileBannerBg: draftProfile.profileBannerBg,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save profile');
      }

      setProfile((prev) => ({
        ...prev,
        ...draftProfile,
      }));
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  }

  function handleCancelProfileEdit() {
    setDraftProfile(profile);
    setIsEditingProfile(false);
  }

  async function handleAvatarChange(dataUrl: string) {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    try {
      const { updateUserAvatar } = await import('../services/api');
      await updateUserAvatar(userId, dataUrl);
      setProfile((prev) => ({ ...prev, avatarUrl: dataUrl }));
      setDraftProfile((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
  }

  function handleBannerChange(presetId: string) {
    setDraftProfile((prev) => ({ ...prev, profileBannerBg: presetId }));
  }

  function handleToggleStreamingService(serviceKey: string) {
    setMoviePreferences((prev) => ({
      ...prev,
      streamingServices: {
        ...prev.streamingServices,
        [serviceKey]: !prev.streamingServices[serviceKey],
      },
    }));
  }

  async function handleSocialSettingToggle(
    key: 'showOnlineStatus' | 'showMyStuffPublicly',
    value: boolean
  ) {
    const updated = { ...socialSettings, [key]: value };
    setSocialSettings(updated);
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    try {
      await saveSocialSettings(userId, updated);
    } catch (err) {
      console.error('Failed to save social settings:', err);
    }
  }

  async function handleSaveMoviePreferences() {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        console.error('No user_id found');
        return;
      }

      setIsSavingPreferences(true);

      const response = await fetch(`${BASE_URL}/user/${userId}/streaming`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moviePreferences.streamingServices),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save streaming preferences');
      }
    } catch (error) {
      console.error('Failed to save movie preferences:', error);
    } finally {
      setIsSavingPreferences(false);
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-red-400 font-medium">{loadError}</p>
        <button
          onClick={() => {
            setIsLoadingProfile(true);
            setRetryCount((c) => c + 1);
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const userId = localStorage.getItem('user_id') ?? '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {viewingProfileId && (
        <UserProfileModal userId={viewingProfileId} onClose={() => setViewingProfileId(null)} />
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40 -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent -z-10"></div>
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')] -z-10"></div>

      <div className="max-w-6xl mx-auto">
        <ProfileHeader
          profile={profile}
          avatarUrl={profile.avatarUrl}
          bannerBg={isEditingProfile ? draftProfile.profileBannerBg : profile.profileBannerBg}
          isEditing={isEditingProfile}
          onEdit={handleStartEditing}
          onAvatarChange={handleAvatarChange}
          onBannerChange={handleBannerChange}
        />

        <div className="px-8 pb-16 space-y-6">
          <ProfileInfoSection
            profile={profile}
            draftProfile={draftProfile}
            isEditing={isEditingProfile}
            onChange={handleProfileChange}
            onSave={handleSaveProfile}
            onCancel={handleCancelProfileEdit}
          />

          <MoviePersonalizationSection
            moviePreferences={moviePreferences}
            onToggleStreamingService={handleToggleStreamingService}
            onSavePreferences={handleSaveMoviePreferences}
            isSavingPreferences={isSavingPreferences}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AppearanceSection />
            <SocialSection
              userId={userId}
              onOpenProfile={setViewingProfileId}
              socialSettings={socialSettings}
              onSocialSettingToggle={handleSocialSettingToggle}
            />
          </div>

          <AccountDetailsSection
            providers={providers}
            email={profile.email}
            emailVerified={emailVerified}
            joinedAt={joinedAt}
          />
        </div>
      </div>
    </div>
  );
}