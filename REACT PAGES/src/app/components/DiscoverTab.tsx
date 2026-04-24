import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, Bookmark, BookmarkCheck, Info } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { MovieDetailModal } from './MovieDetailModal';
import {
  getTrendingMovies, getTopRatedMovies, getNowPlayingMovies,
  discoverMovies, getMovieRecommendations, getWatchedMovies,
  watchMovieLater, removeFromWatchLater, getWatchLater, getUser,
} from '../services/api';
import type { Movie } from '../services/api';
import { PROVIDER_LOGOS } from '../constants/providers';

const PROVIDER_TABS = [
  { id: 'all',         label: 'All' },
  { id: 'Netflix',     label: 'Netflix' },
  { id: 'Disney+',     label: 'Disney+' },
  { id: 'Hulu',        label: 'Hulu' },
  { id: 'Max',         label: 'Max' },
  { id: 'Paramount+',  label: 'Paramount+' },
  { id: 'Apple TV+',   label: 'Apple TV+' },
];

// ── Hero Section ──────────────────────────────────────────────────

interface HeroProps {
  movies: Movie[];
  onOpenModal: (id: string) => void;
  onToggleWatchlist: (movie: Movie) => void;
  watchlistIds: string[];
  hasUser: boolean;
}

function HeroSection({ movies, onOpenModal, onToggleWatchlist, watchlistIds, hasUser }: HeroProps) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = Math.min(movies.length, 5);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (total <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % total);
    }, 6000);
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
      {/* Slides with crossfade */}
      {movies.slice(0, 5).map((m, i) => (
        <div
          key={m.id}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          {m.backdrop ? (
            <img
              src={m.backdrop}
              alt={m.title}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="w-full h-full bg-[#141414]" />
          )}
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-transparent" style={{ zIndex: 2 }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" style={{ zIndex: 2 }} />

      {/* Content */}
      <div className="absolute inset-0 flex items-center px-8 md:px-14" style={{ zIndex: 3 }}>
        <div className="max-w-xl w-full">
          {/* Genre badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {movie.genres.slice(0, 3).map(g => (
              <span
                key={g}
                className="text-xs px-3 py-1 rounded-full border"
                style={{ color: '#f97316', borderColor: 'rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.12)' }}
              >
                {g}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-black text-white mb-3 leading-tight drop-shadow-lg">
            {movie.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-4 text-sm text-gray-300">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-semibold">{movie.rating.toFixed(1)}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span>{movie.year}</span>
          </div>

          {/* Overview */}
          {movie.overview && (
            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 line-clamp-3">
              {movie.overview}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onOpenModal(movie.id)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all duration-200 text-sm"
            >
              <Info className="w-4 h-4" />
              More Info
            </button>
            {hasUser && (
              <button
                onClick={() => onToggleWatchlist(movie)}
                className="flex items-center gap-2 px-6 py-3 font-semibold rounded-full border transition-all duration-200 text-sm"
                style={
                  isInWatchlist
                    ? { background: '#f97316', borderColor: '#f97316', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }
                }
              >
                {isInWatchlist
                  ? <><BookmarkCheck className="w-4 h-4" /> In Watchlist</>
                  : <><Bookmark className="w-4 h-4" /> Add to Watchlist</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); startInterval(); }}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 8,
                background: i === current ? '#f97316' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Movie Row ─────────────────────────────────────────────────────

interface MovieRowProps {
  title: string;
  movies: Movie[];
  activeProvider: string;
  onMovieClick: (id: string) => void;
}

function MovieRow({ title, movies, activeProvider, onMovieClick }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = activeProvider === 'all'
    ? movies
    : movies.filter(m => m.streamingService === activeProvider);

  // Show original list when filtered list is empty (provider tab selected but no matches)
  const displayed = filtered.length > 0 ? filtered : activeProvider === 'all' ? movies : [];

  if (displayed.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -640 : 640, behavior: 'smooth' });
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg md:text-xl font-bold text-white mb-4 tracking-tight">{title}</h2>
      <div className="relative group">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(249,115,22,0.3)' }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="hide-scrollbar flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {displayed.map(movie => (
            <div key={movie.id} className="min-w-[150px] md:min-w-[170px] flex-shrink-0">
              <MovieCard movie={movie} onClick={m => onMovieClick(m.id)} />
            </div>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(249,115,22,0.3)' }}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

// ── DiscoverTab ───────────────────────────────────────────────────

export function DiscoverTab() {
  const user = getUser();

  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState('all');

  const [heroMovies,      setHeroMovies]      = useState<Movie[]>([]);
  const [trendingMovies,  setTrendingMovies]  = useState<Movie[]>([]);
  const [newReleases,     setNewReleases]     = useState<Movie[]>([]);
  const [topRated,        setTopRated]        = useState<Movie[]>([]);
  const [classics,        setClassics]        = useState<Movie[]>([]);
  const [recommended,     setRecommended]     = useState<Movie[]>([]);
  const [lastWatchedTitle, setLastWatchedTitle] = useState('');
  const [watchlistIds,    setWatchlistIds]    = useState<string[]>([]);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [trending, nowPlaying, topRatedData, classicsData] = await Promise.all([
        getTrendingMovies('week'),
        getNowPlayingMovies(),
        getTopRatedMovies(),
        discoverMovies({ year_to: '1994', sort_by: 'rating', min_rating: 7 }),
      ]);

      if (cancelled) return;
      setHeroMovies(trending.slice(0, 5));
      setTrendingMovies(trending);
      setNewReleases(nowPlaying);
      setTopRated(topRatedData);
      setClassics(classicsData);
      setLoading(false);

      // Load user-specific data separately (non-blocking)
      if (user) {
        getWatchLater(user.user_id).then(ids => {
          if (!cancelled) setWatchlistIds(ids);
        });

        getWatchedMovies(user.user_id).then(watched => {
          if (cancelled || !watched.length) return;
          const last = watched[0];
          setLastWatchedTitle(last.title);
          getMovieRecommendations(last.movie_id).then(recs => {
            if (!cancelled) setRecommended(recs);
          });
        });
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

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
    return (
      <div className="flex items-center justify-center py-32 text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    // Break out of the parent container's px-6 py-8 padding for the hero
    <div className="-mx-6 -mt-8">
      {/* ── Hero ── */}
      <HeroSection
        movies={heroMovies}
        onOpenModal={setSelectedMovieId}
        onToggleWatchlist={handleToggleWatchlist}
        watchlistIds={watchlistIds}
        hasUser={!!user}
      />

      {/* ── Streaming provider tabs ── */}
      <div className="px-6 mt-6 mb-6">
        <div
          className="hide-scrollbar flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          {PROVIDER_TABS.map(p => {
            const isActive = activeProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 text-sm font-medium flex-shrink-0 border"
                style={
                  isActive
                    ? { background: '#f97316', borderColor: '#f97316', color: '#fff' }
                    : { background: '#1C1C1C', borderColor: '#2A2A2A', color: '#ccc' }
                }
              >
                {p.id !== 'all' && PROVIDER_LOGOS[p.id] && (
                  <img
                    src={PROVIDER_LOGOS[p.id]}
                    alt={p.label}
                    className="w-5 h-5 rounded object-cover flex-shrink-0"
                  />
                )}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Movie rows ── */}
      <div className="px-6">
        <MovieRow
          title="Trending Now"
          movies={trendingMovies}
          activeProvider={activeProvider}
          onMovieClick={setSelectedMovieId}
        />
        <MovieRow
          title="New Releases"
          movies={newReleases}
          activeProvider={activeProvider}
          onMovieClick={setSelectedMovieId}
        />
        <MovieRow
          title="Top Rated"
          movies={topRated}
          activeProvider={activeProvider}
          onMovieClick={setSelectedMovieId}
        />
        <MovieRow
          title="Classics"
          movies={classics}
          activeProvider={activeProvider}
          onMovieClick={setSelectedMovieId}
        />
        {lastWatchedTitle && recommended.length > 0 && (
          <MovieRow
            title={`Because You Watched ${lastWatchedTitle}`}
            movies={recommended}
            activeProvider={activeProvider}
            onMovieClick={setSelectedMovieId}
          />
        )}
      </div>

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
