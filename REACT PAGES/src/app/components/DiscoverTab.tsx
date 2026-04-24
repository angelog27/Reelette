import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Star, Bookmark, BookmarkCheck, Info, Layers } from 'lucide-react';
import { MovieDetailModal } from './MovieDetailModal';
import {
  getTrendingMovies, getTopRatedMovies, getNowPlayingMovies, getUpcomingMovies,
  discoverMovies, getMovieRecommendations, getWatchedMovies, getRouletteHistory,
  watchMovieLater, removeFromWatchLater, getWatchLater, getUser,
} from '../services/api';
import type { Movie, WatchedMovie, RouletteSpin } from '../services/api';
import { PROVIDER_LOGOS } from '../constants/providers';

// ── Constants ─────────────────────────────────────────────────────

const PROVIDER_TABS = [
  { id: 'all',        label: 'All' },
  { id: 'Netflix',    label: 'Netflix' },
  { id: 'Disney+',    label: 'Disney+' },
  { id: 'Hulu',       label: 'Hulu' },
  { id: 'Max',        label: 'Max' },
  { id: 'Paramount+', label: 'Paramount+' },
  { id: 'Apple TV+',  label: 'Apple TV+' },
];

const PROVIDER_COLOR: Record<string, string> = {
  'all':        '#C0392B',
  'Netflix':    '#E50914',
  'Disney+':    '#1A4DB5',
  'Hulu':       '#1CE783',
  'Max':        '#6C2BD9',
  'Paramount+': '#0064FF',
  'Apple TV+':  '#8E8E93',
};

const PROVIDER_KEY: Record<string, string> = {
  'Netflix':    'netflix',
  'Disney+':    'disneyPlus',
  'Hulu':       'hulu',
  'Max':        'hboMax',
  'Paramount+': 'paramount',
  'Apple TV+':  'appleTV',
};

const ROW_LIMIT = 14;
const CARD_W = 224;

// ── Converters ────────────────────────────────────────────────────

function watchedToMovie(w: WatchedMovie): Movie {
  return {
    id: w.movie_id, title: w.title, year: w.year,
    genres: w.genres ?? [], rating: w.tmdb_rating ?? 0,
    poster: w.poster ?? '', streamingService: w.services?.[0] ?? '',
  };
}

function spinToMovie(s: RouletteSpin): Movie {
  return {
    id: s.movie_id, title: s.movie_title, year: 0,
    genres: [], rating: 0,
    poster: s.poster_url ?? '', streamingService: '',
  };
}

// ── Compact landscape card (Netflix-style rows) ───────────────────

