import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Star, Bookmark, BookmarkCheck, Info, Layers, Sparkles } from 'lucide-react';
import { MovieDetailModal } from './MovieDetailModal';
import {
  watchMovieLater, removeFromWatchLater, getUser, getServices,
  getFeed, getFriends, getMovieDetails, getShowDetails, getWatchedMovies, getUserPublicProfile,
  getTrendingShows, getPopularShows, getTopRatedShows, discoverShows,
} from '../services/api';
import { getServiceCategoryMovies } from '../services/discoveryService';
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

interface ServiceCategoryEntry { firestoreId: string; title: string; }
interface ServiceCatalogEntry  { firestoreServiceId: string; specificLabel: string; specificCategories: ServiceCategoryEntry[]; }

const SERVICE_CATALOG: Record<string, ServiceCatalogEntry> = {
  'Netflix': {
    firestoreServiceId: 'netflix',
    specificLabel: 'Netflix Originals',
    specificCategories: [
      { firestoreId: 'originals', title: 'Netflix Originals' },
      { firestoreId: 'action',    title: 'Action' },
      { firestoreId: 'comedy',    title: 'Comedy' },
      { firestoreId: 'thriller',  title: 'Thriller' },
    ],
  },
  'Disney+': {
    firestoreServiceId: 'disney_plus',
    specificLabel: 'Disney+ Collections',
    specificCategories: [
      { firestoreId: 'marvel',    title: 'Marvel' },
      { firestoreId: 'star_wars', title: 'Star Wars' },
      { firestoreId: 'pixar',     title: 'Pixar' },
      { firestoreId: 'classics',  title: 'Disney Classics' },
    ],
  },
  'Hulu': {
    firestoreServiceId: 'hulu',
    specificLabel: 'Hulu Spotlight',
    specificCategories: [
      { firestoreId: 'horror',   title: 'Horror' },
      { firestoreId: 'comedy',   title: 'Comedy' },
      { firestoreId: 'scifi',    title: 'Sci-Fi' },
      { firestoreId: 'thriller', title: 'Thriller' },
    ],
  },
  'Max': {
    firestoreServiceId: 'max',
    specificLabel: 'DC Universe',
    specificCategories: [
      { firestoreId: 'dc',        title: 'DC Universe' },
      { firestoreId: 'drama',     title: 'Drama' },
      { firestoreId: 'action',    title: 'Action' },
      { firestoreId: 'top_rated', title: 'Top Rated' },
    ],
  },
  'Prime Video': {
    firestoreServiceId: 'amazon_prime',
    specificLabel: 'Amazon Picks',
    specificCategories: [
      { firestoreId: 'action',        title: 'Action' },
      { firestoreId: 'comedy',        title: 'Comedy' },
      { firestoreId: 'drama',         title: 'Drama' },
      { firestoreId: 'international', title: 'International' },
    ],
  },
  'Paramount+': {
    firestoreServiceId: 'paramount_plus',
    specificLabel: 'Paramount+ Exclusives',
    specificCategories: [
      { firestoreId: 'mission_impossible', title: 'Mission: Impossible' },
      { firestoreId: 'action',             title: 'Action' },
      { firestoreId: 'drama',              title: 'Drama' },
      { firestoreId: 'comedy',             title: 'Comedy' },
    ],
  },
  'Apple TV+': {
    firestoreServiceId: 'apple_tv_plus',
    specificLabel: 'Apple TV+ Acclaimed',
    specificCategories: [
      { firestoreId: 'originals', title: 'Apple TV+ Originals' },
      { firestoreId: 'drama',     title: 'Drama' },
      { firestoreId: 'scifi',     title: 'Sci-Fi' },
      { firestoreId: 'thriller',  title: 'Thriller' },
    ],
  },
  'Peacock': {
    firestoreServiceId: 'peacock',
    specificLabel: 'Peacock Originals',
    specificCategories: [
      { firestoreId: 'comedy',  title: 'Comedy' },
      { firestoreId: 'horror',  title: 'The Conjuring Universe' },
      { firestoreId: 'action',  title: 'Action' },
      { firestoreId: 'drama',   title: 'Drama' },
    ],
  },
};

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

const POSTER_H = Math.round(CARD_W * 1.5); // 234 px — keeps aspect 2/3

