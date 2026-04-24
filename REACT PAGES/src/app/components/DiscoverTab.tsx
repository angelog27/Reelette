import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Star, Bookmark, BookmarkCheck, Info, Layers } from 'lucide-react';
import { MovieCard } from './MovieCard';
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

// Brand colours — used for card glow + background
const PROVIDER_COLOR: Record<string, string> = {
  'all':        '#f97316',
  'Netflix':    '#E50914',
  'Disney+':    '#1A4DB5',
  'Hulu':       '#1CE783',
  'Max':        '#6C2BD9',
  'Paramount+': '#0064FF',
  'Apple TV+':  '#8E8E93',
};

// Maps display name → backend services_filter key
const PROVIDER_KEY: Record<string, string> = {
  'Netflix':    'netflix',
  'Disney+':    'disneyPlus',
  'Hulu':       'hulu',
  'Max':        'hboMax',
  'Paramount+': 'paramount',
  'Apple TV+':  'appleTV',
};

const ROW_LIMIT = 12;

// ── Converters ────────────────────────────────────────────────────

function watchedToMovie(w: WatchedMovie): Movie {
  return {
    id: w.movie_id,
    title: w.title,
    year: w.year,
    genres: w.genres ?? [],
    rating: w.tmdb_rating ?? 0,
    poster: w.poster ?? '',
    streamingService: w.services?.[0] ?? '',
  };
}

