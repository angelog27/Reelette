import React, { useEffect, useState } from 'react';
import peacockLogo from '../../assets/Peacock.png';
import {
  Camera,
  Edit2,
  Edit3,
  User,
  Mail,
  Phone,
  Film,
  Star,
  Tv,
  Heart,
  Sparkles,
  Moon,
  Sun,
  Monitor,
  Palette,
  Users,
  Shield,
  Share2,
  Eye,
  EyeOff,
  Lock,
  Settings,
  Globe,
  Languages,
  Link as LinkIcon,
  Apple,
  Chrome
} from 'lucide-react';

// ─── ProfileHeader ───────────────────────────────────────────

function ProfileHeader({
  profile,
  onEdit,
}: {
  profile: {
    displayName: string;
    username: string;
    bio: string;
  };
  onEdit: () => void;
}) {
  return (
    <div className="relative">
      <div className="px-8 pt-12 pb-8">
        <h1 className="text-2xl md:text-2xl tracking-tight text-white relative inline-block">
          Profile
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)]"></div>
        </h1>
      </div>

      <div className="h-48 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-transparent"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]"></div>
      </div>

      <div className="px-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-10 gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-4 border-zinc-950 overflow-hidden shadow-2xl">
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Camera size={40} />
                </div>
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
                <Camera size={18} className="text-white" />
              </button>
            </div>

            <div className="space-y-1">
              <h1 className="text-white tracking-tight">{profile.displayName}</h1>
              <p className="text-zinc-400">@{profile.username}</p>
              <p className="text-zinc-500 max-w-md">{profile.bio}</p>
            </div>
          </div>

          <button
            onClick={onEdit}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30"
          >
            <Edit2 size={16} />
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ProfileInfoSection ──────────────────────────────────────

function ProfileInfoSection({
  profile,
  draftProfile,
  isEditing,
  onChange,
  onSave,
  onCancel,
}: {
  profile: {
    displayName: string;
    username: string;
    bio: string;
    email: string;
    phone: string;
  };
  draftProfile: {
    displayName: string;
    username: string;
    bio: string;
    email: string;
    phone: string;
  };
  isEditing: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const data = isEditing ? draftProfile : profile;

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-800/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-white uppercase tracking-wider">Basic Information</h2>
        </div>
        <User size={20} className="text-zinc-600" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-zinc-400 mb-2">Display Name</label>
          <input
            type="text"
            name="displayName"
            value={data.displayName}
            onChange={onChange}
            disabled={!isEditing}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all disabled:opacity-80"
          />
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Username</label>
          <input
            type="text"
            name="username"
            value={data.username}
            onChange={onChange}
            disabled={!isEditing}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all disabled:opacity-80"
          />
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Bio</label>
          <textarea
            rows={3}
            name="bio"
            value={data.bio}
            onChange={onChange}
            disabled={!isEditing}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all resize-none disabled:opacity-80"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                name="email"
                value={data.email}
                disabled
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-400 placeholder-zinc-600 focus:outline-none cursor-not-allowed disabled:opacity-80"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-2">Phone Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="tel"
                name="phone"
                value={data.phone}
                onChange={onChange}
                disabled={!isEditing}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all disabled:opacity-80"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {isEditing && (
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all border border-zinc-700"
          >
            Cancel
          </button>
        )}

        <button
          onClick={onSave}
          disabled={!isEditing}
          className={`px-5 py-2 rounded-lg transition-all border flex items-center gap-2
    ${isEditing
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-lg shadow-red-600/20 hover:shadow-red-600/40'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
            }`}
        >
          <Edit3 size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── MoviePersonalizationSection ─────────────────────────────

