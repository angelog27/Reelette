import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Star, Bookmark, BookmarkCheck, Info, Layers, Sparkles } from 'lucide-react';
import { MovieDetailModal } from './MovieDetailModal';
import {
  watchMovieLater, removeFromWatchLater, getUser, getServices,
  getFeed, getFriends, getMovieDetails, getShowDetails, getWatchedMovies, getUserPublicProfile,
  searchMovies, discoverMovies, discoverShows,
  type AIRecommendationRow,
} from '../services/api';

// ── Groq icon (inline SVG — lightning bolt, orange/red gradient) ──
const GroqIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M9.5 1L3 9h5l-1.5 6L14 7H9L9.5 1Z" fill="url(#groq-g-d)" />
    <defs>
      <linearGradient id="groq-g-d" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#FF6B35" />
        <stop offset="100%" stopColor="#E63946" />
      </linearGradient>
    </defs>
  </svg>
);
import { getServiceCategoryMovies } from '../services/discoveryService';
import type { Movie, WatchedMovie } from '../services/api';
import { PROVIDER_LOGOS } from '../constants/providers';
import { useDiscover } from '../contexts/DiscoverContext';

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
  'all':          'var(--reel-accent-hex)',
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

// ── Provider category TMDB fallbacks (used when Firestore is empty) ─
const PROVIDER_CATEGORY_FALLBACKS: Partial<Record<string, Record<string, () => Promise<Movie[]>>>> = {
  'Disney+': {
    'marvel':    () => searchMovies('Marvel Avengers').then(r => r.slice(0, ROW_LIMIT)),
    'star_wars': () => searchMovies('Star Wars').then(r => r.slice(0, ROW_LIMIT)),
    'pixar':     () => discoverMovies({ genre_id: '16', min_rating: 6, sort_by: 'vote_average.desc' }).then(r => r.slice(0, ROW_LIMIT)),
    'classics':  () => discoverMovies({ genre_id: '16', year_to: '2000', min_rating: 6 }).then(r => r.slice(0, ROW_LIMIT)),
  },
  'Netflix': {
    'originals': () => searchMovies('Netflix Original').then(r => r.slice(0, ROW_LIMIT)),
    'action':    () => discoverMovies({ genre_id: '28', sort_by: 'popularity.desc', services_filter: { netflix: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'comedy':    () => discoverMovies({ genre_id: '35', sort_by: 'popularity.desc', services_filter: { netflix: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'thriller':  () => discoverMovies({ genre_id: '53', sort_by: 'popularity.desc', services_filter: { netflix: true } }).then(r => r.slice(0, ROW_LIMIT)),
  },
  'Hulu': {
    'horror':   () => discoverMovies({ genre_id: '27', sort_by: 'popularity.desc', services_filter: { hulu: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'comedy':   () => discoverMovies({ genre_id: '35', sort_by: 'popularity.desc', services_filter: { hulu: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'scifi':    () => discoverMovies({ genre_id: '878', sort_by: 'popularity.desc', services_filter: { hulu: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'thriller': () => discoverMovies({ genre_id: '53', sort_by: 'popularity.desc', services_filter: { hulu: true } }).then(r => r.slice(0, ROW_LIMIT)),
  },
  'Max': {
    'dc':        () => searchMovies('DC Comics').then(r => r.slice(0, ROW_LIMIT)),
    'drama':     () => discoverMovies({ genre_id: '18', sort_by: 'popularity.desc', services_filter: { hboMax: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'action':    () => discoverMovies({ genre_id: '28', sort_by: 'popularity.desc', services_filter: { hboMax: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'top_rated': () => discoverMovies({ min_rating: 8, sort_by: 'vote_average.desc', services_filter: { hboMax: true } }).then(r => r.slice(0, ROW_LIMIT)),
  },
  'Prime Video': {
    'action':        () => discoverMovies({ genre_id: '28', sort_by: 'popularity.desc', services_filter: { amazonPrime: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'comedy':        () => discoverMovies({ genre_id: '35', sort_by: 'popularity.desc', services_filter: { amazonPrime: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'drama':         () => discoverMovies({ genre_id: '18', sort_by: 'popularity.desc', services_filter: { amazonPrime: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'international': () => discoverMovies({ sort_by: 'popularity.desc', services_filter: { amazonPrime: true } }).then(r => r.slice(0, ROW_LIMIT)),
  },
  'Paramount+': {
    'mission_impossible': () => searchMovies('Mission Impossible').then(r => r.slice(0, ROW_LIMIT)),
    'action':             () => discoverMovies({ genre_id: '28', sort_by: 'popularity.desc', services_filter: { paramount: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'drama':              () => discoverMovies({ genre_id: '18', sort_by: 'popularity.desc', services_filter: { paramount: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'comedy':             () => discoverMovies({ genre_id: '35', sort_by: 'popularity.desc', services_filter: { paramount: true } }).then(r => r.slice(0, ROW_LIMIT)),
  },
  'Apple TV+': {
    'originals': () => searchMovies('Apple TV Original').then(r => r.slice(0, ROW_LIMIT)),
    'drama':     () => discoverMovies({ genre_id: '18', sort_by: 'popularity.desc', services_filter: { appleTV: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'scifi':     () => discoverMovies({ genre_id: '878', sort_by: 'popularity.desc', services_filter: { appleTV: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'thriller':  () => discoverMovies({ genre_id: '53', sort_by: 'popularity.desc', services_filter: { appleTV: true } }).then(r => r.slice(0, ROW_LIMIT)),
  },
  'Peacock': {
    'comedy': () => discoverMovies({ genre_id: '35', sort_by: 'popularity.desc', services_filter: { peacock: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'horror': () => searchMovies('Conjuring Universe').then(r => r.slice(0, ROW_LIMIT)),
    'action': () => discoverMovies({ genre_id: '28', sort_by: 'popularity.desc', services_filter: { peacock: true } }).then(r => r.slice(0, ROW_LIMIT)),
    'drama':  () => discoverMovies({ genre_id: '18', sort_by: 'popularity.desc', services_filter: { peacock: true } }).then(r => r.slice(0, ROW_LIMIT)),
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
  onMovieClick: (id: string, type?: 'movie' | 'show', title?: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (movies === null) return <SkeletonRow title={title} />;
  if (!movies.length) return null;

  const scroll = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -(CARD_W * 4) : (CARD_W * 4), behavior: 'smooth' });

  return (
    <div className="mb-8 reel-enter">
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
            <CompactCard key={movie.id} movie={movie} onClick={() => onMovieClick(movie.id, movie.type ?? 'movie', movie.title)} />
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

// ── Landscape card ───────────────────────────────────────────────

const LAND_W = 420;
const LAND_H = 236; // 16:9

function SkeletonLandscapeRow({ title }: { title: string }) {
  return (
    <div className="mb-10 reel-enter">
      <h2 className="text-[15px] font-bold mb-3" style={{ color: '#e8e8e8', letterSpacing: '-0.01em' }}>{title}</h2>
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse rounded-xl bg-[#1e1e1e]"
            style={{ width: LAND_W, height: LAND_H, maxWidth: 'calc(100vw - 24px)', aspectRatio: `${LAND_W} / ${LAND_H}` }} />
        ))}
      </div>
    </div>
  );
}

function LandscapeCard({ movie, onClick }: { movie: Movie; onClick: () => void }) {
  const [backdrop, setBackdrop] = useState<string | null>(movie.backdrop ?? null);
  const [trailerKey, setTrailerKey] = useState<string | null | undefined>(undefined);
  const [timerDone, setTimerDone] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [barKey, setBarKey] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(undefined);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailsFetchedRef = useRef(false);

  useEffect(() => {
    const fetchFn = movie.type === 'show' ? getShowDetails : getMovieDetails;
    fetchFn(movie.id)
      .then(d => setLogoUrl((d.logo_url as string | null) ?? null))
      .catch(() => setLogoUrl(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id]);

  const handleMouseEnter = () => {
    setTimerDone(false);
    setShowTrailer(false);
    setBarKey((k: number) => k + 1);
    hoverTimerRef.current = setTimeout(() => setTimerDone(true), 5000);

    if (!detailsFetchedRef.current) {
      detailsFetchedRef.current = true;
      const fetchFn = movie.type === 'show' ? getShowDetails : getMovieDetails;
      fetchFn(movie.id).then((d) => {
        const bd = (d.backdrop as string) ||
          (d.backdrop_path ? `https://image.tmdb.org/t/p/original${d.backdrop_path as string}` : null);
        if (bd) setBackdrop(bd);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const videos: Array<{ site: string; type: string; key: string }> = (d.videos as any)?.results ?? [];
        const t = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
          ?? videos.find(v => v.site === 'YouTube' && v.type === 'Teaser')
          ?? videos.find(v => v.site === 'YouTube');
        setTrailerKey(t?.key ?? null);
      }).catch(() => setTrailerKey(null));
    }
  };

  const handleMouseLeave = () => {
    setTimerDone(false);
    setShowTrailer(false);
    setBarKey(0);
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
  };

  useEffect(() => {
    if (timerDone && trailerKey !== undefined && trailerKey !== null) setShowTrailer(true);
  }, [timerDone, trailerKey]);

  useEffect(() => () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }, []);

  const imgSrc = backdrop || movie.poster || '';

  return (
    <div
      className="flex-shrink-0 relative rounded-xl overflow-hidden cursor-pointer interactive-card"
      style={{ width: LAND_W, height: LAND_H, maxWidth: 'calc(100vw - 24px)', aspectRatio: `${LAND_W} / ${LAND_H}` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={!showTrailer ? onClick : undefined}
    >
      <img
        src={imgSrc}
        alt={movie.title}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: backdrop ? 'center' : 'center top',
          opacity: showTrailer ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}
        loading="lazy"
        decoding="async"
      />

      {showTrailer && trailerKey && (
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&rel=0&modestbranding=1`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={`${movie.title} trailer`}
        />
      )}

      {!showTrailer && (
        <>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 35%, transparent 65%)',
          }} />

          {/* Logo — middle left */}
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', maxWidth: '55%' }}>
            {logoUrl
              ? (
                <img
                  src={logoUrl}
                  alt={movie.title}
                  style={{
                    maxWidth: 200,
                    maxHeight: 72,
                    objectFit: 'contain',
                    objectPosition: 'left center',
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.95))',
                    display: 'block',
                  }}
                />
              )
              : (
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.3, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                  {movie.title}
                </p>
              )
            }
          </div>

          {/* Bottom: year + rating + provider */}
          <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {movie.year > 0 && <span style={{ color: '#9ca3af', fontSize: 12 }}>{movie.year}</span>}
              {movie.rating > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#facc15', fontSize: 12, fontWeight: 600 }}>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {movie.rating.toFixed(1)}
                </span>
              )}
              {movie.streamingService && PROVIDER_LOGOS[movie.streamingService] && (
                <img src={PROVIDER_LOGOS[movie.streamingService]} alt={movie.streamingService}
                  style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} />
              )}
            </div>
          </div>
        </>
      )}

      {barKey > 0 && !showTrailer && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'rgba(255,255,255,0.15)', pointerEvents: 'none',
        }}>
          <div
            key={barKey}
            style={{
              height: '100%', background: 'var(--reel-accent-hex)',
              transformOrigin: 'left',
              animation: 'landscape-progress 5s linear forwards',
            }}
          />
        </div>
      )}
    </div>
  );
}

function LandscapeRow({ title, movies, onMovieClick }: {
  title: string;
  movies: Movie[] | null;
  onMovieClick: (id: string, type?: 'movie' | 'show', title?: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (movies === null) return <SkeletonLandscapeRow title={title} />;
  if (!movies.length) return null;

  const scroll = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -(LAND_W * 2) : LAND_W * 2, behavior: 'smooth' });

  return (
    <div className="mb-10 reel-enter">
      <h2 className="text-[15px] font-bold mb-3" style={{ color: '#e8e8e8', letterSpacing: '-0.01em' }}>{title}</h2>
      <div className="relative group">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-l-xl"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.8), transparent)' }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div
          ref={scrollRef}
          className="hide-scrollbar flex gap-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          onWheel={(e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) window.scrollBy(0, e.deltaY); }}
        >
          {movies.map(movie => (
            <LandscapeCard
              key={movie.id}
              movie={movie}
              onClick={() => onMovieClick(movie.id, movie.type ?? 'movie', movie.title)}
            />
          ))}
        </div>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-r-xl"
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
  friend:      { label: 'Recently Posted About',     color: 'var(--reel-accent-hex)' },
  friendWatch: { label: 'Your Friends Are Watching', color: '#7EC8C8' },
  recommended: { label: 'Recommended for You',       color: 'var(--reel-accent-hex)' },
  tonight:     { label: "Tonight's Pick",             color: 'rgba(255,255,255,0.75)' },
  topPick:     { label: 'Your Top Pick',              color: '#fbbf24' },
};

function PersonalizedHeroSkeleton() {
  return (
    <div className="full-bleed relative animate-pulse bg-[#141414]" style={{ height: 'clamp(300px, 80vw, 680px)', marginTop: -62 }}>
      <div className="absolute left-5 sm:left-10 md:left-16 bottom-8 sm:bottom-14 flex flex-col gap-3">
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
  onOpenModal: (id: string, type?: 'movie' | 'show', title?: string) => void;
  onToggleWatchlist: (movie: Movie) => void;
  watchlistIds: string[];
  hasUser: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = slots.length;
  const [logos, setLogos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    slots.forEach(s => {
      if (!(s.movie.id in logos)) {
        const fetchFn = s.movie.type === 'show' ? getShowDetails : getMovieDetails;
        fetchFn(s.movie.id)
          .then(d => setLogos(prev => ({ ...prev, [s.movie.id]: (d.logo_url as string | null) ?? null })));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

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
    <div className="full-bleed relative overflow-hidden group/hero" style={{ height: 'clamp(300px, 80vw, 680px)', marginTop: -62 }}>
      {/* Backdrop layers */}
      {slots.map((s, i) => {
        const bg = backdropOverrides[s.movie.id] || s.movie.backdrop || '';
        return (
          <div key={i} className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}>
            {bg
              ? <img src={bg} alt={s.movie.title} className="w-full h-full object-cover" style={{ objectPosition: 'center 30%' }} loading={i === 0 ? 'eager' : 'lazy'} />
              : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #160e30 0%, #0e0825 40%, #0a0a12 100%)' }} />
            }
          </div>
        );
      })}

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ zIndex: 2, background: 'linear-gradient(to right, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.70) 38%, rgba(0,0,0,0.25) 62%, rgba(0,0,0,0.05) 100%)' }} />
      <div className="absolute inset-0" style={{ zIndex: 2, background: 'linear-gradient(to top, rgb(10,10,10) 0%, rgba(10,10,10,0.75) 18%, rgba(10,10,10,0.15) 42%, transparent 62%)' }} />
      <div className="absolute inset-0" style={{ zIndex: 2, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 18%)' }} />
      {/* Theme-accent tint — subtle colour bleed at the hero bottom tied to active theme */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{
        zIndex: 2, height: '32%',
        background: 'var(--reel-accent-hex)', opacity: 0.11,
        maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
      }} />

      {/* Content row */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-4 sm:px-10 md:px-16 pb-8 sm:pb-12 gap-6 md:gap-10" style={{ zIndex: 3 }}>

        {/* ── Left: movie info ── */}
        <div className="flex flex-col min-w-0 max-w-[90vw] sm:max-w-[520px]">
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
                  style={{ background: 'color-mix(in srgb, var(--reel-accent-hex) 55%, transparent)', color: '#fff' }}>{g}</span>
              ))}
            </div>
          )}

          {logos[slot.movie.id]
            ? (
              <img
                src={logos[slot.movie.id]!}
                alt={slot.movie.title}
                className="mb-3"
                style={{
                  maxWidth: 'clamp(280px, 40vw, 600px)',
                  maxHeight: 200,
                  objectFit: 'contain',
                  objectPosition: 'left center',
                  filter: 'drop-shadow(0 2px 16px rgba(0,0,0,0.95))',
                }}
              />
            )
            : (
              <h1 className="text-white leading-none mb-3"
                style={{ fontFamily: "SanFran, system-ui, sans-serif", fontWeight: 100, fontSize: 'clamp(2.2rem, 4.5vw, 4rem)' }}>
                {slot.movie.title}
              </h1>
            )
          }

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
            <button onClick={() => onOpenModal(slot.movie.id, slot.movie.type ?? 'movie', slot.movie.title)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white/90 text-zinc-900 font-semibold rounded-lg text-sm hover:bg-white active:scale-[0.97] transition duration-150">
              <Info className="w-4 h-4" /> More Info
            </button>
            {hasUser && (
              <button onClick={() => onToggleWatchlist(slot.movie)}
                className="flex items-center gap-2 px-5 py-2.5 font-semibold rounded-lg text-sm active:scale-[0.97] transition duration-150"
                style={isInWatchlist ? { background: 'var(--reel-accent-hex)', color: '#fff' } : { background: 'rgba(109,109,110,0.7)', color: '#fff' }}>
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
              style={{ width: i === current ? 20 : 8, background: i === current ? 'var(--reel-accent-hex)' : 'rgba(255,255,255,0.35)' }}
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
    showsTrending, showsPopular, showsTopRated, showsDrama, showsComedy,
    showsCrime, showsScifi, showsAnimation, triggerShowsFetch,
    aiRows,
  } = useDiscover();

  const [selectedMovieId,  setSelectedMovieId]  = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'movie' | 'show'>('movie');
  const [selectedItemTitle, setSelectedItemTitle] = useState<string | undefined>(undefined);
  const [activeProvider,   setActiveProvider]   = useState('all');
  const [hoveredProvider,  setHoveredProvider]  = useState<string | null>(null);
  const [mediaType,        setMediaType]        = useState<'movie' | 'show'>('movie');

  // ── Shows rows — loaded lazily via context on first switch to Shows mode ─
  useEffect(() => {
    if (mediaType === 'show') triggerShowsFetch();
  }, [mediaType, triggerShowsFetch]);

  const openModal = (id: string, type: 'movie' | 'show' = 'movie', title?: string) => {
    setSelectedMovieId(id);
    setSelectedItemType(type);
    setSelectedItemTitle(title);
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
        const friendPosts = posts.filter(p => friendIds.has(p.user_id) && !!p.movie_id && p.message.trim().length > 10);
        const post = friendPosts[Math.floor(Math.random() * Math.min(friendPosts.length, 5))];
        if (!post) return;
        let backdrop = '';
        try {
          const d = await getMovieDetails(post.movie_id);
          backdrop = (d.backdrop as string) ||
            (d.backdrop_path ? `https://image.tmdb.org/t/p/original${d.backdrop_path}` : '');
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
      const shuffled = [...friends].sort(() => Math.random() - 0.5);
      for (const friend of shuffled.slice(0, 6)) {
        try {
          const watched = await getWatchedMovies(friend.friend_id, 1);
          if (cancelled) return;
          if (!watched.length) continue;
          const w = watched[0];
          let backdrop = '';
          try {
            const d = await getMovieDetails(w.movie_id);
            backdrop = (d.backdrop as string) || (d.backdrop_path ? `https://image.tmdb.org/t/p/original${d.backdrop_path}` : '');
          } catch {}
          const friendProfile = await getUserPublicProfile(friend.friend_id).catch(() => null);
          if (!cancelled) {
            setFriendWatchSlot({
              kind: 'friendWatch',
              movie: { id: w.movie_id, title: w.title, year: w.year ?? 0, genres: w.genres ?? [], rating: w.tmdb_rating ?? 0, poster: w.poster ?? '', backdrop, streamingService: w.services?.[0] ?? '', type: w.media_type === 'show' ? 'show' : 'movie' },
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

  // ── Based on Your Providers landscape row ──────────────────────
  const [providerBasedMovies, setProviderBasedMovies] = useState<Movie[] | null>(null);
  const servicesKey = useMemo(
    () => Object.entries(userServices).filter(([, v]) => v).map(([k]) => k).sort().join(','),
    [userServices],
  );
  useEffect(() => {
    const activeFilter: Record<string, boolean> = Object.fromEntries(Object.entries(userServices).filter(([, v]) => v)) as Record<string, boolean>;
    if (!Object.keys(activeFilter).length) { setProviderBasedMovies([]); return; }
    setProviderBasedMovies(null);
    let cancelled = false;
    discoverMovies({ services_filter: activeFilter, sort_by: 'popularity.desc', min_rating: 6 })
      .then(movies => { if (!cancelled) setProviderBasedMovies(movies.slice(0, ROW_LIMIT)); })
      .catch(() => { if (!cancelled) setProviderBasedMovies([]); });
    return () => { cancelled = true; };
  }, [servicesKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

        // Firestore empty → fall back to TMDB discover filtered by provider
        const popularFinal = pop.length > 0 || !providerKey
          ? pop
          : await discoverMovies({ services_filter: { [providerKey]: true }, sort_by: 'popularity.desc' }).catch(() => [] as Movie[]);

        const newFinal = newM.length > 0 || !providerKey
          ? newM
          : await discoverMovies({ services_filter: { [providerKey]: true }, sort_by: 'vote_average.desc', min_rating: 6 }).catch(() => [] as Movie[]);

        if (cancelled) return;
        setProviderPopular(popularFinal.slice(0, ROW_LIMIT));
        setProviderNew(newFinal.slice(0, ROW_LIMIT));
        setProviderShowsPopular(shows.slice(0, ROW_LIMIT).map(m => ({ ...m, type: 'show' as const })));

        const specificResults = await Promise.all(
          catalog.specificCategories.map(async cat => {
            const movies = await getServiceCategoryMovies(catalog.firestoreServiceId, cat.firestoreId)
              .catch(() => [] as Movie[]);
            if (movies.length > 0) return movies.slice(0, ROW_LIMIT);
            // Firestore empty — try TMDB fallback
            const fallbackFn = PROVIDER_CATEGORY_FALLBACKS[activeProvider]?.[cat.firestoreId];
            if (fallbackFn) {
              return fallbackFn().catch(() => [] as Movie[]);
            }
            return [] as Movie[];
          })
        );
        if (cancelled) return;
        const specificData = specificResults;
        setProviderSpecific(specificData);

        cacheProvider(activeProvider, {
          popular:      popularFinal.slice(0, ROW_LIMIT),
          newMovies:    newFinal.slice(0, ROW_LIMIT),
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
      const randomPick = top10[Math.floor(Math.random() * top10.length)];
      const watched = userWatched.find(w => w.movie_id === randomPick.id);
      if (watched?.user_rating) slots.push({ kind: 'topPick', movie: randomPick, yourRating: watched.user_rating });
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

      const extractBackdrop = (d: Record<string, unknown>) =>
        (d.backdrop as string) || (d.backdrop_path ? `https://image.tmdb.org/t/p/original${d.backdrop_path}` : '');

      const applyIfFound = (bd: string) => {
        if (bd) setBackdropOverrides(prev => ({ ...prev, [id]: bd }));
      };

      if (slot.movie.type === 'show') {
        getShowDetails(id).then(d => applyIfFound(extractBackdrop(d))).catch(() => {});
      } else {
        getMovieDetails(id).then(d => {
          const bd = extractBackdrop(d);
          if (bd) { applyIfFound(bd); return; }
          // No backdrop from movie API — try show API as fallback
          getShowDetails(id).then(d2 => applyIfFound(extractBackdrop(d2))).catch(() => {});
        }).catch(() => {
          getShowDetails(id).then(d => applyIfFound(extractBackdrop(d))).catch(() => {});
        });
      }
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
    <div style={{ overflowX: 'hidden' }}>

      {/* ── Hero ── */}
      {heroSlots.length === 0 ? (
        <PersonalizedHeroSkeleton />
      ) : (
        <PersonalizedHero
          slots={heroSlots}
          backdropOverrides={backdropOverrides}
          onOpenModal={openModal}
          onToggleWatchlist={handleToggleWatchlist}
          watchlistIds={watchlistIds}
          hasUser={!!user}
        />
      )}

      {/* Hero bottom bleed — smooth gradient continuation below the hero's hard edge */}
      <div
        className="full-bleed pointer-events-none hidden md:block"
        style={{
          marginTop: -110, height: 130,
          background: 'linear-gradient(to bottom, transparent 0%, rgb(10,10,10) 60%)',
          position: 'relative', zIndex: 3,
        }}
      />

      {/* ── Movies / Shows pill toggle + Provider bar — pulled up on desktop to sit above providers ── */}
      <div className="relative z-[5] mt-8 md:-mt-14">
      <div className="flex justify-center mb-2">
        {/* Sliding pill toggle — GPU-accelerated translateX instead of background color swap */}
        <div className="relative flex items-center p-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Sliding indicator */}
          <div style={{
            position: 'absolute', top: 4, bottom: 4, left: 4,
            width: 'calc(50% - 4px)',
            background: 'color-mix(in srgb, var(--reel-accent-hex) 82%, transparent)',
            borderRadius: 9999,
            transform: mediaType === 'show' ? 'translateX(100%)' : 'translateX(0)',
            transition: 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1)',
            pointerEvents: 'none',
          }} />
          <button
            onClick={() => setMediaType('movie')}
            className="relative z-10 px-6 py-1.5 rounded-full text-sm font-semibold active:scale-[0.97]"
            style={{ color: mediaType === 'movie' ? '#fff' : '#6b7280', transition: 'color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}
          >
            Movies
          </button>
          <button
            onClick={() => setMediaType('show')}
            className="relative z-10 px-6 py-1.5 rounded-full text-sm font-semibold active:scale-[0.97]"
            style={{ color: mediaType === 'show' ? '#fff' : '#6b7280', transition: 'color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}
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
          className="hide-scrollbar flex gap-4 sm:gap-3 overflow-x-auto sm:justify-evenly px-2"
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          {visibleProviderTabs.map(p => {
            const color     = PROVIDER_COLOR[p.id] ?? 'var(--reel-accent-hex)';
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
                  touchAction: 'manipulation',
                }}
              >
                {logo ? (
                  <img src={logo} alt={p.label}
                    className="rounded-xl object-cover w-16 h-16 sm:w-[108px] sm:h-[108px]"
                    style={{ boxShadow: lit ? `0 0 20px ${color}99` : 'none', transition: 'box-shadow 0.25s' }}
                  />
                ) : (
                  <Layers className="w-12 h-12 sm:w-[68px] sm:h-[68px]" style={{ color: lit ? color : '#6b7280' }} />
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
      </div>{/* end toggle + provider wrapper */}

      {/* ── Movie rows ── */}
      <div>
        {isProviderView ? (() => {
          const catalog = SERVICE_CATALOG[activeProvider];
          if (mediaType === 'show') {
            return (
              <MovieRow
                title={`Popular Shows on ${activeProvider}`}
                movies={providerShowsPopular}
                onMovieClick={(id, _t, title) => openModal(id, 'show', title)}
              />
            );
          }
          return (
            <>
              <MovieRow title={`Popular on ${activeProvider}`} movies={providerPopular} onMovieClick={openModal} />
              <MovieRow title={`New on ${activeProvider}`} movies={providerNew} onMovieClick={openModal} />
              {providerWatched.length > 0 && (
                <MovieRow title={`Your Watches on ${activeProvider}`} movies={providerWatched} onMovieClick={openModal} />
              )}
              {(catalog?.specificCategories ?? []).map((cat, i) => {
                const rowMovies: Movie[] | null = providerSpecific ? (providerSpecific[i] ?? null) : null;
                return rowMovies === null && providerSpecific === null
                  ? <SkeletonRow key={cat.firestoreId} title={cat.title} />
                  : <MovieRow key={cat.firestoreId} title={cat.title} movies={rowMovies} onMovieClick={openModal} />;
              })}
            </>
          );
        })() : mediaType === 'show' ? (
          <>
            <MovieRow title="Trending Shows"          movies={showsTrending}  onMovieClick={(id, _t, title) => openModal(id, 'show', title)} />
            <MovieRow title="Popular Shows"           movies={showsPopular}   onMovieClick={(id, _t, title) => openModal(id, 'show', title)} />
            <MovieRow title="Top Rated Shows"         movies={showsTopRated}  onMovieClick={(id, _t, title) => openModal(id, 'show', title)} />
            <MovieRow title="Drama"                   movies={showsDrama}     onMovieClick={(id, _t, title) => openModal(id, 'show', title)} />
            <MovieRow title="Comedy"                  movies={showsComedy}    onMovieClick={(id, _t, title) => openModal(id, 'show', title)} />
            <MovieRow title="Crime"                   movies={showsCrime}     onMovieClick={(id, _t, title) => openModal(id, 'show', title)} />
            <MovieRow title="Sci-Fi & Fantasy"        movies={showsScifi}     onMovieClick={(id, _t, title) => openModal(id, 'show', title)} />
            <MovieRow title="Animation"               movies={showsAnimation} onMovieClick={(id, _t, title) => openModal(id, 'show', title)} />
          </>
        ) : (
          <>
            {user && (
              <LandscapeRow title="Based on Your Providers" movies={providerBasedMovies} onMovieClick={openModal} />
            )}
            {user && recentSpins !== null && recentSpins.length > 0 && (
              <MovieRow title="Your Recent Spins"     movies={recentSpins}    onMovieClick={openModal} />
            )}
            
            {user && top10.length > 0 && (
              <MovieRow title="Your Top 10"           movies={top10}          onMovieClick={openModal} />
            )}
            {user && (
              <LandscapeRow title="Recommended for You" movies={recommended} onMovieClick={openModal} />
            )}
            
            <MovieRow title="New Releases"            movies={newReleases}    onMovieClick={openModal} />
            <MovieRow title="Trending Now"            movies={trendingMovies} onMovieClick={openModal} />
            <MovieRow title="Classics"                movies={classics}       onMovieClick={openModal} />
            <MovieRow title="Comedy"                  movies={comedyMovies}   onMovieClick={openModal} />
            <MovieRow title="Sci-Fi"                  movies={scifiMovies}    onMovieClick={openModal} />
            <MovieRow title="Top Rated"               movies={topRated}       onMovieClick={openModal} />
            <MovieRow title="Horror"                  movies={horrorMovies}   onMovieClick={openModal} />
            <MovieRow title="Action & Adventure"      movies={actionMovies}   onMovieClick={openModal} />
            <MovieRow title="Critically Acclaimed"    movies={acclaimed}      onMovieClick={openModal} />
            <MovieRow title="Coming Soon"             movies={comingSoon}     onMovieClick={openModal} />

            {/* ── AI Picks for You ── */}
            {user && (aiRows === null || aiRows.length > 0) && (
              <div className="mt-4">
                {/* Section header */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-px flex-1 bg-[#1e1e1e]" />
                  <div className="flex items-center gap-1.5">
                    <GroqIcon size={13} />
                    <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-gray-500">
                      Picked for you  ⚡ Groq AI
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-[#1e1e1e]" />
                </div>

                {aiRows === null ? (
                  /* Skeleton while loading */
                  <>
                    <SkeletonRow title="Personalizing your picks…" />
                    <SkeletonRow title="Finding hidden gems…" />
                  </>
                ) : (
                  /* Render each AI row — label acts as the row header */
                  (aiRows as AIRecommendationRow[]).map((row, i) => (
                    <MovieRow
                      key={i}
                      title={row.label}
                      movies={row.movies}
                      onMovieClick={openModal}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} type={selectedItemType} knownTitle={selectedItemTitle} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