function CompactCard({ movie, onClick }: { movie: Movie; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [liveOverview, setLiveOverview] = useState(movie.overview ?? '');
  const overviewFetchedRef = useRef(false);

  useEffect(() => {
    if (hovered && !liveOverview && !overviewFetchedRef.current) {
      overviewFetchedRef.current = true;
      const fetchFn = movie.type === 'show' ? getShowDetails : getMovieDetails;
      fetchFn(movie.id).then((d: Record<string, unknown>) => {
        const ov = d.overview as string | undefined;
        if (ov) setLiveOverview(ov);
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  return (
    <div
      className="flex-shrink-0 cursor-pointer"
      style={{
        width: hovered ? CARD_W * 2 : CARD_W,
        transition: 'width 0.25s ease',
        position: 'relative',
        zIndex: hovered ? 20 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Expanding card body — poster left, details right */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          borderRadius: 6,
          height: POSTER_H,
          background: '#1a1a1a',
          boxShadow: hovered ? '0 8px 40px rgba(0,0,0,0.75)' : 'none',
          transition: 'box-shadow 0.25s ease',
        }}
      >
        {/* ── Poster (left, fixed width) ── */}
        <div style={{ width: CARD_W, flexShrink: 0, position: 'relative' }}>
          {movie.poster ? (
            <img
              src={movie.poster}
              alt={movie.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
                transition: 'transform 0.25s ease',
                transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#4b5563', fontSize: 10, textAlign: 'center', padding: '0 8px' }}>
              {movie.title}
            </div>
          )}

          {/* Dark tint on hover */}
          <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,0.25)' : 'transparent',
            transition: 'background 0.25s ease', pointerEvents: 'none' }} />

          {/* Provider badge */}
          {movie.streamingService && PROVIDER_LOGOS[movie.streamingService] && (
            <div style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26,
              borderRadius: 5, overflow: 'hidden', background: 'rgba(0,0,0,0.55)' }}>
              <img src={PROVIDER_LOGOS[movie.streamingService]} alt={movie.streamingService}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        {/* ── Details panel (right, slides in) ── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            overflow: 'hidden',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(0)' : 'translateX(-10px)',
            transition: 'opacity 0.2s ease 0.1s, transform 0.2s ease 0.1s',
          }}
        >
          {/* Title */}
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.35, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
            {movie.title}
          </p>

          {/* Year + Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {movie.year > 0 && (
              <span style={{ color: '#9ca3af', fontSize: 11 }}>{movie.year}</span>
            )}
            {movie.rating > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#facc15', fontWeight: 600 }}>
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                {movie.rating.toFixed(1)}<span style={{ color: '#6b7280', fontWeight: 400 }}>/10</span>
              </span>
            )}
          </div>

          {/* Genres */}
          {movie.genres.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {movie.genres.slice(0, 3).map(g => (
                <span key={g} style={{ background: '#2a2a2a', color: '#9ca3af', fontSize: 10,
                  padding: '2px 7px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {liveOverview && (
            <p style={{ color: '#6b7280', fontSize: 11, lineHeight: 1.55, margin: 0, flex: 1,
              display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
              {liveOverview}
            </p>
          )}

          {/* Streaming service label */}
          {movie.streamingService && (
            <p style={{ color: '#4b5563', fontSize: 10, margin: 0, marginTop: 'auto' }}>
              {movie.streamingService}
            </p>
          )}
        </div>
      </div>

      {/* ── Below-card text — fades out on hover ── */}
      <div style={{ marginTop: 8, paddingLeft: 2, opacity: hovered ? 0 : 1,
        transition: 'opacity 0.15s ease', pointerEvents: 'none' }}>
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
  | { kind: 'friendWatch'; movie: Movie; friendName: string; friendAvatar?: string }
  | { kind: 'recommended'; movie: Movie }
  | { kind: 'tonight';     movie: Movie }
  | { kind: 'topPick';     movie: Movie; yourRating: number };

const SLOT_META: Record<PersonalizedSlot['kind'], { label: string; color: string }> = {
  friend:      { label: 'Recently Posted About',     color: '#9B7BD7' },
  friendWatch: { label: 'Your Friends Are Watching', color: '#7EC8C8' },
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

function PersonalizedHero({ slots, backdropOverrides = {}, onOpenModal, onToggleWatchlist, watchlistIds, hasUser }: {
  slots: PersonalizedSlot[];
  backdropOverrides?: Record<string, string>;
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
    <div className="full-bleed relative overflow-hidden group/hero" style={{ height: 520, marginTop: -32 }}>
      {/* Backdrop layers */}
      {slots.map((s, i) => {
        const bg = backdropOverrides[s.movie.id] || s.movie.backdrop || '';
        return (
          <div key={i} className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}>
            {bg
              ? <img src={bg} alt={s.movie.title} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
              : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #160e30 0%, #0e0825 40%, #0a0a12 100%)' }} />
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

          <h1 className="text-white leading-none mb-3"
            style={{ fontFamily: "SanFran, system-ui, sans-serif", fontWeight: 100, fontSize: 'clamp(2.2rem, 4.5vw, 4rem)' }}>
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

          {slot.kind === 'friendWatch' && (
            <div className="bg-black/55 backdrop-blur-sm rounded-2xl p-5 border border-white/10 w-[260px]">
              <div className="flex items-center gap-3 mb-3">
                {slot.friendAvatar
                  ? <img src={slot.friendAvatar} className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0" alt="" />
                  : <div className="w-10 h-10 rounded-full bg-[#2A2A2A] border border-white/10 flex items-center justify-center text-sm font-bold text-white/70 shrink-0">
                      {slot.friendName.slice(0, 2).toUpperCase()}
                    </div>
                }
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">@{slot.friendName}</p>
                  <p className="text-[#7EC8C8] text-[11px] mt-0.5">recently watched this</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                See what your friends have been watching and discover new films through their recent activity.
              </p>
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

      {/* Left / Right nav arrows */}
      {total > 1 && (
        <>
          <button
            onClick={() => { setCurrent(c => (c - 1 + total) % total); startInterval(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 opacity-0 hover:opacity-100 group-hover/hero:opacity-60 hover:!opacity-100"
            style={{ zIndex: 3, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.12)' }}
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => { setCurrent(c => (c + 1) % total); startInterval(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 opacity-0 hover:opacity-100 group-hover/hero:opacity-60 hover:!opacity-100"
            style={{ zIndex: 3, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.12)' }}
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}

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

  const [selectedMovieId,  setSelectedMovieId]  = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'movie' | 'show'>('movie');
  const [activeProvider,   setActiveProvider]   = useState('all');
  const [hoveredProvider,  setHoveredProvider]  = useState<string | null>(null);
  const [mediaType,        setMediaType]        = useState<'movie' | 'show'>('movie');

  // ── Shows rows (loaded lazily on first switch to Shows mode) ───
  const showsLoadedRef = useRef(false);
  const [showsTrending,  setShowsTrending]  = useState<Movie[] | null>(null);
  const [showsPopular,   setShowsPopular]   = useState<Movie[] | null>(null);
  const [showsTopRated,  setShowsTopRated]  = useState<Movie[] | null>(null);
  const [showsDrama,     setShowsDrama]     = useState<Movie[] | null>(null);
  const [showsComedy,    setShowsComedy]    = useState<Movie[] | null>(null);
  const [showsCrime,     setShowsCrime]     = useState<Movie[] | null>(null);
  const [showsScifi,     setShowsScifi]     = useState<Movie[] | null>(null);
  const [showsAnimation, setShowsAnimation] = useState<Movie[] | null>(null);

  useEffect(() => {
    if (mediaType !== 'show' || showsLoadedRef.current) return;
    showsLoadedRef.current = true;
    getTrendingShows().then(setShowsTrending).catch(() => setShowsTrending([]));
    getPopularShows().then(setShowsPopular).catch(() => setShowsPopular([]));
    getTopRatedShows().then(setShowsTopRated).catch(() => setShowsTopRated([]));
    discoverShows({ genre_id: '18' }).then(setShowsDrama).catch(() => setShowsDrama([]));
    discoverShows({ genre_id: '35' }).then(setShowsComedy).catch(() => setShowsComedy([]));
    discoverShows({ genre_id: '80' }).then(setShowsCrime).catch(() => setShowsCrime([]));
    discoverShows({ genre_id: '10765' }).then(setShowsScifi).catch(() => setShowsScifi([]));
    discoverShows({ genre_id: '16' }).then(setShowsAnimation).catch(() => setShowsAnimation([]));
  }, [mediaType]);

  const openModal = (id: string, type: 'movie' | 'show' = 'movie') => {
    setSelectedMovieId(id);
    setSelectedItemType(type);
  };

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
        let backdrop = '';
        try {
          const d = await getMovieDetails(post.movie_id);
          backdrop = (d.backdrop as string) ||
            (d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : '');
        } catch {}
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

  // ── Friend watch slot (most recently watched movie by any friend) ─
  const [friendWatchSlot, setFriendWatchSlot] = useState<Extract<PersonalizedSlot, { kind: 'friendWatch' }> | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getFriends(user.user_id).then(async (friends: { friend_id: string }[]) => {
      if (cancelled || !friends.length) return;
      for (const friend of friends.slice(0, 6)) {
        try {
          const watched = await getWatchedMovies(friend.friend_id, 1);
          if (cancelled) return;
          if (!watched.length) continue;
          const w = watched[0];
          let backdrop = '';
          try {
            const d = await getMovieDetails(w.movie_id);
            backdrop = (d.backdrop as string) || (d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : '');
          } catch {}
          const friendProfile = await getUserPublicProfile(friend.friend_id).catch(() => null);
          if (!cancelled) {
            setFriendWatchSlot({
              kind: 'friendWatch',
              movie: { id: w.movie_id, title: w.title, year: w.year ?? 0, genres: w.genres ?? [], rating: w.tmdb_rating ?? 0, poster: w.poster ?? '', backdrop, streamingService: w.services?.[0] ?? '' },
              friendName: friendProfile?.username ?? friend.friend_id,
              friendAvatar: friendProfile?.avatarUrl,
            });
          }
          return;
        } catch {}
      }
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
  const [providerPopular,      setProviderPopular]      = useState<Movie[] | null>(null);
  const [providerNew,          setProviderNew]          = useState<Movie[] | null>(null);
  const [providerSpecific,     setProviderSpecific]     = useState<Movie[][] | null>(null);
  const [providerShowsPopular, setProviderShowsPopular] = useState<Movie[] | null>(null);

  useEffect(() => {
    if (activeProvider === 'all') return;

    const cached = providerCache[activeProvider];
    if (cached) {
      setProviderPopular(cached.popular);
      setProviderNew(cached.newMovies);
      setProviderSpecific(cached.specificRows);
      setProviderShowsPopular(cached.showsPopular ?? []);
      return;
    }

    setProviderPopular(null);
    setProviderNew(null);
    setProviderSpecific(null);
    setProviderShowsPopular(null);

    const catalog = SERVICE_CATALOG[activeProvider];
    if (!catalog) return;

    const providerKey = PROVIDER_KEY[activeProvider];

    let cancelled = false;
    (async () => {
      try {
        const [pop, newM, shows] = await Promise.all([
          getServiceCategoryMovies(catalog.firestoreServiceId, 'popular'),
          getServiceCategoryMovies(catalog.firestoreServiceId, 'new'),
          providerKey
            ? discoverShows({ services_filter: { [providerKey]: true }, sort_by: 'popularity' })
            : Promise.resolve([] as Movie[]),
        ]);
        if (cancelled) return;
        setProviderPopular(pop.slice(0, ROW_LIMIT));
        setProviderNew(newM.slice(0, ROW_LIMIT));
        setProviderShowsPopular(shows.slice(0, ROW_LIMIT));

        const specificResults = await Promise.all(
          catalog.specificCategories.map(cat =>
            getServiceCategoryMovies(catalog.firestoreServiceId, cat.firestoreId)
              .then(movies => movies.slice(0, ROW_LIMIT))
              .catch(() => [] as Movie[])
          )
        );
        if (cancelled) return;
        const specificData = specificResults;
        setProviderSpecific(specificData);

        cacheProvider(activeProvider, {
          popular:      pop.slice(0, ROW_LIMIT),
          newMovies:    newM.slice(0, ROW_LIMIT),
          specificRows: specificData,
          showsPopular: shows.slice(0, ROW_LIMIT),
        });
      } catch {
        if (!cancelled) { setProviderPopular([]); setProviderNew([]); setProviderSpecific([]); setProviderShowsPopular([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [activeProvider, providerCache, cacheProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ────────────────────────────────────────────────────
  const top10 = useMemo<Movie[]>(() =>
    [...userWatched]
      .filter(w => (w.user_rating ?? 0) > 0)          // only rated movies qualify
      .sort((a, b) => (b.user_rating ?? 0) - (a.user_rating ?? 0))
      .slice(0, 10)
      .map(w => ({ ...watchedToMovie(w), rating: w.user_rating ?? 0 })),  // show personal rating in the card
    [userWatched]);

  // Build the personalized hero slots in priority order
  const heroSlots = useMemo<PersonalizedSlot[]>(() => {
    const slots: PersonalizedSlot[] = [];
    if (friendSlot) slots.push(friendSlot);
    if (friendWatchSlot) slots.push(friendWatchSlot);
    if (recommended?.length) slots.push({ kind: 'recommended', movie: recommended[0] });
    if (heroMovies?.length)  slots.push({ kind: 'tonight',     movie: heroMovies[0] });
    if (top10.length) {
      const watched = userWatched.find(w => w.movie_id === top10[0].id);
      if (watched?.user_rating) slots.push({ kind: 'topPick', movie: top10[0], yourRating: watched.user_rating });
    }
    return slots;
  }, [friendSlot, friendWatchSlot, recommended, heroMovies, top10, userWatched]);

  // Fetch backdrops for any slot whose movie doesn't already have one
  const [backdropOverrides, setBackdropOverrides] = useState<Record<string, string>>({});
  const fetchedBackdropsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    heroSlots.forEach(slot => {
      const id = slot.movie.id;
      if (slot.movie.backdrop || !id || fetchedBackdropsRef.current.has(id)) return;
      fetchedBackdropsRef.current.add(id);
      getMovieDetails(id).then(d => {
        const bd = (d.backdrop as string) ||
          (d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : '');
        if (bd) setBackdropOverrides(prev => ({ ...prev, [id]: bd }));
      }).catch(() => {});
    });
  }, [heroSlots]); // eslint-disable-line react-hooks/exhaustive-deps

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
          backdropOverrides={backdropOverrides}
          onOpenModal={setSelectedMovieId}
          onToggleWatchlist={handleToggleWatchlist}
          watchlistIds={watchlistIds}
          hasUser={!!user}
        />
      )}

      {/* ── Movies / Shows pill toggle ── */}
      <div className="flex justify-center mt-10 mb-2">
        <div
          className="flex items-center p-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setMediaType('movie')}
            className="px-6 py-1.5 rounded-full text-sm font-semibold transition-all duration-200"
            style={mediaType === 'movie'
              ? { background: 'rgba(124,93,189,0.85)', color: '#fff' }
              : { color: '#6b7280' }}
          >
            Movies
          </button>
          <button
            onClick={() => setMediaType('show')}
            className="px-6 py-1.5 rounded-full text-sm font-semibold transition-all duration-200"
            style={mediaType === 'show'
              ? { background: 'rgba(124,93,189,0.85)', color: '#fff' }
              : { color: '#6b7280' }}
          >
            Shows
          </button>
        </div>
      </div>

      {/* ── Provider tab bar ── */}
      <div className="mt-6 mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 text-center mb-5">
          {mediaType === 'show' ? 'Browse Shows' : 'Your Providers'}
        </p>
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
                    style={{ width: 108, height: 108, boxShadow: lit ? `0 0 20px ${color}99` : 'none', transition: 'box-shadow 0.25s' }}
                  />
                ) : (
                  <Layers style={{ width: 68, height: 68, color: lit ? color : '#6b7280' }} />
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
        {isProviderView ? (() => {
          const catalog = SERVICE_CATALOG[activeProvider];
          return (
            <>
              <MovieRow title={`Popular on ${activeProvider}`} movies={providerPopular} onMovieClick={setSelectedMovieId} />
              <MovieRow title={`New on ${activeProvider}`} movies={providerNew} onMovieClick={setSelectedMovieId} />
              {providerWatched.length > 0 && (
                <MovieRow title={`Your Watches on ${activeProvider}`} movies={providerWatched} onMovieClick={setSelectedMovieId} />
              )}
              {(catalog?.specificCategories ?? []).map((cat, i) =>
                providerSpecific === null
                  ? <SkeletonRow key={cat.firestoreId} title={cat.title} />
                  : <MovieRow key={cat.firestoreId} title={cat.title} movies={providerSpecific[i] ?? null} onMovieClick={setSelectedMovieId} />
              )}
              <MovieRow title={`Popular Shows on ${activeProvider}`} movies={providerShowsPopular} onMovieClick={(id) => openModal(id, 'show')} />
            </>
          );
        })() : mediaType === 'show' ? (
          <>
            <MovieRow title="Trending Shows"          movies={showsTrending}  onMovieClick={(id) => openModal(id, 'show')} />
            <MovieRow title="Popular Shows"           movies={showsPopular}   onMovieClick={(id) => openModal(id, 'show')} />
            <MovieRow title="Top Rated Shows"         movies={showsTopRated}  onMovieClick={(id) => openModal(id, 'show')} />
            <MovieRow title="Drama"                   movies={showsDrama}     onMovieClick={(id) => openModal(id, 'show')} />
            <MovieRow title="Comedy"                  movies={showsComedy}    onMovieClick={(id) => openModal(id, 'show')} />
            <MovieRow title="Crime"                   movies={showsCrime}     onMovieClick={(id) => openModal(id, 'show')} />
            <MovieRow title="Sci-Fi & Fantasy"        movies={showsScifi}     onMovieClick={(id) => openModal(id, 'show')} />
            <MovieRow title="Animation"               movies={showsAnimation} onMovieClick={(id) => openModal(id, 'show')} />
          </>
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
        <MovieDetailModal movieId={selectedMovieId} type={selectedItemType} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
