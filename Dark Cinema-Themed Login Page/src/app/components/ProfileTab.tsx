import React from 'react';
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
  Link as LinkIcon
} from 'lucide-react';

// ─── ProfileHeader ───────────────────────────────────────────

function ProfileHeader() {
  return (
    <div className="relative">
      {/* Page Title */}
      <div className="px-8 pt-12 pb-8">
        <h1 className="text-4xl md:text-5xl tracking-tight text-white relative inline-block">
          Profile
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)]"></div>
        </h1>
      </div>

      {/* Banner Background with Cinematic Blur */}
      <div className="h-48 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-transparent"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]"></div>
      </div>

      {/* Profile Content */}
      <div className="px-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 gap-6">
          {/* Avatar Section */}
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

            {/* User Info */}
            <div className="space-y-1">
              <h1 className="text-white tracking-tight">Alex Martinez</h1>
              <p className="text-zinc-400">@alexmartinez</p>
              <p className="text-zinc-500 max-w-md">Film enthusiast | Collector of stories | Always searching for the next great watch</p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30">
            <Edit2 size={16} />
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ProfileInfoSection ──────────────────────────────────────

function ProfileInfoSection() {
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
            defaultValue="Alex Martinez"
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Username</label>
          <input
            type="text"
            defaultValue="alexmartinez"
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-zinc-400 mb-2">Bio</label>
          <textarea
            rows={3}
            defaultValue="Film enthusiast | Collector of stories | Always searching for the next great watch"
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                defaultValue="alex.martinez@email.com"
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-2">Phone Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="tel"
                defaultValue="+1 (555) 123-4567"
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all border border-zinc-700 flex items-center gap-2">
          <Edit3 size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── MoviePersonalizationSection ─────────────────────────────

function MoviePersonalizationSection() {
  const genres = [
    'Action', 'Drama', 'Sci-Fi', 'Horror', 'Comedy', 'Thriller',
    'Romance', 'Documentary', 'Animation', 'Fantasy'
  ];

  const platforms = [
    { name: 'Netflix', icon: 'N' },
    { name: 'HBO Max', icon: 'H' },
    { name: 'Disney+', icon: 'D+' },
    { name: 'Amazon Prime', icon: 'P' },
    { name: 'Apple TV+', icon: 'A' },
    { name: 'Hulu', icon: 'H' }
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
        {/* Favorite Genres */}
        <div>
          <label className="block text-zinc-400 mb-3">Favorite Genres</label>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                className="px-4 py-2 bg-zinc-950/50 hover:bg-red-600 border border-zinc-800 hover:border-red-600 text-zinc-400 hover:text-white rounded-lg transition-all"
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Favorite Actors/Directors */}
        <div>
          <label className="block text-zinc-400 mb-3">Favorite Actors & Directors</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {['Christopher Nolan', 'Meryl Streep', 'Quentin Tarantino', 'Viola Davis'].map((name) => (
              <span
                key={name}
                className="px-3 py-1.5 bg-red-600/20 border border-red-600/50 text-red-400 rounded-full text-sm flex items-center gap-2"
              >
                <Star size={14} />
                {name}
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search and add favorites..."
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all"
          />
        </div>

        {/* Streaming Platforms */}
        <div>
          <label className="block text-zinc-400 mb-3">Preferred Streaming Platforms</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {platforms.map((platform) => (
              <button
                key={platform.name}
                className="aspect-square bg-zinc-950/50 hover:bg-red-600 border border-zinc-800 hover:border-red-600 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <div className="w-8 h-8 bg-zinc-800 group-hover:bg-red-700 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-white transition-all">
                  <Tv size={16} />
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-white transition-all">{platform.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Rating */}
        <div>
          <label className="block text-zinc-400 mb-3">Content Rating Preferences</label>
          <select className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none transition-all">
            <option>All Ratings</option>
            <option>G - General Audiences</option>
            <option>PG - Parental Guidance</option>
            <option>PG-13 - Parents Strongly Cautioned</option>
            <option>R - Restricted</option>
            <option>NC-17 - Adults Only</option>
          </select>
        </div>

        {/* Watchlist Preferences */}
        <div>
          <label className="block text-zinc-400 mb-3">Watchlist Settings</label>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
              <span className="text-zinc-300">Auto-sort by release date</span>
              <input type="checkbox" className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-600 focus:ring-offset-0" />
            </label>
            <label className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
              <span className="text-zinc-300">Hide watched content</span>
              <input type="checkbox" className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-600 focus:ring-offset-0" defaultChecked />
            </label>
          </div>
        </div>

        {/* Recommendation Style */}
        <div>
          <label className="block text-zinc-400 mb-3">Recommendation Style</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button className="p-4 bg-red-600 border-2 border-red-600 rounded-xl text-left transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={20} className="text-white" />
                <span className="text-white">Surprise Me</span>
              </div>
              <p className="text-sm text-red-100">Random picks outside your usual taste</p>
            </button>
            <button className="p-4 bg-zinc-950/50 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-red-600 rounded-xl text-left transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <Heart size={20} className="text-zinc-400 group-hover:text-red-400" />
                <span className="text-zinc-300 group-hover:text-white">Mood-Based</span>
              </div>
              <p className="text-sm text-zinc-500 group-hover:text-zinc-400">Curated by your current mood</p>
            </button>
            <button className="p-4 bg-zinc-950/50 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-red-600 rounded-xl text-left transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <Star size={20} className="text-zinc-400 group-hover:text-red-400" />
                <span className="text-zinc-300 group-hover:text-white">Past Ratings</span>
              </div>
              <p className="text-sm text-zinc-500 group-hover:text-zinc-400">Based on what you've loved</p>
            </button>
          </div>
        </div>
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

      <div className="space-y-4">
        <label className="block text-zinc-400 mb-3">Theme Mode</label>
        <div className="grid grid-cols-3 gap-3">
          <button className="p-4 bg-zinc-950/50 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-red-600 rounded-xl flex flex-col items-center gap-3 transition-all group">
            <Sun size={24} className="text-zinc-400 group-hover:text-red-400" />
            <span className="text-zinc-300 group-hover:text-white">Light</span>
          </button>
          <button className="p-4 bg-red-600 border-2 border-red-600 rounded-xl flex flex-col items-center gap-3 transition-all">
            <Moon size={24} className="text-white" />
            <span className="text-white">Dark</span>
          </button>
          <button className="p-4 bg-zinc-950/50 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-red-600 rounded-xl flex flex-col items-center gap-3 transition-all group">
            <Monitor size={24} className="text-zinc-400 group-hover:text-red-400" />
            <span className="text-zinc-300 group-hover:text-white">Auto</span>
          </button>
        </div>
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
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-xs">G</span>
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
                  <span className="text-xs text-white"></span>
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

            <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-white">f</span>
                </div>
                <div>
                  <p className="text-zinc-300">Facebook</p>
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
  return (
    <div className="min-h-screen bg-black">
      {/* Cinematic Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent -z-10"></div>
      <div className="fixed inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')] -z-10"></div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto">
        <ProfileHeader />

        <div className="px-8 pb-16 space-y-6">
          <ProfileInfoSection />
          <MoviePersonalizationSection />

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