function spinToMovie(s: RouletteSpin): Movie {
  return {
    id: s.movie_id,
    title: s.movie_title,
    year: 0,
    genres: [],
    rating: 0,
    poster: s.poster_url ?? '',
    streamingService: '',
  };
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
    <div className="relative w-full overflow-hidden" style={{ height: '72vh', minHeight: 480 }}>
      {movies.slice(0, 5).map((m, i) => (
        <div key={m.id} className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}>
          {m.backdrop
            ? <img src={m.backdrop} alt={m.title} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
            : <div className="w-full h-full bg-[#141414]" />}
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-transparent" style={{ zIndex: 2 }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" style={{ zIndex: 2 }} />

      <div className="absolute inset-0 flex items-center px-8 md:px-14" style={{ zIndex: 3 }}>
        <div className="max-w-xl w-full">
          <div className="flex flex-wrap gap-2 mb-4">
            {movie.genres.slice(0, 3).map(g => (
              <span key={g} className="text-xs px-3 py-1 rounded-full border"
                style={{ color: '#f97316', borderColor: 'rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.12)' }}>
                {g}
              </span>
            ))}
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-3 leading-tight drop-shadow-lg">{movie.title}</h1>

          <div className="flex items-center gap-3 mb-4 text-sm text-gray-300">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-semibold">{movie.rating.toFixed(1)}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span>{movie.year}</span>
          </div>

          {movie.overview && (
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 line-clamp-3">{movie.overview}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={() => onOpenModal(movie.id)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all duration-200 text-sm">
              <Info className="w-4 h-4" /> More Info
            </button>
            {hasUser && (
              <button onClick={() => onToggleWatchlist(movie)}
                className="flex items-center gap-2 px-6 py-3 font-semibold rounded-full border transition-all duration-200 text-sm"
                style={isInWatchlist
                  ? { background: '#f97316', borderColor: '#f97316', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
                {isInWatchlist
                  ? <><BookmarkCheck className="w-4 h-4" /> In Watchlist</>
                  : <><Bookmark className="w-4 h-4" /> Add to Watchlist</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {total > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
          {Array.from({ length: total }).map((_, i) => (
            <button key={i} onClick={() => { setCurrent(i); startInterval(); }}
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: i === current ? 24 : 8, background: i === current ? '#f97316' : 'rgba(255,255,255,0.35)' }} />
          ))}
        </div>
      )}
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
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -600 : 600, behavior: 'smooth' });

  return (
    <div className="mb-10">
      <h2 className="text-lg md:text-xl font-bold text-white mb-4 tracking-tight">{title}</h2>
      <div className="relative group">
        <button onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(249,115,22,0.3)' }}>
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div ref={scrollRef}
          className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
          {movies.map(movie => (
            <div key={movie.id} className="min-w-[110px] md:min-w-[125px] flex-shrink-0">
              <MovieCard movie={movie} onClick={m => onMovieClick(m.id)} />
            </div>
          ))}
        </div>

        <button onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(249,115,22,0.3)' }}>
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

// ── DiscoverTab ───────────────────────────────────────────────────

export function DiscoverTab() {
  const user = getUser();

  const [selectedMovieId,   setSelectedMovieId]   = useState<string | null>(null);
  const [activeProvider,    setActiveProvider]     = useState('all');
  const [hoveredProvider,   setHoveredProvider]    = useState<string | null>(null);

  // General rows
  const [heroMovies,        setHeroMovies]         = useState<Movie[]>([]);
  const [trendingMovies,    setTrendingMovies]      = useState<Movie[]>([]);
  const [newReleases,       setNewReleases]         = useState<Movie[]>([]);
  const [topRated,          setTopRated]            = useState<Movie[]>([]);
  const [classics,          setClassics]            = useState<Movie[]>([]);
  const [actionMovies,      setActionMovies]        = useState<Movie[]>([]);
  const [comedyMovies,      setComedyMovies]        = useState<Movie[]>([]);
  const [horrorMovies,      setHorrorMovies]        = useState<Movie[]>([]);
  const [scifiMovies,       setScifiMovies]         = useState<Movie[]>([]);
  const [acclaimed,         setAcclaimed]           = useState<Movie[]>([]);
  const [comingSoon,        setComingSoon]          = useState<Movie[]>([]);
  const [recommended,       setRecommended]         = useState<Movie[]>([]);

  // User-specific rows
  const [userWatched,       setUserWatched]         = useState<WatchedMovie[]>([]);
  const [recentSpins,       setRecentSpins]         = useState<Movie[]>([]);
  const [watchlistIds,      setWatchlistIds]        = useState<string[]>([]);
  const [loading,           setLoading]             = useState(true);

  // Provider-specific rows
  const [providerPopular,   setProviderPopular]     = useState<Movie[]>([]);
  const [providerTopRated,  setProviderTopRated]    = useState<Movie[]>([]);
  const [providerNew,       setProviderNew]         = useState<Movie[]>([]);
  const [providerLoading,   setProviderLoading]     = useState(false);

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

      // Genre + more rows (background)
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

      // User-specific
      if (user) {
        getWatchLater(user.user_id).then(ids => { if (!cancelled) setWatchlistIds(ids); });

        getWatchedMovies(user.user_id).then(watched => {
          if (cancelled || !watched.length) return;
          setUserWatched(watched);
          const last = watched[0];
          getMovieRecommendations(last.movie_id).then(recs => {
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
  const top10: Movie[] = useMemo(() =>
    [...userWatched]
      .sort((a, b) => (b.user_rating ?? 0) - (a.user_rating ?? 0))
      .slice(0, 10)
      .map(watchedToMovie),
    [userWatched]);

  const providerWatched: Movie[] = useMemo(() => {
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
    <div className="-mx-6 -mt-8">

      {/* ── Hero ── */}
      <HeroSection
        movies={heroMovies}
        onOpenModal={setSelectedMovieId}
        onToggleWatchlist={handleToggleWatchlist}
        watchlistIds={watchlistIds}
        hasUser={!!user}
      />

      {/* ── Provider cards ── */}
      <div className="px-6 mt-10 mb-10">
        <div
          className="hide-scrollbar flex gap-4 justify-evenly overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          {PROVIDER_TABS.map(p => {
            const color      = PROVIDER_COLOR[p.id] ?? '#f97316';
            const isActive   = activeProvider === p.id;
            const isHovered  = hoveredProvider === p.id;
            const logo       = p.id !== 'all' ? PROVIDER_LOGOS[p.id] : null;
            const lit        = isActive || isHovered;

            return (
              <button
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                onMouseEnter={() => setHoveredProvider(p.id)}
                onMouseLeave={() => setHoveredProvider(null)}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-300"
                style={{
                  width:      130,
                  height:     118,
                  border:     'none',
                  outline:    'none',
                  background: lit
                    ? `radial-gradient(ellipse 90% 70% at 50% 110%, ${color}50 0%, #1C1C1C 65%)`
                    : `radial-gradient(ellipse 80% 55% at 50% 110%, ${color}22 0%, #141414 70%)`,
                  boxShadow: lit
                    ? `0 20px 48px ${color}55, 0 4px 16px ${color}30, inset 0 1px 0 rgba(255,255,255,0.06)`
                    : 'none',
                  transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
                }}
              >
                {logo ? (
                  <img src={logo} alt={p.label} className="rounded-xl object-cover"
                    style={{ width: 52, height: 52 }} />
                ) : (
                  // "All" card — layered icon in app accent colour
                  <Layers style={{ width: 44, height: 44, color: lit ? color : '#6b7280' }} />
                )}
                <span className="text-xs font-medium tracking-wide"
                  style={{ color: lit ? '#fff' : '#9ca3af' }}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Movie rows ── */}
      <div className="px-6">

        {isProviderView ? (
          providerLoading ? (
            <div className="text-gray-500 text-center py-16">Loading {activeProvider}…</div>
          ) : (
            <>
              <MovieRow title={`Popular on ${activeProvider}`}   movies={providerPopular}  onMovieClick={setSelectedMovieId} />
              <MovieRow title={`Top Rated on ${activeProvider}`} movies={providerTopRated} onMovieClick={setSelectedMovieId} />
              <MovieRow title={`New on ${activeProvider}`}       movies={providerNew}      onMovieClick={setSelectedMovieId} />
              {providerWatched.length > 0 && (
                <MovieRow title={`Your Recent Watches on ${activeProvider}`} movies={providerWatched} onMovieClick={setSelectedMovieId} />
              )}
            </>
          )
        ) : (
          <>
            {/* User-specific rows first when logged in */}
            {user && top10.length > 0 && (
              <MovieRow title="Your Top 10" movies={top10} onMovieClick={setSelectedMovieId} />
            )}
            {user && recentSpins.length > 0 && (
              <MovieRow title="Your Recent Spins" movies={recentSpins} onMovieClick={setSelectedMovieId} />
            )}
            {user && recommended.length > 0 && (
              <MovieRow title="Recommended Watches" movies={recommended} onMovieClick={setSelectedMovieId} />
            )}

            {/* General rows */}
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