function CompactCard({ movie, onClick }: { movie: Movie; onClick: () => void }) {
  const img = movie.backdrop || movie.poster;
  return (
    <div
      className="cursor-pointer group flex-shrink-0"
      style={{ width: CARD_W }}
      onClick={onClick}
    >
      {/* 16:9 thumbnail */}
      <div
        className="relative overflow-hidden rounded-md bg-[#1a1a1a]"
        style={{ aspectRatio: '16/9' }}
      >
        {img ? (
          <img
            src={img}
            alt={movie.title}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px] text-center px-2">
            {movie.title}
          </div>
        )}
        {/* hover tint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
      </div>

      {/* Below-card info */}
      <div className="mt-2 px-0.5">
        <p className="text-white text-[13px] font-medium line-clamp-1 leading-snug">{movie.title}</p>
        {movie.year > 0 && (
          <p className="text-gray-500 text-[11px] mt-0.5">{movie.year}</p>
        )}
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

// ── Movie Row ─────────────────────────────────────────────────────

function MovieRow({ title, movies, onMovieClick }: {
  title: string;
  movies: Movie[];
  onMovieClick: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (!movies.length) return null;

  const scroll = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -(CARD_W * 4) : (CARD_W * 4), behavior: 'smooth' });

  return (
    <div className="mb-8">
      <h2 className="text-sm md:text-base font-bold text-white mb-3 tracking-wide uppercase"
        style={{ color: '#e5e5e5', letterSpacing: '0.04em' }}>
        {title}
      </h2>
      <div className="relative group">
        {/* Left arrow */}
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
        >
          {movies.map(movie => (
            <CompactCard key={movie.id} movie={movie} onClick={() => onMovieClick(movie.id)} />
          ))}
        </div>

        {/* Right arrow */}
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

// ── Hero Section ──────────────────────────────────────────────────

function HeroSection({ movies, onOpenModal, onToggleWatchlist, watchlistIds, hasUser }: {
  movies: Movie[];
  onOpenModal: (id: string) => void;
  onToggleWatchlist: (movie: Movie) => void;
  watchlistIds: string[];
  hasUser: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = Math.min(movies.length, 5);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (total <= 1) return;
    intervalRef.current = setInterval(() => setCurrent(c => (c + 1) % total), 6000);
  }, [total]);

  useEffect(() => {
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startInterval]);

  if (!movies.length) return null;

  const movie = movies[current] ?? movies[0];
  const isInWatchlist = watchlistIds.includes(movie.id);

  return (
    <div
      className="full-bleed relative overflow-hidden"
      style={{ height: 540, marginTop: -32 }}
    >
      {/* Backdrop slides */}
      {movies.slice(0, 5).map((m, i) => (
        <div
          key={m.id}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          {m.backdrop
            ? <img src={m.backdrop} alt={m.title} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
            : <div className="w-full h-full bg-[#141414]" />
          }
        </div>
      ))}

      {/* Netflix-style gradients: dark on left, dark on bottom */}
      <div className="absolute inset-0" style={{
        zIndex: 2,
        background: 'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 35%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0) 100%)',
      }} />
      <div className="absolute inset-0" style={{
        zIndex: 2,
        background: 'linear-gradient(to top, rgba(9,9,9,1) 0%, rgba(9,9,9,0.5) 25%, transparent 60%)',
      }} />
      {/* Slight top vignette */}
      <div className="absolute inset-0" style={{
        zIndex: 2,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 20%)',
      }} />

      {/* Content — bottom-left like Netflix */}
      <div
        className="absolute left-0 right-0 bottom-0 flex flex-col justify-end pb-14 px-10 md:px-16"
        style={{ zIndex: 3 }}
      >
        {/* Genre tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {movie.genres.slice(0, 3).map(g => (
            <span key={g} className="text-xs px-2.5 py-0.5 rounded-sm font-medium"
              style={{ background: 'rgba(192,57,43,0.75)', color: '#fff' }}>
              {g}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-black text-white leading-none drop-shadow-2xl mb-3"
          style={{ fontSize: 'clamp(2.4rem, 5vw, 4.5rem)', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          {movie.title}
        </h1>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 text-sm">
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-white font-semibold">{movie.rating.toFixed(1)}</span>
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-300">{movie.year}</span>
        </div>

        {/* Description */}
        {movie.overview && (
          <p className="text-gray-300 text-sm leading-relaxed mb-6 line-clamp-2"
            style={{ maxWidth: '38rem', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            {movie.overview}
          </p>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onOpenModal(movie.id)}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold rounded text-sm hover:bg-gray-200 transition-colors duration-150"
          >
            <Info className="w-4 h-4" /> More Info
          </button>
          {hasUser && (
            <button
              onClick={() => onToggleWatchlist(movie)}
              className="flex items-center gap-2 px-5 py-2.5 font-semibold rounded text-sm transition-colors duration-150"
              style={isInWatchlist
                ? { background: '#C0392B', color: '#fff' }
                : { background: 'rgba(109,109,110,0.7)', color: '#fff' }}
            >
              {isInWatchlist
                ? <><BookmarkCheck className="w-4 h-4" /> In Watchlist</>
                : <><Bookmark className="w-4 h-4" /> Watchlist</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Slide dots — bottom-right */}
      {total > 1 && (
        <div className="absolute bottom-5 right-10 flex gap-1.5" style={{ zIndex: 3 }}>
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); startInterval(); }}
              className="h-[3px] rounded-full transition-all duration-300"
              style={{
                width: i === current ? 20 : 8,
                background: i === current ? '#C0392B' : 'rgba(255,255,255,0.4)',
              }}
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

  const [selectedMovieId,  setSelectedMovieId]  = useState<string | null>(null);
  const [activeProvider,   setActiveProvider]    = useState('all');
  const [hoveredProvider,  setHoveredProvider]   = useState<string | null>(null);

  // General rows
  const [heroMovies,       setHeroMovies]        = useState<Movie[]>([]);
  const [trendingMovies,   setTrendingMovies]    = useState<Movie[]>([]);
  const [newReleases,      setNewReleases]       = useState<Movie[]>([]);
  const [topRated,         setTopRated]          = useState<Movie[]>([]);
  const [classics,         setClassics]          = useState<Movie[]>([]);
  const [actionMovies,     setActionMovies]      = useState<Movie[]>([]);
  const [comedyMovies,     setComedyMovies]      = useState<Movie[]>([]);
  const [horrorMovies,     setHorrorMovies]      = useState<Movie[]>([]);
  const [scifiMovies,      setScifiMovies]       = useState<Movie[]>([]);
  const [acclaimed,        setAcclaimed]         = useState<Movie[]>([]);
  const [comingSoon,       setComingSoon]        = useState<Movie[]>([]);
  const [recommended,      setRecommended]       = useState<Movie[]>([]);

  // User rows
  const [userWatched,      setUserWatched]       = useState<WatchedMovie[]>([]);
  const [recentSpins,      setRecentSpins]       = useState<Movie[]>([]);
  const [watchlistIds,     setWatchlistIds]      = useState<string[]>([]);
  const [loading,          setLoading]           = useState(true);

  // Provider rows
  const [providerPopular,  setProviderPopular]   = useState<Movie[]>([]);
  const [providerTopRated, setProviderTopRated]  = useState<Movie[]>([]);
  const [providerNew,      setProviderNew]       = useState<Movie[]>([]);
  const [providerLoading,  setProviderLoading]   = useState(false);

  // ── Initial load ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [trending, nowPlaying, topRatedData, classicsData] = await Promise.all([
        getTrendingMovies('week').catch(() => [] as Movie[]),
        getNowPlayingMovies().catch(() => [] as Movie[]),
        getTopRatedMovies().catch(() => [] as Movie[]),
        discoverMovies({ year_to: '1994', sort_by: 'rating', min_rating: 7 }).catch(() => [] as Movie[]),
      ]);
      if (cancelled) return;

      setHeroMovies(trending.slice(0, 5));
      setTrendingMovies(trending.slice(0, ROW_LIMIT));
      setNewReleases(nowPlaying.slice(0, ROW_LIMIT));
      setTopRated(topRatedData.slice(0, ROW_LIMIT));
      setClassics(classicsData.slice(0, ROW_LIMIT));
      setLoading(false);

      // Genre rows in background
      Promise.all([
        discoverMovies({ genre_id: '28|12', sort_by: 'popularity' }).catch(() => [] as Movie[]),
        discoverMovies({ genre_id: '35',    sort_by: 'popularity' }).catch(() => [] as Movie[]),
        discoverMovies({ genre_id: '27',    sort_by: 'popularity' }).catch(() => [] as Movie[]),
        discoverMovies({ genre_id: '878',   sort_by: 'popularity' }).catch(() => [] as Movie[]),
        discoverMovies({ sort_by: 'rating', min_rating: 8 }).catch(() => [] as Movie[]),
        getUpcomingMovies().catch(() => [] as Movie[]),
      ]).then(([action, comedy, horror, scifi, acc, upcoming]) => {
        if (cancelled) return;
        setActionMovies(action.slice(0, ROW_LIMIT));
        setComedyMovies(comedy.slice(0, ROW_LIMIT));
        setHorrorMovies(horror.slice(0, ROW_LIMIT));
        setScifiMovies(scifi.slice(0, ROW_LIMIT));
        setAcclaimed(acc.slice(0, ROW_LIMIT));
        setComingSoon(upcoming.slice(0, ROW_LIMIT));
      });

      if (user) {
        getWatchLater(user.user_id).then(ids => { if (!cancelled) setWatchlistIds(ids); });

        getWatchedMovies(user.user_id).then(watched => {
          if (cancelled || !watched.length) return;
          setUserWatched(watched);
          getMovieRecommendations(watched[0].movie_id).then(recs => {
            if (!cancelled) setRecommended(recs.slice(0, ROW_LIMIT));
          });
        });

        getRouletteHistory(user.user_id, ROW_LIMIT).then(spins => {
          if (!cancelled) setRecentSpins(spins.map(spinToMovie));
        });
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Provider rows ──────────────────────────────────────────────
  useEffect(() => {
    if (activeProvider === 'all') return;
    const key = PROVIDER_KEY[activeProvider];
    if (!key) return;
    setProviderLoading(true);
    const sf = { [key]: true };
    Promise.all([
      discoverMovies({ services_filter: sf, sort_by: 'popularity' }).catch(() => [] as Movie[]),
      discoverMovies({ services_filter: sf, sort_by: 'rating'     }).catch(() => [] as Movie[]),
      discoverMovies({ services_filter: sf, sort_by: 'newest'     }).catch(() => [] as Movie[]),
    ]).then(([pop, top, newM]) => {
      setProviderPopular(pop.slice(0, ROW_LIMIT));
      setProviderTopRated(top.slice(0, ROW_LIMIT));
      setProviderNew(newM.slice(0, ROW_LIMIT));
      setProviderLoading(false);
    });
  }, [activeProvider]);

  // ── Derived ────────────────────────────────────────────────────
  const top10 = useMemo<Movie[]>(() =>
    [...userWatched]
      .sort((a, b) => (b.user_rating ?? 0) - (a.user_rating ?? 0))
      .slice(0, 10)
      .map(watchedToMovie),
    [userWatched]);

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

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-gray-500">Loading…</div>;
  }

  const isProviderView = activeProvider !== 'all';

  return (
    <div>

      {/* ── Hero: full-bleed, cancels container py-8 ── */}
      <HeroSection
        movies={heroMovies}
        onOpenModal={setSelectedMovieId}
        onToggleWatchlist={handleToggleWatchlist}
        watchlistIds={watchlistIds}
        hasUser={!!user}
      />

      {/* ── Provider tab bar ── */}
      <div className="px-6 md:px-10 mt-14 mb-8" style={{ overflow: 'visible' }}>
        <div
          className="hide-scrollbar flex gap-6 justify-evenly overflow-x-auto"
          style={{ scrollbarWidth: 'none', overflow: 'visible' } as React.CSSProperties}
        >
          {PROVIDER_TABS.map(p => {
            const color     = PROVIDER_COLOR[p.id] ?? '#C0392B';
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
                  background: 'none',
                  border:     'none',
                  outline:    'none',
                  padding:    '4px 0 8px',
                  transform:  isHovered ? 'translateY(-4px) scale(1.08)' : 'translateY(0) scale(1)',
                  opacity:    lit ? 1 : 0.55,
                }}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={p.label}
                    className="rounded-xl object-cover"
                    style={{
                      width:     68,
                      height:    68,
                      boxShadow: lit ? `0 0 18px ${color}88` : 'none',
                      transition: 'box-shadow 0.25s',
                    }}
                  />
                ) : (
                  <Layers style={{ width: 48, height: 48, color: lit ? color : '#6b7280' }} />
                )}
                <span
                  className="text-[11px] font-semibold tracking-wide"
                  style={{ color: lit ? '#fff' : '#9ca3af' }}
                >
                  {p.label}
                </span>
                {/* active underline */}
                <div
                  style={{
                    height:     2,
                    width:      isActive ? '100%' : 0,
                    background: color,
                    borderRadius: 1,
                    transition: 'width 0.25s',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Movie rows ── */}
      <div className="px-6 md:px-10">

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
              <MovieRow title="Your Top 10" movies={top10} onMovieClick={setSelectedMovieId} />
            )}
            {user && recentSpins.length > 0 && (
              <MovieRow title="Your Recent Spins" movies={recentSpins} onMovieClick={setSelectedMovieId} />
            )}
            {user && recommended.length > 0 && (
              <MovieRow title="Recommended Watches" movies={recommended} onMovieClick={setSelectedMovieId} />
            )}

            <MovieRow title="Trending Now"         movies={trendingMovies} onMovieClick={setSelectedMovieId} />
            <MovieRow title="New Releases"         movies={newReleases}    onMovieClick={setSelectedMovieId} />
            <MovieRow title="Top Rated"            movies={topRated}       onMovieClick={setSelectedMovieId} />
            <MovieRow title="Classics"             movies={classics}       onMovieClick={setSelectedMovieId} />
            <MovieRow title="Action & Adventure"   movies={actionMovies}   onMovieClick={setSelectedMovieId} />
            <MovieRow title="Comedy"               movies={comedyMovies}   onMovieClick={setSelectedMovieId} />
            <MovieRow title="Horror"               movies={horrorMovies}   onMovieClick={setSelectedMovieId} />
            <MovieRow title="Sci-Fi"               movies={scifiMovies}    onMovieClick={setSelectedMovieId} />
            <MovieRow title="Critically Acclaimed" movies={acclaimed}      onMovieClick={setSelectedMovieId} />
            <MovieRow title="Coming Soon"          movies={comingSoon}     onMovieClick={setSelectedMovieId} />
          </>
        )}

      </div>

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} onClose={() => setSelectedMovieId(null)} />
      )}

    </div>
  );
}
