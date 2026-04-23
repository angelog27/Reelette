import { Suspense, useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bell, Heart, MessageCircle, Film, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from '../../assets/Reelette_NAME_upscaled.png';
import reeletteLogo from '../../assets/Reelette_LOGO_upscaled.png';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead, getUser, timeAgo,
  type AppNotification,
} from '../services/api';

type TabLink = {
  id: string;
  label: string;
  path: string;
  imageLogo?: string;
};

function notifMessage(n: AppNotification): string {
  const actor = n.actor_username ? `@${n.actor_username}` : 'Someone';
  switch (n.type) {
    case 'friend_request': return `${actor} sent you a friend request`;
    case 'friend_accept':  return `${actor} accepted your friend request`;
    case 'post_like':      return n.data.movie_title
      ? `${actor} liked your post about ${n.data.movie_title}`
      : `${actor} liked your post`;
    case 'post_reply':     return n.data.movie_title
      ? `${actor} replied to your post about ${n.data.movie_title}`
      : `${actor} replied to your post`;
    case 'friend_watched': return n.data.movie_title
      ? `${actor} watched ${n.data.movie_title}${n.data.user_rating ? ` · ${n.data.user_rating}/10` : ''}`
      : `${actor} watched a movie`;
    case 'group_invite':   return n.data.group_name
      ? `${actor} added you to the group "${n.data.group_name}"`
      : `${actor} added you to a group`;
    default: return 'New notification';
  }
}

function notifIcon(type: AppNotification['type']) {
  switch (type) {
    case 'friend_request':
    case 'friend_accept':  return <UserPlus className="w-4 h-4 text-blue-400" />;
    case 'post_like':      return <Heart className="w-4 h-4 text-red-400" />;
    case 'post_reply':     return <MessageCircle className="w-4 h-4 text-green-400" />;
    case 'friend_watched': return <Film className="w-4 h-4 text-purple-400" />;
    case 'group_invite':   return <Users className="w-4 h-4 text-yellow-400" />;
    default: return <Bell className="w-4 h-4 text-gray-400" />;
  }
}

export function HomePage() {
  const tabs: TabLink[] = [
    { id: 'discover', label: 'Discover', path: '/home/discover' },
    { id: 'mystuff', label: 'My Stuff', path: '/home/mystuff' },
    { id: 'roulette', label: 'Reelette', path: '/home/roulette', imageLogo: reeletteLogo },
    { id: 'social', label: 'Social', path: '/home/social' },
    { id: 'profile', label: 'Profile', path: '/home/profile' },
  ];

  const currentUser = getUser();
  const currentUserId = currentUser?.user_id ?? '';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  // Poll every 30 s for new notifications
  useEffect(() => {
    if (!currentUserId) return;
    const fetch = async () => {
      const notifs = await getNotifications(currentUserId);
      const newUnread = notifs.filter(n => !n.read).length;
      if (prevUnreadRef.current > 0 && newUnread > prevUnreadRef.current) {
        const newest = notifs.find(n => !n.read);
        if (newest) toast(notifMessage(newest), { duration: 4000 });
      }
      prevUnreadRef.current = newUnread;
      setNotifications(notifs);
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [currentUserId]);

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!currentUserId) return;
    await markAllNotificationsRead(currentUserId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    prevUnreadRef.current = 0;
  };

  const handleMarkOneRead = async (notif: AppNotification) => {
    if (notif.read || !currentUserId) return;
    await markNotificationRead(currentUserId, notif.notification_id);
    setNotifications(prev =>
      prev.map(n => n.notification_id === notif.notification_id ? { ...n, read: true } : n)
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <nav className="bg-black border-b border-[#C0392B]/30 sticky top-0 z-50 overflow-visible">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center">
            {/* Left — logo */}
            <div className="flex items-center" style={{ flex: 1 }}>
              <div className="relative flex items-center" style={{ height: '4rem' }}>
                <img src={logoImage} alt="Reelette" className="absolute h-10 w-auto" style={{ top: '60%', transform: 'translateY(-50%)', left: -10 }} />
              </div>
            </div>

            {/* Center — nav links */}
            <div className="flex items-center justify-center gap-12" style={{ flex: 1 }}>
              {tabs.map((tab) => (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  className={({ isActive }) =>
                    `group relative flex items-center transition-colors ${isActive
                      ? 'text-[#C0392B]'
                      : 'text-white hover:text-gray-300'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {tab.imageLogo ? (
                        <img src={tab.imageLogo} alt={tab.label} className="h-12 w-12" />
                      ) : (
                        tab.label
                      )}
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-[#C0392B] transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Right — notification bell */}
            <div className="flex items-center justify-end" style={{ flex: 1 }}>
            <div className="relative" ref={notifPanelRef}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#141414] border border-[#2A2A2A] hover:bg-[#1C1C1C] transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#C0392B] text-white text-[10px] font-bold rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 max-h-[480px] flex flex-col bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl z-[100] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A] shrink-0">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-[#C0392B] hover:text-[#E74C3C] transition-colors font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Bell className="w-8 h-8 text-gray-600" />
                        <p className="text-gray-500 text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n.notification_id}
                          onClick={() => handleMarkOneRead(n)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#1C1C1C] transition-colors border-b border-[#2A2A2A] last:border-0 ${!n.read ? 'bg-[#1A1A1A]' : ''}`}
                        >
                          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                            {notifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${n.read ? 'text-gray-400' : 'text-white'}`}>
                              {notifMessage(n)}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.read && (
                            <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[#C0392B]" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        <Suspense fallback={
          <div className="flex items-center justify-center py-24 text-gray-500">Loading…</div>
        }>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}