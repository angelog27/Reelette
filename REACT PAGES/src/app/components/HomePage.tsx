import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, Heart, MessageCircle, Film, Users, UserPlus, Search, SlidersHorizontal,
  X, Star, ChevronDown, Bookmark, User, Tv, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import reeletteLogo from '../../assets/Reelette_LOGO_upscaled.png';
import {
  BASE_URL, getNotifications, markNotificationRead, markAllNotificationsRead,
  getUser, clearUser, clearServices, timeAgo,
  searchMovies, discoverMovies, getServices, SERVICE_DISPLAY,
  type AppNotification, type Movie,
} from '../services/api';
import { GENRES } from '../constants/genres';
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

const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
];

const YEAR_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '2020s', from: '2020', to: '' },
  { label: '2010s', from: '2010', to: '2019' },
  { label: '2000s', from: '2000', to: '2009' },
  { label: '1990s', from: '1990', to: '1999' },
  { label: 'Before 1990', from: '', to: '1989' },
];

export function HomePage() {
  const navigate = useNavigate();

  const tabs: TabLink[] = [
    { id: 'roulette', label: 'Reelette', path: '/home/roulette', imageLogo: reeletteLogo },
    { id: 'discover', label: 'Discover', path: '/home/discover', icon: Tv },
    { id: 'mystuff',  label: 'My Stuff', path: '/home/mystuff',  icon: Bookmark },
    { id: 'social',   label: 'Social',   path: '/home/social',   icon: Users },
  ];

  // ── Search state ────────────────────────────────────────────────
  const [navSearch, setNavSearch]         = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const searchRef                         = useRef<HTMLDivElement>(null);
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Filter state ────────────────────────────────────────────────
  const [filterOpen, setFilterOpen]           = useState(false);
  const [filterGenre, setFilterGenre]         = useState('');
  const [filterRating, setFilterRating]       = useState(0);
  const [filterYearIdx, setFilterYearIdx]     = useState(0);
  const [filterMyServices, setFilterMyServices] = useState(false);
  const filterRef                             = useRef<HTMLDivElement>(null);

  const hasActiveFilter = filterGenre !== '' || filterRating > 0 || filterYearIdx > 0 || filterMyServices;

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
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close filter dropdown on outside click (if not part of search group)
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

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

  function handleNavLogout() {
    clearUser();
    clearServices();
    localStorage.removeItem('user_id');
    navigate('/login');
  }

  // Real-time notifications via Firestore onSnapshot; fallback to 60s polling
  useEffect(() => {
    if (!currentUserId) return;
    let unsubscribe: (() => void) | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const applyNotifs = (notifs: AppNotification[]) => {
      const newUnread = notifs.filter(n => !n.read).length;
      if (prevUnreadRef.current > 0 && newUnread > prevUnreadRef.current) {
        const newest = notifs.find(n => !n.read);
        if (newest) toast(notifMessage(newest), { duration: 4000 });
      }
      prevUnreadRef.current = newUnread;
      setNotifications(notifs);
    };

    (async () => {
      const [{ signInFirebase }, { db }, { collection, query, orderBy, limit, onSnapshot }] =
        await Promise.all([
          import('../lib/firebase'),
          import('../lib/firebase'),
          import('firebase/firestore'),
        ]);

      const authed = await signInFirebase();
      if (authed) {
        const q = query(
          collection(db, 'users', currentUserId, 'notifications'),
          orderBy('created_at', 'desc'),
          limit(30),
        );
        unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
          const notifs: AppNotification[] = snapshot.docs.map(doc => ({
            notification_id: doc.id,
            ...doc.data(),
          } as AppNotification));
          applyNotifs(notifs);
        }, () => {});
      } else {
        const poll = async () => {
          const notifs = await getNotifications(currentUserId);
          applyNotifs(notifs);
        };
        poll();
        intervalId = setInterval(poll, 60_000);
      }
    })();

    return () => {
      unsubscribe?.();
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [currentUserId]);

  // ── Debounced search ────────────────────────────────────────────
  const runSearch = useCallback(async (query: string) => {
    const year = YEAR_OPTIONS[filterYearIdx];
    const services = getServices();
    const userServiceKeys = filterMyServices
      ? Object.fromEntries(Object.entries(services).filter(([, v]) => v))
      : undefined;

    if (!query.trim() && !filterGenre && !filterRating && !filterYearIdx && !filterMyServices) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    setSearchOpen(true);
    try {
      let results: Movie[];
      if (query.trim()) {
        results = await searchMovies(query.trim());
        if (filterGenre) results = results.filter(m => m.genres.includes(filterGenre));
        if (filterRating) results = results.filter(m => m.rating >= filterRating);
        if (filterMyServices && userServiceKeys) {
          const names = Object.entries(userServiceKeys)
            .filter(([, v]) => v)
            .map(([k]) => SERVICE_DISPLAY[k])
            .filter(Boolean);
          if (names.length) results = results.filter(m => names.includes(m.streamingService));
        }
      } else {
        results = await discoverMovies({
          genre_id: filterGenre
            ? (GENRES.find(g => g.label === filterGenre)?.value ?? '')
            : undefined,
          min_rating: filterRating || undefined,
          year_from: year?.from || undefined,
          year_to: year?.to || undefined,
          services_filter: userServiceKeys,
          sort_by: 'popularity',
        });
      }
      setSearchResults(results.slice(0, 10));
    } finally {
      setSearchLoading(false);
    }
  }, [filterGenre, filterRating, filterYearIdx, filterMyServices]);

  const handleSearchChange = (val: string) => {
    setNavSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 300);
  };

  useEffect(() => {
    if (navSearch.trim() || hasActiveFilter) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(navSearch), 300);
    }
  }, [filterGenre, filterRating, filterYearIdx, filterMyServices]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-white flex flex-col">

      {/* ── Top nav bar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center gap-2 px-5 h-[52px] bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#1C1C1C]">

        {/* Avatar circle — profile dropdown */}
        <div className="relative shrink-0 mr-3" ref={avatarMenuRef}>
          <button
            onClick={() => setAvatarMenuOpen(o => !o)}
            className="w-8 h-8 rounded-full overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-150 active:scale-95"
            title="Profile"
          >
            {navAvatarUrl ? (
              <img src={navAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center text-[10px] font-semibold text-white/60">
                {currentUser?.username?.slice(0, 2).toUpperCase() ?? '?'}
              </div>
            )}
          </button>

          {avatarMenuOpen && (
            <div className="absolute left-0 top-10 w-52 bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl z-[110] overflow-hidden panel-enter">
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

        {/* Nav tabs */}
        <nav className="flex items-center gap-0.5">
          {tabs.map(tab => (
            <NavLink key={tab.id} to={tab.path}>
              {({ isActive }) => (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'text-white bg-white/[0.08]'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                  style={{ fontSize: 13, fontWeight: 100, fontFamily: "SanFran, system-ui, sans-serif" }}
                >
                  {tab.imageLogo ? (
                    <img
                      src={tab.imageLogo}
                      alt={tab.label}
                      className="h-[15px] w-[15px] rounded shrink-0"
                      style={{ filter: isActive ? 'none' : 'brightness(0.35) saturate(0.2)', transition: 'filter 150ms ease-out' }}
                    />
                  ) : tab.icon ? (
                    <tab.icon className="w-[15px] h-[15px] shrink-0" />
                  ) : null}
                  <span>{tab.label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
        

        <div className="flex-1" />

          {/* Search + filter */}
          <div className="relative flex items-center gap-1" ref={searchRef}>
            <div className="relative" style={{ width: 210 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/40" />
              <input
                type="text"
                value={navSearch}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (navSearch.trim() || hasActiveFilter) setSearchOpen(true);
                }}
                placeholder="Search movies, shows..."
                className="w-full h-[35px] pl-9 pr-8 rounded-full text-sm text-white placeholder:text-white/35 bg-white/[0.08] border border-white/[0.12] focus:bg-white/[0.13] focus:border-white/[0.38] focus:outline-none transition-all duration-150"
              />
              {navSearch && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter button */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(o => !o)}
                title="Filter results"
                className="flex items-center justify-center w-[35px] h-[35px] rounded-full border transition active:scale-[0.97]"
                style={hasActiveFilter
                  ? { background: 'var(--reel-accent-hex)', borderColor: 'var(--reel-accent-hex)' }
                  : { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }
                }
              >
                <SlidersHorizontal className="w-4 h-4 text-white" />
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-[42px] w-72 bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl z-[110] p-4 flex flex-col gap-4 panel-enter">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Genre</p>
                    <div className="relative">
                      <select
                        value={filterGenre}
                        onChange={e => setFilterGenre(e.target.value)}
                        className="w-full appearance-none bg-white/[0.07] border border-white/[0.12] text-white text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-white/30"
                      >
                        <option value="">Any Genre</option>
                        {GENRES.map(g => (
                          <option key={g.value} value={g.label}>{g.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Min Rating</p>
                    <div className="flex gap-2 flex-wrap">
                      {RATING_OPTIONS.map(r => (
                        <button
                          key={r.value}
                          onClick={() => setFilterRating(r.value)}
                          className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                          style={filterRating === r.value
                            ? { background: 'var(--reel-accent-hex)', borderColor: 'var(--reel-accent-hex)', color: '#fff' }
                            : { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', color: '#9ca3af' }
                          }
                        >
                          {r.value > 0 && <Star className="inline w-2.5 h-2.5 fill-yellow-400 text-yellow-400 mr-0.5 -mt-0.5" />}
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Year</p>
                    <div className="flex flex-wrap gap-2">
                      {YEAR_OPTIONS.map((y, i) => (
                        <button
                          key={i}
                          onClick={() => setFilterYearIdx(i)}
                          className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                          style={filterYearIdx === i
                            ? { background: 'var(--reel-accent-hex)', borderColor: 'var(--reel-accent-hex)', color: '#fff' }
                            : { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', color: '#9ca3af' }
                          }
                        >
                          {y.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setFilterMyServices(v => !v)}
                      className="w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0"
                      style={{ background: filterMyServices ? 'var(--reel-accent-hex)' : 'rgba(255,255,255,0.15)' }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: filterMyServices ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </div>
                    <span className="text-sm text-gray-300">My streaming services only</span>
                  </label>

                  {hasActiveFilter && (
                    <button
                      onClick={() => {
                        setFilterGenre('');
                        setFilterRating(0);
                        setFilterYearIdx(0);
                        setFilterMyServices(false);
                      }}
                      className="text-xs hover:opacity-80 transition-opacity font-medium text-left"
                      style={{ color: 'var(--reel-accent)' }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Search results dropdown */}
            {searchOpen && (navSearch.trim() || hasActiveFilter) && (
              <div className="absolute right-0 top-[42px] w-[340px] max-h-[480px] flex flex-col bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl z-[100] overflow-hidden panel-enter">
                <div className="px-4 py-2.5 border-b border-[#2A2A2A] shrink-0 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {navSearch.trim() ? `Results for "${navSearch}"` : 'Filtered Results'}
                  </span>
                  {hasActiveFilter && (
                    <span className="text-[10px] font-medium" style={{ color: 'var(--reel-accent)' }}>Filters active</span>
                  )}
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
              <div className="absolute right-0 top-11 w-80 max-h-[480px] flex flex-col bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl z-[100] overflow-hidden panel-enter">
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

      </header>

      {/* Page content */}
      <main className="flex-1 px-6 py-0">
        <DiscoverProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center py-24 text-gray-500">Loading…</div>
          }>
            <Outlet />
          </Suspense>
        </DiscoverProvider>
      </main>

      {modalMovieId && (
        <MovieDetailModal movieId={modalMovieId} onClose={() => setModalMovieId(null)} />
      )}
    </div>
  );
}
