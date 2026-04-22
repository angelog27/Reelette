import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { clearUser, clearServices } from '../services/api';
import {
  Film,
  Users,
  Sparkles,
  MessageSquare,
  Lock,
  Mail,
  LogOut,
  Trash2
} from 'lucide-react';

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  type?: 'toggle' | 'action' | 'danger';
  enabled?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

function SettingItem({
  icon,
  label,
  type = 'toggle',
  enabled = false,
  onToggle,
  onClick
}: SettingItemProps) {
  const isDanger = type === 'danger';
  const isAction = type === 'action';
  const isToggle = type === 'toggle';

  return (
    <div
      className={`flex items-center justify-between rounded-md border p-4 transition-all duration-200 ${
        isDanger
          ? 'border-red-200 bg-red-50/80 hover:border-red-400 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:hover:border-red-600/50 dark:hover:bg-red-950/30'
          : isAction
            ? 'cursor-pointer border-zinc-200 bg-white/70 hover:border-red-300 hover:bg-red-50 dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:border-red-600/50 dark:hover:bg-zinc-800/40'
            : 'border-zinc-200 bg-white/70 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:border-zinc-700/50 dark:hover:bg-zinc-800/30'
      }`}
      onClick={isAction || isDanger ? onClick : undefined}
    >
      <div className="flex items-center gap-4">
        <div
          className={`transition-colors duration-200 ${
            isDanger
              ? 'text-red-500 dark:text-red-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {icon}
        </div>

        <span
          className={`tracking-wide ${
            isDanger
              ? 'text-red-700 dark:text-red-300'
              : 'text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {label}
        </span>
      </div>

      {isToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className={`relative h-6 w-12 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 ${
            enabled
              ? 'bg-red-600'
              : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span
            className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-300"
            style={{
              transform: enabled ? 'translateX(24px)' : 'translateX(0)'
            }}
          />
        </button>
      )}
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:shadow-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-0.5 w-8 bg-gradient-to-r from-red-600 to-transparent"></div>
        <h2 className="tracking-wide text-zinc-900 dark:text-white/90">{title}</h2>
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

export function SettingsTab() {
  const [settings, setSettings] = useState({
    newMovieAlerts: true,
    friendActivity: false,
    groupChat: true,
    newPost: false
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    clearServices();
    navigate('/');
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none">
        <div className="absolute top-20 left-10 h-32 w-32 rounded-full border-2 border-zinc-300 dark:border-zinc-700"></div>
        <div className="absolute top-40 right-20 h-24 w-24 rounded-full border-2 border-zinc-300 dark:border-zinc-700"></div>
        <div className="absolute bottom-32 left-1/4 h-40 w-40 rounded-full border-2 border-zinc-300 dark:border-zinc-700"></div>
      </div>

      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-100/40 via-transparent to-transparent dark:from-red-950/10"></div>

      <div className="relative z-10 w-full px-0 py-0">
        <div className="mb-12">
          <h1 className="relative inline-block text-2xl font-bold text-zinc-900 dark:text-white">
            Settings
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent"></div>
          </h1>

          <p className="mt-4 tracking-wide text-zinc-600 dark:text-zinc-400">
            Manage your account preferences and privacy settings
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
              icon={<MessageSquare size={20} />}
              label="Group Chat Notifications"
              enabled={settings.groupChat}
              onToggle={() => toggleSetting('groupChat')}
            />
            <SettingItem
              icon={<Sparkles size={20} />}
              label="New Post in the Community"
              enabled={settings.newPost}
              onToggle={() => toggleSetting('newPost')}
            />
          </SettingsSection>

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

        <div className="mt-16 flex items-center justify-center gap-2 opacity-30 dark:opacity-20">
          <div className="h-2 w-2 rounded-full bg-red-600"></div>
          <div className="h-2 w-2 rounded-full bg-red-600"></div>
          <div className="h-2 w-2 rounded-full bg-red-600"></div>
        </div>
      </div>
    </div>
  );
}