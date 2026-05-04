import { Suspense, useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bell, Heart, MessageCircle, Film, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from '../../assets/Reelette_White.png';
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
    {
      id: 'roulette',
      label: 'Reelette',
      path: '/home/roulette',
      imageLogo: reeletteLogo,
    },
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
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left — logo */}
            <NavLink
              to="/home/discover"
              className="relative flex h-14 min-w-0 shrink-0 items-center md:h-16 md:min-w-52 lg:min-w-72"
              aria-label="Go to Discover"
            >
              <img
                src={logoImage}
                alt="Reelette"
                className="h-8 w-auto md:h-10"
              />
            </NavLink>

            {/* Center — nav links */}
            <div className="flex min-w-0 flex-1 justify-center overflow-x-auto">
              <div className="flex items-center gap-4 whitespace-nowrap px-1 md:gap-8 lg:gap-12">
                {tabs.map((tab) => (
                  <NavLink
                    key={tab.id}
                    to={tab.path}
                    className={({ isActive }) =>
                      `group relative flex items-center py-2 text-sm font-medium transition-colors md:text-base ${
                        isActive
                          ? 'text-red-600'
                          : 'text-muted-foreground hover:text-foreground'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {tab.imageLogo ? (
                          <img
                            src={tab.imageLogo}
                            alt={tab.label}
                            className="h-9 w-9 md:h-12 md:w-12"
                          />
                        ) : (
                          <span>{tab.label}</span>
                        )}

                        <span
                          className={`absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 transition-opacity ${
                            isActive
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Right — notifications */}
            <div className="flex shrink-0 items-center justify-end md:min-w-16 lg:min-w-72">
              <div className="relative" ref={notifPanelRef}>
                <button
                  onClick={() => setNotifOpen((open) => !open)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  aria-label="Open notifications"
                >
                  <Bell className="h-5 w-5" />

                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 z-[100] flex max-h-[480px] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl">
                    <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                      <span className="text-sm font-semibold">
                        Notifications
                      </span>

                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs font-medium text-red-600 transition-colors hover:text-red-700 dark:hover:text-red-400"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12">
                          <Bell className="h-8 w-8 text-muted-foreground/60" />
                          <p className="text-sm text-muted-foreground">
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.notification_id}
                            onClick={() => handleMarkOneRead(notification)}
                            className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent ${
                              !notification.read ? 'bg-muted/60' : ''
                            }`}
                          >
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              {notifIcon(notification.type)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm leading-snug ${
                                  notification.read
                                    ? 'text-muted-foreground'
                                    : 'text-foreground'
                                }`}
                              >
                                {notifMessage(notification)}
                              </p>

                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {timeAgo(notification.created_at)}
                              </p>
                            </div>

                            {!notification.read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
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

      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}