import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearUser, clearServices } from '../services/api';
import {
  Film,
  Users,
  Sparkles,
  MessageSquare,
  Lock,
  Mail,
  LogOut,
  Trash2,
  Bell,
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
  onClick,
}: SettingItemProps) {
  const isDanger = type === 'danger';
  const isAction = type === 'action';
  const isToggle = type === 'toggle';

  return (
    <div
      onClick={isAction || isDanger ? onClick : undefined}
      className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
        isDanger
          ? 'cursor-pointer border-red-500/30 bg-red-500/5 hover:border-red-500/50 hover:bg-red-500/10'
          : 'border-border bg-background/60 hover:border-red-500/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`transition-colors ${
            isDanger ? 'text-red-500' : 'text-muted-foreground'
          }`}
        >
          {icon}
        </div>
        <span
          className={`${
            isDanger ? 'text-red-500' : 'text-foreground'
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
          className={`relative h-6 w-12 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-600/30 ${
            enabled ? 'bg-red-600' : 'bg-muted border border-border'
          }`}
          aria-pressed={enabled}
        >
          <span
            className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300"
            style={{
              transform: enabled ? 'translateX(24px)' : 'translateX(0)',
            }}
          />
        </button>
      )}
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingsSection({ title, icon, children }: SettingsSectionProps) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-foreground uppercase tracking-wider">{title}</h2>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function SettingsTab() {
  const [settings, setSettings] = useState({
    newMovieAlerts: true,
    friendActivity: false,
    groupChat: true,
    newPost: false,
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    clearServices();
    navigate('/');
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40 -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent -z-10"></div>
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')] -z-10"></div>

      <div className="max-w-6xl mx-auto px-8 pt-12 pb-16">
        <div className="mb-12">
          <h1 className="text-2xl tracking-tight text-foreground relative inline-block">
            Settings
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)]"></div>
          </h1>
          <p className="text-muted-foreground mt-4">
            Manage your account preferences and privacy settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingsSection title="Notifications" icon={<Bell size={20} />}>
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

          <SettingsSection title="Security & Privacy" icon={<Lock size={20} />}>
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
      </div>
    </div>
  );
}