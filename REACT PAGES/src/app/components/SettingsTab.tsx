import React, { useState } from 'react';
import { useNavigate } from "react-router";
import { clearUser, clearServices } from '../services/api';
import {
  Bell,
  Film,
  Users,
  Sparkles,
  MessageSquare,
  Lock,
  Mail,
  RotateCcw,
  Eye,
  LogOut,
  Trash2
} from 'lucide-react';


// ─── SettingItem ─────────────────────────────────────────────


interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  type?: 'toggle' | 'action' | 'danger';
  enabled?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}


function SettingItem({ icon, label, type = 'toggle', enabled = false, onToggle, onClick }: SettingItemProps) {
  const isDanger = type === 'danger';
  const isAction = type === 'action';
  const isToggle = type === 'toggle';


  return (
    <div
      className={`flex items-center justify-between p-4 rounded-md border border-zinc-800/30 transition-all duration-200 ${
        isAction || isDanger ? 'cursor-pointer hover:border-red-600/50 hover:bg-zinc-800/30' : 'hover:border-zinc-700/50'
      } ${isDanger ? 'hover:bg-red-950/20' : ''}`}
      onClick={isAction || isDanger ? onClick : undefined}
    >
      <div className="flex items-center gap-4">
        <div className={`${isDanger ? 'text-red-500' : 'text-zinc-400'} transition-colors duration-200 group-hover:text-red-500`}>
          {icon}
        </div>
        <span className={`${isDanger ? 'text-red-400' : 'text-zinc-300'} tracking-wide`}>
          {label}
        </span>
      </div>
      {isToggle && (
        <button
          onClick={onToggle}
          className="relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-600/50"
          style={{
            backgroundColor: enabled ? '#dc2626' : '#3f3f46'
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300"
            style={{
              transform: enabled ? 'translateX(24px)' : 'translateX(0)'
            }}
          />
        </button>
      )}
    </div>
  );
}


// ─── SettingsSection ─────────────────────────────────────────


interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}


function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg p-8 border border-zinc-800/50 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-0.5 w-8 bg-gradient-to-r from-red-600 to-transparent"></div>
        <h2 className="text-white/90 tracking-wide">{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}


// ─── SettingsTab (Main Component) ────────────────────────────


export function SettingsTab() {
 
  const [settings, setSettings] = useState({
    newMovieAlerts: true,
    friendActivity: false,
    recommendations: true,
    groupChat: true,
  });


  const navigate = useNavigate();


  const handleLogout = () => {
    clearUser();
    clearServices();
    navigate('/');
  };


  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };


  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Cinematic background elements */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-zinc-700 rounded-full"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-2 border-zinc-700 rounded-full"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 border-2 border-zinc-700 rounded-full"></div>
      </div>


      {/* Subtle red glow vignette */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/10 via-transparent to-transparent pointer-events-none"></div>


      <div className="relative z-10 max-w-5xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-white tracking-tight relative inline-block">
            Settings
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 via-red-600/50 to-transparent"></div>
          </h1>
          <p className="text-zinc-500 mt-4 tracking-wide">
            Manage your account preferences and privacy settings
          </p>
        </div>


        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Notifications Section */}
          <SettingsSection title="Notifications">
            <SettingItem
              icon={<Film size={20} />}
              label="New Movie Alerts"
              enabled={settings.newMovieAlerts}
              onToggle={() => toggleSetting('newMovieAlerts')}
            />
            <SettingItem
              icon={<Users size={20} />}
              label="Friend Activity"
              enabled={settings.friendActivity}
              onToggle={() => toggleSetting('friendActivity')}
            />
            <SettingItem
              icon={<Sparkles size={20} />}
              label="Recommendation Updates"
              enabled={settings.recommendations}
              onToggle={() => toggleSetting('recommendations')}
            />
            <SettingItem
              icon={<MessageSquare size={20} />}
              label="Group Chat Notifications"
              enabled={settings.groupChat}
              onToggle={() => toggleSetting('groupChat')}
            />
          </SettingsSection>


          {/* Security & Privacy Section */}
          <SettingsSection title="Security & Privacy">
            <SettingItem
              icon={<Lock size={20} />}
              label="Change Account Password"
              type="action"
              onClick={() => alert('Password change functionality')}
            />
            <SettingItem
              icon={<Mail size={20} />}
              label="Update Email Address"
              type="action"
              onClick={() => alert('Email update functionality')}
            />
            <SettingItem
              icon={<RotateCcw size={20} />}
              label="Clear Search History"
              type="action"
              onClick={() => alert('Search history cleared')}
            />
            <SettingItem
              icon={<Eye size={20} />}
              label="Clear Watch History"
              type="action"
              onClick={() => alert('Watch history cleared')}
            />
            <SettingItem
              icon={<LogOut size={20} />}
              label="Log Out"
              type="action"
              onClick={handleLogout}
            />
            <SettingItem
              icon={<Trash2 size={20} />}
              label="Delete My Account"
              type="danger"
              onClick={() => alert('Account deletion requires confirmation')}
            />
          </SettingsSection>
        </div>


        {/* Footer decoration */}
        <div className="mt-16 flex items-center justify-center gap-2 opacity-20">
          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

