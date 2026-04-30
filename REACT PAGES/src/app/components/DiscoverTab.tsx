import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Star, Bookmark, BookmarkCheck, Info, Layers, Sparkles } from 'lucide-react';
import { MovieDetailModal } from './MovieDetailModal';
import {
  discoverMovies, watchMovieLater, removeFromWatchLater, getUser, getServices,
  getFeed, getFriends, getMovieDetails, getUserPublicProfile,
} from '../services/api';
import type { Movie, WatchedMovie } from '../services/api';
import { PROVIDER_LOGOS } from '../constants/providers';
import { useDiscover, type ProviderRows } from '../contexts/DiscoverContext';

// ── Constants ─────────────────────────────────────────────────────

const PROVIDER_TABS = [
  { id: 'all',           label: 'All' },
  { id: 'Netflix',       label: 'Netflix' },
  { id: 'Disney+',       label: 'Disney+' },
  { id: 'Hulu',          label: 'Hulu' },
  { id: 'Max',           label: 'Max' },
  { id: 'Prime Video',   label: 'Prime Video' },
  { id: 'Paramount+',    label: 'Paramount+' },
  { id: 'Apple TV+',     label: 'Apple TV+' },
  { id: 'Peacock',       label: 'Peacock' },
];

const PROVIDER_COLOR: Record<string, string> = {
  'all':          '#7C5DBD',
  'Netflix':      '#E50914',
  'Disney+':      '#1A4DB5',
  'Hulu':         '#1CE783',
  'Max':          '#6C2BD9',
  'Prime Video':  '#00A8E1',
  'Paramount+':   '#0064FF',
  'Apple TV+':    '#8E8E93',
  'Peacock':      '#F5C518',
};

const PROVIDER_KEY: Record<string, string> = {
  'Netflix':      'netflix',
  'Disney+':      'disneyPlus',
  'Hulu':         'hulu',
  'Max':          'hboMax',
  'Prime Video':  'amazonPrime',
  'Paramount+':   'paramount',
  'Apple TV+':    'appleTV',
  'Peacock':      'peacock',
};

const ROW_LIMIT = 14;
const CARD_W    = 156;
const SKELETON_COUNT = 8;

// ── Helpers ───────────────────────────────────────────────────────

function watchedToMovie(w: WatchedMovie): Movie {
  return {
    id: w.movie_id, title: w.title, year: w.year,
    genres: w.genres ?? [], rating: w.tmdb_rating ?? 0,
    poster: w.poster ?? '', streamingService: w.services?.[0] ?? '',
  };
}

// ── Skeleton UI ───────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 animate-pulse" style={{ width: CARD_W }}>
      <div className="rounded-md bg-[#1e1e1e]" style={{ aspectRatio: '2/3' }} />
      <div className="mt-2 px-0.5">
        <div className="h-3 bg-[#1e1e1e] rounded w-4/5 mb-1.5" />
        <div className="h-2.5 bg-[#1e1e1e] rounded w-2/5" />
      </div>
    </div>
  );
}

