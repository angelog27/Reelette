import { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageCircle, Film, Check, MessagesSquare } from 'lucide-react';
import {
  getNotifications,
  markAllNotificationsRead,
  getTrendingMovies,
  getUser,
  timeAgo,
} from '../services/api';
import type { Notification, Movie } from '../services/api';

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const user = getUser();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  async function fetchNotifications() {
    if (!user) return;
    try {
      const notifs = await getNotifications(user.user_id);
      setNotifications(notifs);
    } catch {
      // silently fail — bell will just show 0
    }
  }

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await fetchNotifications();
      if (trendingMovies.length === 0) {
        try {
          const movies = await getTrendingMovies('week');
          setTrendingMovies(movies.slice(0, 5));
        } catch {
          // leave empty
        }
      }
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllNotificationsRead(user.user_id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function notificationText(n: Notification): string {
    if (n.type === 'like') return `${n.from_username} liked your review of ${n.movie_title}`;
    if (n.type === 'reply') return `${n.from_username} replied to your review of ${n.movie_title}`;
    if (n.type === 'message') {
      return n.conv_name
        ? `${n.from_username} sent a message in ${n.conv_name}`
        : `${n.from_username} sent you a message`;
    }
    return n.message;
  }

  function notificationIcon(type: Notification['type']) {
    if (type === 'like') return <Heart size={13} className="text-red-500 flex-shrink-0" />;
    if (type === 'message') return <MessagesSquare size={13} className="text-emerald-400 flex-shrink-0" />;
    return <MessageCircle size={13} className="text-blue-400 flex-shrink-0" />;
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative p-2 text-zinc-400 hover:text-white transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-white text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* Scrollable content */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center text-zinc-500 text-sm">Loading…</div>
            ) : (
              <>
                {/* Post interaction notifications */}
                {notifications.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-zinc-800/40">
                      <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Activity</span>
                    </div>
                    {notifications.map((n) => (
                      <div
                        key={n.notification_id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors ${
                          !n.read ? 'bg-zinc-800/20' : ''
                        }`}
                      >
                        <div className="mt-0.5">{notificationIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-300 leading-snug">{notificationText(n)}</p>
                          <p className="text-xs text-zinc-500 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Trending movies this week */}
                {trendingMovies.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-zinc-800/40">
                      <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Trending This Week</span>
                    </div>
                    {trendingMovies.map((movie) => (
                      <div
                        key={movie.id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors"
                      >
                        <Film size={13} className="text-zinc-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-300 truncate">{movie.title}</p>
                          <p className="text-xs text-zinc-500">
                            {movie.year}
                            {movie.streamingService ? ` · ${movie.streamingService}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {notifications.length === 0 && trendingMovies.length === 0 && (
                  <div className="py-12 text-center">
                    <Bell size={24} className="mx-auto text-zinc-700 mb-3" />
                    <p className="text-zinc-500 text-sm">No notifications yet</p>
                    <p className="text-zinc-600 text-xs mt-1">
                      Likes and replies on your posts will show up here
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