function MoviePersonalizationSection({
  moviePreferences,
  favoritePersonInput,
  onFavoritePersonInputChange,
  onAddFavoritePerson,
  onRemoveFavoritePerson,
  onToggleGenre,
  onToggleStreamingService,
  onContentRatingChange,
  onWatchlistSettingChange,
  onSavePreferences,
  isSavingPreferences,
}: {
  moviePreferences: {
    favoriteGenres: string[];
    favoritePeople: string[];
    streamingServices: Record<string, boolean>;
    contentRating: string;
    watchlistSettings: {
      autoSortByReleaseDate: boolean;
      hideWatchedContent: boolean;
    };
  };
  favoritePersonInput: string;
  onFavoritePersonInputChange: (value: string) => void;
  onAddFavoritePerson: () => void;
  onRemoveFavoritePerson: (name: string) => void;
  onToggleGenre: (genre: string) => void;
  onToggleStreamingService: (serviceKey: string) => void;
  onContentRatingChange: (value: string) => void;
  onWatchlistSettingChange: (
    setting: 'autoSortByReleaseDate' | 'hideWatchedContent',
    checked: boolean
  ) => void;
  onSavePreferences: () => void;
  isSavingPreferences: boolean;
}) {
  const genres = [
    'Action', 'Drama', 'Sci-Fi', 'Horror', 'Comedy', 'Thriller',
    'Romance', 'Documentary', 'Animation', 'Fantasy'
  ];

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
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-800/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-white uppercase tracking-wider">Movie Preferences</h2>
        </div>
        <Film size={20} className="text-zinc-600" />
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-zinc-400 mb-3">Favorite Genres</label>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => {
              const isSelected = moviePreferences.favoriteGenres.includes(genre);

              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => onToggleGenre(genre)}
                  className={`px-4 py-2 border rounded-lg transition-all ${isSelected
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:bg-red-600 hover:border-red-600 hover:text-white'
                    }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-zinc-400 mb-3">Favorite Actors & Directors</label>

          <div className="flex flex-wrap gap-2 mb-3">
            {moviePreferences.favoritePeople.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onRemoveFavoritePerson(name)}
                className="px-3 py-1.5 bg-red-600/20 border border-red-600/50 text-red-400 rounded-full text-sm flex items-center gap-2 hover:bg-red-600/30 transition-all"
                title="Remove"
              >
                <Star size={14} />
                {name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={favoritePersonInput}
              onChange={(e) => onFavoritePersonInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddFavoritePerson();
                }
              }}
              placeholder="Search and add favorites..."
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={onAddFavoritePerson}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg border border-red-600 transition-all"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-zinc-400 mb-3">Preferred Streaming Platforms</label>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {platforms.map((platform) => {
              const isSelected = !!moviePreferences.streamingServices[platform.key];

              return (
                <button
                  key={platform.name}
                  type="button"
                  onClick={() => onToggleStreamingService(platform.key)}
                  className={`aspect-square border rounded-xl flex flex-col items-center justify-center gap-2 transition-all group ${isSelected ? 'ring-2 ring-red-500' : ''
                    }`}
                  style={{
                    background:
                      isSelected && platform.color === 'multicolor'
                        ? 'linear-gradient(90deg, yellow, red, green, blue, purple)'
                        : isSelected
                          ? platform.color
                          : 'black',
                    borderColor: isSelected ? 'white' : 'dimgray',
                  }}
                >
                  <div className="w-14 h-14 flex items-center justify-center bg-white rounded-md p-1">
                    <img
                      src={platform.logo}
                      alt={platform.name}
                      className="w-12 h-12 object-contain brightness-75 group-hover:brightness-100 transition-all"
                    />
                  </div>

                  <span className="text-lg text-zinc-400 group-hover:text-white transition-all text-center leading-tight">
                    {platform.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-zinc-400 mb-3">Content Rating Preferences</label>
          <select
            value={moviePreferences.contentRating}
            onChange={(e) => onContentRatingChange(e.target.value)}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all"
          >
            <option>All Ratings</option>
            <option>G - General Audiences</option>
            <option>PG - Parental Guidance</option>
            <option>PG-13 - Parents Strongly Cautioned</option>
            <option>R - Restricted</option>
            <option>NC-17 - Adults Only</option>
          </select>
        </div>

        <div>
          <label className="block text-zinc-400 mb-3">Watchlist Settings</label>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
              <span className="text-zinc-300">Auto-sort by release date</span>
              <input
                type="checkbox"
                checked={moviePreferences.watchlistSettings.autoSortByReleaseDate}
                onChange={(e) =>
                  onWatchlistSettingChange('autoSortByReleaseDate', e.target.checked)
                }
                className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-600 focus:ring-offset-0"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
              <span className="text-zinc-300">Hide watched content</span>
              <input
                type="checkbox"
                checked={moviePreferences.watchlistSettings.hideWatchedContent}
                onChange={(e) =>
                  onWatchlistSettingChange('hideWatchedContent', e.target.checked)
                }
                className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-600 focus:ring-offset-0"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onSavePreferences}
          disabled={isSavingPreferences}
          className={`px-5 py-2 rounded-lg transition-all border flex items-center gap-2 ${isSavingPreferences
            ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-lg shadow-red-600/20 hover:shadow-red-600/40'
            }`}
        >
          <Edit3 size={16} />
          {isSavingPreferences ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
// ─── AppearanceSection ───────────────────────────────────────

function AppearanceSection() {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-800/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-white uppercase tracking-wider">Appearance</h2>
        </div>
        <Palette size={20} className="text-zinc-600" />
      </div>

      <label className="block text-zinc-400 mb-3">Theme Styles</label>

      <div className="space-y-3">
        {/* Modern */}
        <button className="w-full p-14 bg-red-600 border-2 border-red-600 rounded-xl flex flex-col items-center text-center gap-1 transition-all">
          <div className="flex items-center gap-3">
            <Monitor size={22} className="text-white" />
            <span className="text-white font-semibold text-3xl">Modern</span>
          </div>
          <p className="text-sm text-red-100">Dark, cinematic, and premium. Deep blacks, glowing reds, smooth gradients, and
            a sleek movie theater vibe.</p>
        </button>

        {/* Retro */}
        <button className="w-full p-14 bg-zinc-950/50 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-red-600 rounded-xl flex flex-col items-center text-center gap-1 transition-all group">
          <div className="flex items-center gap-3">
            <Sun size={22} className="text-zinc-400 group-hover:text-red-400" />
            <span className="text-zinc-300 group-hover:text-white font-semibold text-3xl">Retro</span>
          </div>
          <p className="text-sm text-zinc-500 group-hover:text-zinc-400">Throw it back with a nostalgic film‑lover aesthetic.
            Warm tones, vintage charm, and a classic old‑school movie vibe.
          </p>
        </button>
      </div>
    </div>
  );
}


// ─── SocialSection ───────────────────────────────────────────

function SocialSection() {
  const friends = [
    { initial: 'JD', name: 'John Doe', color: 'bg-blue-600' },
    { initial: 'SM', name: 'Sarah Miller', color: 'bg-purple-600' },
    { initial: 'RJ', name: 'Robert Johnson', color: 'bg-green-600' },
    { initial: 'EW', name: 'Emily White', color: 'bg-pink-600' },
    { initial: 'MB', name: 'Michael Brown', color: 'bg-orange-600' },
  ];

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-800/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-white uppercase tracking-wider">Social & Privacy</h2>
        </div>
        <Users size={20} className="text-zinc-600" />
      </div>

      <div className="space-y-6">
        {/* Friends List */}
        <div>
          <label className="block text-zinc-400 mb-3">Friends List (127)</label>
          <div className="flex items-center gap-3 mb-3">
            {friends.map((friend) => (
              <div
                key={friend.name}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform shadow-lg"
                style={{ backgroundColor: friend.color.replace('bg-', '#') }}
                title={friend.name}
              >
                {friend.initial}
              </div>
            ))}
            <button className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all">
              +54
            </button>
          </div>
          <button className="text-red-400 hover:text-red-300 transition-all flex items-center gap-2">
            <Users size={16} />
            View All Friends
          </button>
        </div>

        {/* Block/Mute */}
        <div>
          <label className="block text-zinc-400 mb-3">Manage Blocked Users</label>
          <button className="w-full p-3 bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 hover:text-white transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-zinc-500" />
              <span>Block & Mute Settings</span>
            </div>
            <span className="text-zinc-600">→</span>
          </button>
        </div>

        {/* Share Profile */}
        <div>
          <label className="block text-zinc-400 mb-3">Share Profile</label>
          <button className="w-full p-3 bg-zinc-950/50 hover:bg-red-600 border border-zinc-800 hover:border-red-600 rounded-lg text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2">
            <Share2 size={18} />
            Copy Profile Link
          </button>
        </div>

        {/* Privacy Settings */}
        <div>
          <label className="block text-zinc-400 mb-3">Privacy Settings</label>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <Eye size={18} className="text-zinc-500 group-hover:text-red-400" />
                <span className="text-zinc-300">Show Activity Status</span>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-600 focus:ring-offset-0"
                defaultChecked
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-zinc-500 group-hover:text-red-400" />
                <span className="text-zinc-300">Show Watchlist Publicly</span>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-600 focus:ring-offset-0"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <EyeOff size={18} className="text-zinc-500 group-hover:text-red-400" />
                <span className="text-zinc-300">Hide Ratings & Reviews</span>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-600 focus:ring-offset-0"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AccountDetailsSection ───────────────────────────────────

function AccountDetailsSection() {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-800/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-white uppercase tracking-wider">Account Details</h2>
        </div>
        <Settings size={20} className="text-zinc-600" />
      </div>

      <div className="space-y-6">
        {/* Region */}
        <div>
          <label className="block text-zinc-400 mb-3">Region / Location</label>
          <div className="relative">
            <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <select className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all appearance-none">
              <option>United States</option>
              <option>Canada</option>
              <option>United Kingdom</option>
              <option>Australia</option>
              <option>Germany</option>
              <option>France</option>
              <option>Japan</option>
              <option>India</option>
            </select>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-zinc-400 mb-3">Preferred Language</label>
          <div className="relative">
            <Languages size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <select className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all appearance-none">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Japanese</option>
              <option>Mandarin</option>
              <option>Portuguese</option>
              <option>Italian</option>
            </select>
          </div>
        </div>

        {/* Connected Accounts */}
        <div>
          <label className="block text-zinc-400 mb-3">Connected Accounts</label>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                  <Chrome size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-zinc-300">Google</p>
                  <p className="text-xs text-zinc-600">alex.martinez@gmail.com</p>
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
      </div>
    </div>
  );
}

// ─── ProfileTab (Main Component) ─────────────────────────────

export function ProfileTab() {
  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    bio: '',
    email: '',
    phone: '',
  });

  const [draftProfile, setDraftProfile] = useState({
    displayName: '',
    username: '',
    bio: '',
    email: '',
    phone: '',
  });

  const [moviePreferences, setMoviePreferences] = useState({
    favoriteGenres: [] as string[],
    favoritePeople: [] as string[],
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
    contentRating: 'All Ratings',
    watchlistSettings: {
      autoSortByReleaseDate: false,
      hideWatchedContent: true,
    },
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [favoritePersonInput, setFavoritePersonInput] = useState('');
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  useEffect(() => {
  async function loadProfile() {
    try {
      const userId = localStorage.getItem('user_id');
      console.log('userId from localStorage:', userId);

      if (!userId) {
        setIsLoadingProfile(false);
        return;
      }

      const response = await fetch(`http://localhost:5000/api/user/${userId}`);
      const data = await response.json();

      console.log('profile API response:', data);

      const loadedProfile = {
        displayName: data.displayName || '',
        username: data.username || '',
        bio: data.bio || '',
        email: data.email || '',
        phone: data.phone || '',
      };

      console.log('loadedProfile:', loadedProfile);

      setProfile(loadedProfile);
      setDraftProfile(loadedProfile);

      const streamingResponse = await fetch(`http://localhost:5000/api/user/${userId}/streaming`);
      const streamingData = await streamingResponse.json();

      const moviePreferencesResponse = await fetch(
        `http://localhost:5000/api/user/${userId}/movie-preferences`
      );
      const moviePreferencesData = await moviePreferencesResponse.json();

      console.log('streaming API response:', streamingData);
      console.log('movie preferences API response:', moviePreferencesData);

      setMoviePreferences({
        favoriteGenres: moviePreferencesData.favoriteGenres || [],
        favoritePeople: moviePreferencesData.favoritePeople || [],
        streamingServices: {
          netflix: streamingData.netflix || false,
          appleTV: streamingData.appleTV || false,
          hboMax: streamingData.hboMax || false,
          disneyPlus: streamingData.disneyPlus || false,
          hulu: streamingData.hulu || false,
          amazonPrime: streamingData.amazonPrime || false,
          paramount: streamingData.paramount || false,
          peacock: streamingData.peacock || false,
        },
        contentRating: moviePreferencesData.contentRating || 'All Ratings',
        watchlistSettings: {
          autoSortByReleaseDate:
            moviePreferencesData.watchlistSettings?.autoSortByReleaseDate || false,
          hideWatchedContent:
            moviePreferencesData.watchlistSettings?.hideWatchedContent ?? true,
        },
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }

  loadProfile();
}, []);

  function handleStartEditing() {
    setDraftProfile(profile);
    setIsEditingProfile(true);
  }

  function handleProfileChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
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

      const response = await fetch(`http://localhost:5000/api/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: draftProfile.displayName,
          username: draftProfile.username,
          bio: draftProfile.bio,
          phone: draftProfile.phone,
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

  function handleToggleGenre(genre: string) {
    setMoviePreferences((prev) => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter((item) => item !== genre)
        : [...prev.favoriteGenres, genre],
    }));
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

  function handleContentRatingChange(value: string) {
    setMoviePreferences((prev) => ({
      ...prev,
      contentRating: value,
    }));
  }

  function handleWatchlistSettingChange(
    setting: 'autoSortByReleaseDate' | 'hideWatchedContent',
    checked: boolean
  ) {
    setMoviePreferences((prev) => ({
      ...prev,
      watchlistSettings: {
        ...prev.watchlistSettings,
        [setting]: checked,
      },
    }));
  }

  function handleAddFavoritePerson() {
    const trimmed = favoritePersonInput.trim();

    if (!trimmed) return;
    if (moviePreferences.favoritePeople.includes(trimmed)) {
      setFavoritePersonInput('');
      return;
    }

    setMoviePreferences((prev) => ({
      ...prev,
      favoritePeople: [...prev.favoritePeople, trimmed],
    }));
    setFavoritePersonInput('');
  }

  function handleRemoveFavoritePerson(name: string) {
    setMoviePreferences((prev) => ({
      ...prev,
      favoritePeople: prev.favoritePeople.filter((person) => person !== name),
    }));
  }

  async function handleSaveMoviePreferences() {
  try {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      console.error('No user_id found');
      return;
    }

    setIsSavingPreferences(true);

    const [streamingResponse, moviePreferencesResponse] = await Promise.all([
      fetch(`http://localhost:5000/api/user/${userId}/streaming`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moviePreferences.streamingServices),
      }),
      fetch(`http://localhost:5000/api/user/${userId}/movie-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          favoriteGenres: moviePreferences.favoriteGenres,
          favoritePeople: moviePreferences.favoritePeople,
          contentRating: moviePreferences.contentRating,
          watchlistSettings: moviePreferences.watchlistSettings,
        }),
      }),
    ]);

    const streamingResult = await streamingResponse.json();
    const moviePreferencesResult = await moviePreferencesResponse.json();

    if (!streamingResponse.ok || !streamingResult.success) {
      throw new Error(
        streamingResult.message || 'Failed to save streaming preferences'
      );
    }

    if (!moviePreferencesResponse.ok || !moviePreferencesResult.success) {
      throw new Error(
        moviePreferencesResult.message || 'Failed to save movie preferences'
      );
    }
  } catch (error) {
    console.error('Failed to save movie preferences:', error);
  } finally {
    setIsSavingPreferences(false);
  }
}

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent -z-10"></div>
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')] -z-10"></div>

      <div className="max-w-6xl mx-auto">
        <ProfileHeader
          profile={profile}
          onEdit={handleStartEditing}
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
            favoritePersonInput={favoritePersonInput}
            onFavoritePersonInputChange={setFavoritePersonInput}
            onAddFavoritePerson={handleAddFavoritePerson}
            onRemoveFavoritePerson={handleRemoveFavoritePerson}
            onToggleGenre={handleToggleGenre}
            onToggleStreamingService={handleToggleStreamingService}
            onContentRatingChange={handleContentRatingChange}
            onWatchlistSettingChange={handleWatchlistSettingChange}
            onSavePreferences={handleSaveMoviePreferences}
            isSavingPreferences={isSavingPreferences}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AppearanceSection />
            <SocialSection />
          </div>

          <AccountDetailsSection />
        </div>
      </div>
    </div>
  );
}