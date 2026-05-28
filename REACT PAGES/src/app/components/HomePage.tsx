import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, Heart, MessageCircle, Film, Users, UserPlus,
  X, Star, User, LogOut, Home, Search, Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BASE_URL, getNotifications, markNotificationRead, markAllNotificationsRead,
  getUser, clearUser, clearServices, timeAgo,
  searchMovies,
  type AppNotification, type Movie,
} from '../services/api';
import { MovieDetailModal } from './MovieDetailModal';
import { DiscoverProvider } from '../contexts/DiscoverContext';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';


type TabLink = { id: string; label: string; path: string; imageLogo?: string; icon?: React.ElementType };

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
    case 'group_message':  return n.data.group_name
      ? `${actor} in ${n.data.group_name}: ${n.data.message_preview ?? '…'}`
      : `${actor} sent a message in your group`;
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
    case 'group_message':  return <MessageCircle className="w-4 h-4 text-yellow-400" />;
    default: return <Bell className="w-4 h-4 text-gray-400" />;
  }
}


export function HomePage() {
  const navigate = useNavigate();

  const tabs: TabLink[] = [
    { id: 'roulette', label: 'Home',     path: '/home/spin',     icon: Home     },
    { id: 'discover', label: 'Discover', path: '/home/discover', icon: Film     },
    { id: 'social',   label: 'Social',   path: '/home/social',   icon: Users    },
    { id: 'mystuff',  label: 'My Stuff', path: '/home/mystuff',  icon: Star     },
    { id: 'profile',  label: 'Settings', path: '/home/profile',  icon: Settings },
  ];

  // ── Search state ────────────────────────────────────────────────
  const [navSearch, setNavSearch]         = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const searchRef                         = useRef<HTMLDivElement>(null);
  const searchInputRef                    = useRef<HTMLInputElement>(null);
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchVisible, setSearchVisible]     = useState(false);
  const [navHidden, setNavHidden]             = useState(false);
  const lastScrollY                           = useRef(0);
  const scrollStopTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modal for search results ────────────────────────────────────
  const [modalMovieId, setModalMovieId] = useState<string | null>(null);

  // ── Notifications ───────────────────────────────────────────────
  const currentUser    = getUser();
  const currentUserId  = currentUser?.user_id ?? '';
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen]         = useState(false);
  const notifPanelRef                     = useRef<HTMLDivElement>(null);
  const prevUnreadRef                     = useRef(0);

  // ── Avatar dropdown ─────────────────────────────────────────────
  const [navAvatarUrl,  setNavAvatarUrl]  = useState('');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef                     = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close notif panel on outside click
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

  // Fetch avatar URL for nav circle
  useEffect(() => {
    if (!currentUserId) return;
    fetch(`${BASE_URL}/user/${currentUserId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.avatarUrl) setNavAvatarUrl(d.avatarUrl); })
      .catch(() => {});
  }, [currentUserId]);

  // Hide nav on scroll down, reveal on scroll up or stop
  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;
      if (delta > 6 && current > 60) setNavHidden(true);
      else if (delta < -6) setNavHidden(false);
      lastScrollY.current = current;
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
      scrollStopTimer.current = setTimeout(() => setNavHidden(false), 1000);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarMenuOpen]);

  // ⌘K / Ctrl+K focuses the search bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function handleNavLogout() {
    clearUser();
    clearServices();
    localStorage.removeItem('user_id');
    navigate('/login');
  }

  // ── Notification cache helpers ───────────────────────────────────
  const notifCacheKey  = `rl_notifs:${currentUserId}`;
  const notifSinceKey  = `rl_notifs_since:${currentUserId}`;

  const loadNotifCache = (): AppNotification[] => {
    try { return JSON.parse(localStorage.getItem(notifCacheKey) || '[]'); } catch { return []; }
  };

  const saveNotifCache = (notifs: AppNotification[]) => {
    try {
      const trimmed = notifs.slice(0, 50);
      localStorage.setItem(notifCacheKey, JSON.stringify(trimmed));
      if (trimmed.length > 0 && trimmed[0].created_at) {
        localStorage.setItem(notifSinceKey, trimmed[0].created_at as string);
      }
    } catch {}
  };

  const mergeNotifs = (base: AppNotification[], incoming: AppNotification[]): AppNotification[] => {
    const map = new Map(base.map(n => [n.notification_id, n]));
    for (const n of incoming) map.set(n.notification_id, n);
    return [...map.values()].sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at))
    );
  };

  // Real-time notifications: load cache instantly, then subscribe only to NEW docs
  useEffect(() => {
    if (!currentUserId) return;
    let unsubscribe: (() => void) | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // 1. Populate state from localStorage immediately — zero reads
    const cached = loadNotifCache();
    if (cached.length > 0) {
      prevUnreadRef.current = cached.filter(n => !n.read).length;
      setNotifications(cached);
    }

    const applyIncoming = (incoming: AppNotification[]) => {
      if (incoming.length === 0) return;
      const merged = mergeNotifs(loadNotifCache(), incoming);
      const newUnread = merged.filter(n => !n.read).length;
      if (prevUnreadRef.current > 0 && newUnread > prevUnreadRef.current) {
        const newest = incoming.find(n => !n.read);
        if (newest) toast(notifMessage(newest), { duration: 4000 });
      }
      prevUnreadRef.current = newUnread;
      setNotifications(merged);
      saveNotifCache(merged);
    };

    (async () => {
      const [{ signInFirebase }, { db }, firestoreModule] =
        await Promise.all([
          import('../lib/firebase'),
          import('../lib/firebase'),
          import('firebase/firestore'),
        ]);
      const { collection, query, orderBy, limit, onSnapshot, where, Timestamp } = firestoreModule;

      const authed = await signInFirebase();
      if (authed) {
        // 2. Build query — if we have cached data, only fetch docs newer than the newest cached one
        const since = localStorage.getItem(notifSinceKey);
        let q;
        if (since && cached.length > 0) {
          try {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate.getTime())) {
              q = query(
                collection(db, 'users', currentUserId, 'notifications'),
                orderBy('created_at', 'desc'),
                where('created_at', '>', Timestamp.fromDate(sinceDate)),
              );
            }
          } catch { /* fall through to full query */ }
        }
        if (!q) {
          q = query(
            collection(db, 'users', currentUserId, 'notifications'),
            orderBy('created_at', 'desc'),
            limit(30),
          );
        }

        unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
          const incoming: AppNotification[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              notification_id: doc.id,
              ...data,
              // Normalize Firestore Timestamp → ISO string for consistent serialization
              created_at: data.created_at?.toDate?.()?.toISOString?.() ?? data.created_at ?? new Date().toISOString(),
            } as AppNotification;
          });
          applyIncoming(incoming);
        }, () => {});
      } else {
        // Fallback: REST polling, still merges with cache
        const poll = async () => {
          const notifs = await getNotifications(currentUserId);
          applyIncoming(notifs);
        };
        poll();
        intervalId = setInterval(poll, 60_000);
      }
    })();

    return () => {
      unsubscribe?.();
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced search ────────────────────────────────────────────
  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    try {
      const results = await searchMovies(query.trim());
      setSearchResults(results.slice(0, 10));
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (val: string) => {
    setNavSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 1000);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && navSearch.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearchOpen(false);
      navigate(`/home/search?q=${encodeURIComponent(navSearch.trim())}`);
    }
  };

  const clearSearch = () => {
    setNavSearch('');
    setSearchResults([]);
    setSearchOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!currentUserId) return;
    await markAllNotificationsRead(currentUserId);
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifCache(updated);
      return updated;
    });
    prevUnreadRef.current = 0;
  };

  const handleMarkOneRead = async (notif: AppNotification) => {
    if (notif.read || !currentUserId) return;
    await markNotificationRead(currentUserId, notif.notification_id);
    setNotifications(prev => {
      const updated = prev.map(n => n.notification_id === notif.notification_id ? { ...n, read: true } : n);
      saveNotifCache(updated);
      return updated;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-white flex flex-col">

      {/* ── Top nav bar ──────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 flex items-center px-4 sm:px-5 h-[62px] bg-black/30 backdrop-blur-xl border-b border-black/50 transition-transform duration-300 ease-in-out ${navHidden ? '-translate-y-full' : 'translate-y-0'}`}>

        {/* ── Left: avatar + wordmark ── */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative shrink-0" ref={avatarMenuRef}>
            <button
              onClick={() => setAvatarMenuOpen(o => !o)}
              className="w-9 h-9 rounded-full overflow-hidden border border-white/10 hover:border-white/30 transition duration-150 active:scale-[0.97]"
              title="Profile"
            >
              {navAvatarUrl ? (
                <img src={navAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center text-[11px] font-semibold text-white/60">
                  {currentUser?.username?.slice(0, 2).toUpperCase() ?? '?'}
                </div>
              )}
            </button>

            {avatarMenuOpen && (
              <div className="absolute left-0 top-11 w-52 bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl z-[110] overflow-hidden panel-enter">
                <div className="px-4 py-3 border-b border-[#2A2A2A]">
                  <p className="text-white text-sm font-semibold truncate">
                    {(currentUser as { displayName?: string; username?: string })?.displayName || currentUser?.username || 'User'}
                  </p>
                  {currentUser?.username && (
                    <p className="text-zinc-500 text-xs">@{currentUser.username}</p>
                  )}
                </div>
                <NavLink to="/home/profile" onClick={() => setAvatarMenuOpen(false)}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer">
                    <User className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-300">Profile & settings</span>
                  </div>
                </NavLink>
                <div className="border-t border-[#2A2A2A]" />
                <button
                  onClick={handleNavLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">Log out</span>
                </button>
              </div>
            )}
          </div>

          <span style={{ fontFamily: 'SanFran, system-ui, sans-serif', fontWeight: 100, fontSize: 17, letterSpacing: '0.04em' }}
            className="text-white select-none">
            Reelette
          </span>
        </div>

        {/* ── Center: tabs (absolutely centered) — desktop only ── */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
          {tabs.map(tab => (
            <NavLink key={tab.id} to={tab.path}>
              {({ isActive }) => (
                <div className="relative flex flex-col items-center gap-1 px-4 py-2 cursor-pointer select-none transition-all duration-150 whitespace-nowrap group"
                  style={{ fontFamily: 'SanFran, system-ui, sans-serif', fontWeight: 100 }}>
                  <div className={`flex items-center gap-2 transition-colors duration-150 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-200'}`}>
                    {tab.icon && <tab.icon className="w-[22px] h-[22px] shrink-0" />}
                    <span style={{ fontSize: 15 }}>{tab.label}</span>
                  </div>
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--reel-accent-hex)' }} />}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {/* ── Right: search + filter ── */}
        <div className="flex items-center gap-2" ref={searchRef}>

          {/* Expanding search */}
          <div className="flex items-center gap-2">
            {searchVisible && (
              <label style={{
                position: 'relative', display: 'block', borderRadius: '10px',
                border: '2px solid #5e5757', padding: '6px 44px 6px 12px',
                boxShadow: '8px 8px 30px var(--reel-accent-hex), -8px -8px 30px rgba(255,255,255,0.2)',
                cursor: 'text',
              }}>
                <span className="hidden md:inline" style={{
                  position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)',
                  color: '#c5c5c5', backgroundColor: '#5e5757', padding: '3px 5px',
                  borderRadius: '6px', fontSize: '11px', lineHeight: 1,
                  userSelect: 'none', pointerEvents: 'none',
                }}>⌘K</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={navSearch}
                  onChange={e => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => { if (navSearch.trim()) setSearchOpen(true); }}
                  placeholder="Search movies, shows..."
                  autoFocus
                  style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'rgb(190,195,200)', width: 'min(200px, calc(100vw - 190px))' }}
                />
                {navSearch && (
                  <button onClick={clearSearch} className="absolute right-10 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </label>
            )}
            <button
              onClick={() => {
                // On mobile go straight to the dedicated Search tab
                if (window.innerWidth < 768) { setSearchOpen(false); navigate('/home/search'); return; }
                setSearchVisible(v => !v);
                if (!searchVisible) setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full border transition active:scale-[0.97]"
              style={searchVisible ? { background: 'color-mix(in srgb, var(--reel-accent-hex) 20%, transparent)', borderColor: 'var(--reel-accent-hex)' } : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
              title="Search (⌘K)"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Bell */}
          <div className="relative shrink-0" ref={notifPanelRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.09] transition active:scale-[0.97]"
            >
              <Bell className="w-4 h-4 text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-reel-accent text-white text-[9px] font-bold rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1rem)] max-h-[60vh] flex flex-col bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl z-[100] overflow-hidden panel-enter">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A] shrink-0">
                  <span className="text-sm font-semibold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--reel-accent)' }}
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
                        {!n.read && <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-reel-accent" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Search results dropdown */}
            {searchOpen && navSearch.trim() && (
              <div className="absolute right-0 top-[42px] w-[340px] max-w-[calc(100vw-1rem)] max-h-[480px] flex flex-col bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl z-[100] overflow-hidden panel-enter">
                <div className="px-4 py-2.5 border-b border-[#2A2A2A] shrink-0">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Results for "{navSearch}"
                  </span>
                </div>
                <div className="overflow-y-auto flex-1">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-10 text-gray-500 text-sm">Searching…</div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-gray-500 text-sm">No results found</div>
                  ) : (
                    searchResults.map(movie => (
                      <button
                        key={movie.id}
                        onClick={() => { setModalMovieId(movie.id); setSearchOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1C1C1C] transition-colors border-b border-[#2A2A2A] last:border-0 text-left"
                      >
                        {movie.poster ? (
                          <img src={movie.poster} alt={movie.title} className="w-10 h-14 rounded object-cover shrink-0" loading="lazy" />
                        ) : (
                          <div className="w-10 h-14 rounded bg-[#2A2A2A] shrink-0 flex items-center justify-center">
                            <Film className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium line-clamp-1">{movie.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {movie.year > 0 && <span className="text-xs text-gray-500">{movie.year}</span>}
                            {movie.rating > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                                <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                                {movie.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {movie.streamingService && (
                            <span className="text-[10px] text-gray-600 mt-0.5 block line-clamp-1">{movie.streamingService}</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>


      </header>

      {/* Page content — extra bottom padding on mobile so bottom nav doesn't cover content */}
      <main className="flex-1 px-3 md:px-6 py-0 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 overflow-x-hidden">
        <DiscoverProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center py-24 text-gray-500">Loading…</div>
          }>
            <Outlet />
          </Suspense>
        </DiscoverProvider>
      </main>

      {/* ── Mobile bottom nav bar — hidden on md+ ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/97 backdrop-blur-md border-t border-white/[0.06]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around">
          {tabs.map(tab => (
            <NavLink key={tab.id} to={tab.path} className="flex-1">
              {({ isActive }) => (
                <div className="flex flex-col items-center justify-center py-3 min-h-[52px]">
                  {tab.icon && (
                    <tab.icon
                      className={`w-6 h-6 transition-colors duration-150 ${isActive ? '' : 'text-zinc-500'}`}
                      style={isActive ? { color: 'var(--reel-accent-hex)' } : {}}
                    />
                  )}
                  {isActive && (
                    <span className="w-1 h-1 rounded-full mt-1" style={{ background: 'var(--reel-accent-hex)' }} />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {modalMovieId && (
        <MovieDetailModal movieId={modalMovieId} onClose={() => setModalMovieId(null)} />
      )}
    </div>
  );
}