function SkeletonRow({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-[15px] font-bold text-white mb-3"
        style={{ color: '#e8e8e8', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <div className="flex gap-2">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

// ── Compact landscape card ────────────────────────────────────────

function CompactCard({ movie, onClick }: { movie: Movie; onClick: () => void }) {
  return (
    <div
      className="cursor-pointer group flex-shrink-0"
      style={{ width: CARD_W }}
      onClick={onClick}
    >
      <div
        className="relative overflow-hidden rounded-md bg-[#1a1a1a]"
        style={{ aspectRatio: '2/3' }}
      >
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px] text-center px-2">
            {movie.title}
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
        {movie.streamingService && PROVIDER_LOGOS[movie.streamingService] && (
          <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md overflow-hidden bg-black/60">
            <img src={PROVIDER_LOGOS[movie.streamingService]} alt={movie.streamingService} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-white text-[13px] font-medium line-clamp-1 leading-snug">{movie.title}</p>
        {movie.year > 0 && <p className="text-gray-500 text-[11px] mt-0.5">{movie.year}</p>}
        {movie.rating > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="text-gray-400 text-[11px]">{movie.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Movie Row — shows skeleton when movies is null ────────────────

function MovieRow({ title, movies, onMovieClick }: {
  title: string;
  movies: Movie[] | null;
  onMovieClick: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (movies === null) return <SkeletonRow title={title} />;
  if (!movies.length) return null;

  const scroll = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -(CARD_W * 4) : (CARD_W * 4), behavior: 'smooth' });

  return (
    <div className="mb-8">
      <h2 className="text-[15px] font-bold text-white mb-3"
        style={{ color: '#e8e8e8', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <div className="relative group">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-l-md"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.8), transparent)' }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div
          ref={scrollRef}
          className="hide-scrollbar flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) window.scrollBy(0, e.deltaY);
          }}
        >
          {movies.map(movie => (
            <CompactCard key={movie.id} movie={movie} onClick={() => onMovieClick(movie.id)} />
          ))}
        </div>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-r-md"
          style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.8), transparent)' }}
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}

// ── Personalized Hero ─────────────────────────────────────────────

type PersonalizedSlot =
  | { kind: 'friend';      movie: Movie; friendName: string; friendAvatar?: string; friendRating: number; friendReview: string }
  | { kind: 'recommended'; movie: Movie }
  | { kind: 'tonight';     movie: Movie }
  | { kind: 'topPick';     movie: Movie; yourRating: number };

const SLOT_META: Record<PersonalizedSlot['kind'], { label: string; color: string }> = {
  friend:      { label: 'Your Friends Are Watching', color: '#9B7BD7' },
  recommended: { label: 'Recommended for You',       color: '#9B7BD7' },
  tonight:     { label: "Tonight's Pick",             color: 'rgba(255,255,255,0.75)' },
  topPick:     { label: 'Your Top Pick',              color: '#fbbf24' },
};

function PersonalizedHeroSkeleton() {
  return (
    <div className="full-bleed relative animate-pulse bg-[#141414]" style={{ height: 520, marginTop: -32 }}>
      <div className="absolute left-10 md:left-16 bottom-14 flex flex-col gap-3">
        <div className="h-3 w-40 rounded bg-[#222]" />
        <div className="h-14 w-80 rounded bg-[#222]" />
        <div className="h-4 w-40 rounded bg-[#222]" />
        <div className="h-10 w-[28rem] rounded bg-[#222]" />
        <div className="flex gap-3 mt-2"><div className="h-10 w-28 rounded bg-[#222]" /></div>
      </div>
    </div>
  );
}

function PersonalizedHero({ slots, onOpenModal, onToggleWatchlist, watchlistIds, hasUser }: {
  slots: PersonalizedSlot[];
  onOpenModal: (id: string) => void;
  onToggleWatchlist: (movie: Movie) => void;
  watchlistIds: string[];
  hasUser: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = slots.length;

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (total <= 1) return;
    intervalRef.current = setInterval(() => setCurrent(c => (c + 1) % total), 8000);
  }, [total]);

  useEffect(() => { startInterval(); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, [startInterval]);

  if (!slots.length) return null;

  const slot = slots[Math.min(current, total - 1)];
  const { label, color } = SLOT_META[slot.kind];
  const isInWatchlist = watchlistIds.includes(slot.movie.id);

  return (
    <div className="full-bleed relative overflow-hidden" style={{ height: 520, marginTop: -32 }}>
      {/* Backdrop layers */}
      {slots.map((s, i) => {
        const sBg = s.movie.backdrop || s.movie.poster || '';
        const sBlur = !s.movie.backdrop && !!s.movie.poster;
        return (
          <div key={i} className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}>
            {sBg
              ? <img src={sBg} alt={s.movie.title} className="w-full h-full object-cover"
                  style={sBlur ? { filter: 'blur(18px) brightness(0.65) saturate(1.3)', transform: 'scale(1.08)' } : undefined}
                  loading={i === 0 ? 'eager' : 'lazy'} />
              : <div className="w-full h-full bg-[#141414]" />
            }
          </div>
        );
      })}

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ zIndex: 2, background: 'linear-gradient(to right, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.70) 38%, rgba(0,0,0,0.25) 62%, rgba(0,0,0,0.05) 100%)' }} />
      <div className="absolute inset-0" style={{ zIndex: 2, background: 'linear-gradient(to top, rgba(9,9,9,1) 0%, rgba(9,9,9,0.55) 22%, transparent 55%)' }} />
      <div className="absolute inset-0" style={{ zIndex: 2, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 18%)' }} />

      {/* Content row */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-10 md:px-16 pb-12 gap-10" style={{ zIndex: 3 }}>

        {/* ── Left: movie info ── */}
        <div className="flex flex-col min-w-0 max-w-[520px]">
          {/* Slot label */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-px w-8 rounded-full" style={{ background: color }} />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color }}>{label}</span>
          </div>

          {/* Genre chips */}
          {slot.movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {slot.movie.genres.slice(0, 3).map(g => (
                <span key={g} className="text-xs px-2.5 py-0.5 rounded-sm font-medium"
                  style={{ background: 'rgba(124,93,189,0.55)', color: '#fff' }}>{g}</span>
              ))}
            </div>
          )}

          <h1 className="font-black text-white leading-none drop-shadow-2xl mb-3"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 4rem)', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
            {slot.movie.title}
          </h1>

          <div className="flex items-center gap-3 mb-3 text-sm">
            {slot.movie.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-white font-semibold">{slot.movie.rating.toFixed(1)}</span>
              </span>
            )}
            {slot.movie.rating > 0 && slot.movie.year > 0 && <span className="text-gray-400">•</span>}
            {slot.movie.year > 0 && <span className="text-gray-300">{slot.movie.year}</span>}
          </div>

          {slot.movie.overview && (
            <p className="text-gray-300 text-sm leading-relaxed mb-5 line-clamp-2"
              style={{ maxWidth: '36rem', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              {slot.movie.overview}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={() => onOpenModal(slot.movie.id)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white/90 text-zinc-900 font-semibold rounded-lg text-sm hover:bg-white transition-colors duration-150">
              <Info className="w-4 h-4" /> More Info
            </button>
            {hasUser && (
              <button onClick={() => onToggleWatchlist(slot.movie)}
                className="flex items-center gap-2 px-5 py-2.5 font-semibold rounded-lg text-sm transition-colors duration-150"
                style={isInWatchlist ? { background: '#7C5DBD', color: '#fff' } : { background: 'rgba(109,109,110,0.7)', color: '#fff' }}>
                {isInWatchlist ? <><BookmarkCheck className="w-4 h-4" /> In Watchlist</> : <><Bookmark className="w-4 h-4" /> Watchlist</>}
              </button>
            )}
          </div>
        </div>

        {/* ── Right: context card ── */}
        <div className="hidden md:block shrink-0">
          {slot.kind === 'friend' && (
            <div className="bg-black/55 backdrop-blur-sm rounded-2xl p-5 border border-white/10 w-[280px]">
              <div className="flex items-center gap-3 mb-4">
                {slot.friendAvatar
                  ? <img src={slot.friendAvatar} className="w-11 h-11 rounded-full object-cover border border-white/20 shrink-0" alt="" />
                  : <div className="w-11 h-11 rounded-full bg-[#2A2A2A] border border-white/10 flex items-center justify-center text-sm font-bold text-white/70 shrink-0">
                      {slot.friendName.slice(0, 2).toUpperCase()}
                    </div>
                }
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">@{slot.friendName}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < Math.round(slot.friendRating / 2) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-700 text-gray-700'}`} />
                    ))}
                    <span className="text-yellow-400 text-[11px] font-semibold ml-1.5">{slot.friendRating.toFixed(1)}/10</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed line-clamp-5 italic">"{slot.friendReview}"</p>
            </div>
          )}

          {slot.kind === 'recommended' && (
            <div className="bg-black/55 backdrop-blur-sm rounded-2xl p-5 border border-white/10 w-[240px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(155,123,215,0.2)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#9B7BD7]" />
                </div>
                <span className="text-[#9B7BD7] text-xs font-semibold uppercase tracking-widest">Just for You</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Picked from your watch history and the films you've rated highest.
              </p>
            </div>
          )}

          {slot.kind === 'topPick' && (
            <div className="bg-black/55 backdrop-blur-sm rounded-2xl p-5 border border-white/10 w-[240px]">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 shrink-0" />
                <span className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">Your Rating</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-black" style={{ fontSize: '3rem', lineHeight: 1 }}>{slot.yourRating.toFixed(1)}</span>
                <span className="text-gray-500 text-xl">/10</span>
              </div>
              <p className="text-gray-400 text-xs mt-2">Your highest-rated film of all time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Slot indicator dots */}
      {total > 1 && (
        <div className="absolute bottom-4 right-10 flex gap-1.5" style={{ zIndex: 3 }}>
          {slots.map((_, i) => (
            <button key={i} onClick={() => { setCurrent(i); startInterval(); }}
              className="h-[3px] rounded-full transition-all duration-300"
              style={{ width: i === current ? 20 : 8, background: i === current ? '#9B7BD7' : 'rgba(255,255,255,0.35)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── DiscoverTab ───────────────────────────────────────────────────

export function DiscoverTab() {
  const user = getUser();

  // All catalogue + user rows come from the persistent context
  const {
    heroMovies, trendingMovies, newReleases, topRated, classics,
    actionMovies, comedyMovies, horrorMovies, scifiMovies, acclaimed, comingSoon,
    recommended, userWatched, recentSpins,
    watchlistIds, setWatchlistIds,
    providerCache, cacheProvider,
  } = useDiscover();

  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [activeProvider,  setActiveProvider]   = useState('all');
  const [hoveredProvider, setHoveredProvider]  = useState<string | null>(null);

  // ── Friend hero slot ───────────────────────────────────────────
  const [friendSlot, setFriendSlot] = useState<Extract<PersonalizedSlot, { kind: 'friend' }> | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getFeed(15), getFriends(user.user_id)])
      .then(async ([posts, friends]) => {
        if (cancelled) return;
        const friendIds = new Set(friends.map((f: { friend_id: string }) => f.friend_id));
        const post = posts.find(p => friendIds.has(p.user_id) && !!p.movie_id && p.message.trim().length > 10);
        if (!post) return;
        let backdrop = post.movie_poster ?? '';
        try { const d = await getMovieDetails(post.movie_id); backdrop = (d.backdrop as string) || backdrop; } catch {}
        let friendAvatar: string | undefined;
        try { const pr = await getUserPublicProfile(post.user_id); friendAvatar = pr?.avatarUrl; } catch {}
        if (!cancelled) setFriendSlot({
          kind: 'friend',
          movie: { id: post.movie_id, title: post.movie_title, year: 0, genres: [], rating: post.rating ?? 0, poster: post.movie_poster ?? '', backdrop, streamingService: '' },
          friendName: post.username, friendAvatar, friendRating: post.rating ?? 0, friendReview: post.message,
        });
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [userServices, setUserServices] = useState<Record<string, boolean>>(getServices);
  useEffect(() => {
    const handler = () => setUserServices(getServices());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const visibleProviderTabs = PROVIDER_TABS.filter(
    (p: { id: string; label: string }) =>
      p.id === 'all' || (PROVIDER_KEY[p.id] && userServices[PROVIDER_KEY[p.id]])
  );

  // ── Provider rows ──────────────────────────────────────────────
  const [providerLoading,  setProviderLoading]  = useState(false);
  const [providerPopular,  setProviderPopular]  = useState<Movie[]>([]);
  const [providerTopRated, setProviderTopRated] = useState<Movie[]>([]);
  const [providerNew,      setProviderNew]      = useState<Movie[]>([]);

  useEffect(() => {
    if (activeProvider === 'all') return;
    // Serve from context cache if we've fetched this provider before
    const cached = providerCache[activeProvider];
    if (cached) {
      setProviderPopular(cached.popular);
      setProviderTopRated(cached.topRated);
      setProviderNew(cached.newMovies);
      return;
    }
    const key = PROVIDER_KEY[activeProvider];
    if (!key) return;
    setProviderLoading(true);
    const sf = { [key]: true };
    Promise.all([
      discoverMovies({ services_filter: sf, sort_by: 'popularity' }).catch(() => [] as Movie[]),
      discoverMovies({ services_filter: sf, sort_by: 'rating'     }).catch(() => [] as Movie[]),
      discoverMovies({ services_filter: sf, sort_by: 'newest'     }).catch(() => [] as Movie[]),
    ]).then(([pop, top, newM]) => {
      const rows: ProviderRows = {
        popular:   pop.slice(0, ROW_LIMIT),
        topRated:  top.slice(0, ROW_LIMIT),
        newMovies: newM.slice(0, ROW_LIMIT),
      };
      cacheProvider(activeProvider, rows);
      setProviderPopular(rows.popular);
      setProviderTopRated(rows.topRated);
      setProviderNew(rows.newMovies);
      setProviderLoading(false);
    });
  }, [activeProvider, providerCache, cacheProvider]);

  // ── Derived ────────────────────────────────────────────────────
  const top10 = useMemo<Movie[]>(() =>
    [...userWatched]
      .sort((a, b) => (b.user_rating ?? 0) - (a.user_rating ?? 0))
      .slice(0, 10)
      .map(watchedToMovie),
    [userWatched]);

  // Build the personalized hero slots in priority order
  const heroSlots = useMemo<PersonalizedSlot[]>(() => {
    const slots: PersonalizedSlot[] = [];
    if (friendSlot) slots.push(friendSlot);
    if (recommended?.length) slots.push({ kind: 'recommended', movie: recommended[0] });
    if (heroMovies?.length)  slots.push({ kind: 'tonight',     movie: heroMovies[0] });
    if (top10.length) {
      const watched = userWatched.find(w => w.movie_id === top10[0].id);
      if (watched?.user_rating) slots.push({ kind: 'topPick', movie: top10[0], yourRating: watched.user_rating });
    }
    return slots;
  }, [friendSlot, recommended, heroMovies, top10, userWatched]);

  const providerWatched = useMemo<Movie[]>(() => {
    if (activeProvider === 'all' || !user) return [];
    return userWatched
      .filter(w => w.services?.includes(activeProvider))
      .map(watchedToMovie);
  }, [userWatched, activeProvider]);

  // ── Watchlist toggle ───────────────────────────────────────────
  async function handleToggleWatchlist(movie: Movie) {
    if (!user) return;
    const isIn = watchlistIds.includes(movie.id);
    if (isIn) {
      await removeFromWatchLater(user.user_id, movie.id);
      setWatchlistIds(prev => prev.filter(id => id !== movie.id));
    } else {
      await watchMovieLater(user.user_id, movie.id);
      setWatchlistIds(prev => [...prev, movie.id]);
    }
  }

  const isProviderView = activeProvider !== 'all';

  return (
    <div>

      {/* ── Hero ── */}
      {heroSlots.length === 0 ? (
        <PersonalizedHeroSkeleton />
      ) : (
        <PersonalizedHero
          slots={heroSlots}
          onOpenModal={setSelectedMovieId}
          onToggleWatchlist={handleToggleWatchlist}
          watchlistIds={watchlistIds}
          hasUser={!!user}
        />
      )}

      {/* ── Provider tab bar ── */}
      <div className="mt-14 mb-8">
        <div
          className="hide-scrollbar flex gap-3 justify-evenly"
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          {visibleProviderTabs.map(p => {
            const color     = PROVIDER_COLOR[p.id] ?? '#7C5DBD';
            const isActive  = activeProvider === p.id;
            const isHovered = hoveredProvider === p.id;
            const logo      = p.id !== 'all' ? PROVIDER_LOGOS[p.id] : null;
            const lit       = isActive || isHovered;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                onMouseEnter={() => setHoveredProvider(p.id)}
                onMouseLeave={() => setHoveredProvider(null)}
                className="flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-250"
                style={{
                  background: 'none', border: 'none', outline: 'none', padding: '4px 0 8px',
                  transform: isHovered ? 'translateY(-4px) scale(1.08)' : 'translateY(0) scale(1)',
                  opacity: lit ? 1 : 0.55,
                }}
              >
                {logo ? (
                  <img src={logo} alt={p.label} className="rounded-xl object-cover"
                    style={{ width: 80, height: 80, boxShadow: lit ? `0 0 16px ${color}99` : 'none', transition: 'box-shadow 0.25s' }}
                  />
                ) : (
                  <Layers style={{ width: 52, height: 52, color: lit ? color : '#6b7280' }} />
                )}
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: lit ? '#fff' : '#9ca3af' }}>
                  {p.label}
                </span>
                <div style={{ height: 2, width: isActive ? '100%' : 0, background: color, borderRadius: 1, transition: 'width 0.25s' }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Movie rows ── */}
      <div>
        {isProviderView ? (
          providerLoading ? (
            <div className="text-gray-500 text-center py-16 text-sm">Loading {activeProvider}…</div>
          ) : (
            <>
              <MovieRow title={`Popular on ${activeProvider}`}   movies={providerPopular}  onMovieClick={setSelectedMovieId} />
              <MovieRow title={`Top Rated on ${activeProvider}`} movies={providerTopRated} onMovieClick={setSelectedMovieId} />
              <MovieRow title={`New on ${activeProvider}`}       movies={providerNew}      onMovieClick={setSelectedMovieId} />
              {providerWatched.length > 0 && (
                <MovieRow title={`Your Watches on ${activeProvider}`} movies={providerWatched} onMovieClick={setSelectedMovieId} />
              )}
            </>
          )
        ) : (
          <>
            {user && top10.length > 0 && (
              <MovieRow title="Your Top 10"           movies={top10}          onMovieClick={setSelectedMovieId} />
            )}
            {user && recentSpins !== null && recentSpins.length > 0 && (
              <MovieRow title="Your Recent Spins"     movies={recentSpins}    onMovieClick={setSelectedMovieId} />
            )}
            {user && (
              <MovieRow title="Recommended Watches"   movies={recommended}    onMovieClick={setSelectedMovieId} />
            )}
            <MovieRow title="Trending Now"            movies={trendingMovies} onMovieClick={setSelectedMovieId} />
            <MovieRow title="New Releases"            movies={newReleases}    onMovieClick={setSelectedMovieId} />
            <MovieRow title="Top Rated"               movies={topRated}       onMovieClick={setSelectedMovieId} />
            <MovieRow title="Classics"                movies={classics}       onMovieClick={setSelectedMovieId} />
            <MovieRow title="Action & Adventure"      movies={actionMovies}   onMovieClick={setSelectedMovieId} />
            <MovieRow title="Comedy"                  movies={comedyMovies}   onMovieClick={setSelectedMovieId} />
            <MovieRow title="Horror"                  movies={horrorMovies}   onMovieClick={setSelectedMovieId} />
            <MovieRow title="Sci-Fi"                  movies={scifiMovies}    onMovieClick={setSelectedMovieId} />
            <MovieRow title="Critically Acclaimed"    movies={acclaimed}      onMovieClick={setSelectedMovieId} />
            <MovieRow title="Coming Soon"             movies={comingSoon}     onMovieClick={setSelectedMovieId} />
          </>
        )}
      </div>

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
