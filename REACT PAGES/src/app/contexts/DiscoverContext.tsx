import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  getTrendingMovies, getTopRatedMovies, getNowPlayingMovies, getUpcomingMovies,
  discoverMovies, getMovieRecommendations, getWatchedMovies, getRouletteHistory,
  getWatchLater, getUser,
} from '../services/api';
import type { Movie, WatchedMovie, RouletteSpin } from '../services/api';

const ROW_LIMIT = 14;
// Cache the most-recently-watched movie ID so recommendations can be kicked off
// immediately on mount, without waiting for getWatchedMovies to resolve first.
const LAST_WATCHED_KEY = 'reelette_last_watched_id';

function spinToMovie(s: RouletteSpin): Movie {
  return {
    id: s.movie_id, title: s.movie_title, year: 0,
    genres: [], rating: 0,
    poster: s.poster_url ?? '', streamingService: '',
  };
}

export interface ProviderRows {
  popular:  Movie[];
  topRated: Movie[];
  newMovies: Movie[];
}

interface DiscoverContextValue {
  // General rows — null means still loading, [] means loaded but empty
  heroMovies:       Movie[] | null;
  trendingMovies:   Movie[] | null;
  newReleases:      Movie[] | null;
  topRated:         Movie[] | null;
  classics:         Movie[] | null;
  actionMovies:     Movie[] | null;
  comedyMovies:     Movie[] | null;
  horrorMovies:     Movie[] | null;
  scifiMovies:      Movie[] | null;
  acclaimed:        Movie[] | null;
  comingSoon:       Movie[] | null;
  recommended:      Movie[] | null;
  // User rows
  userWatched:      WatchedMovie[];
  recentSpins:      Movie[] | null;
  watchlistIds:     string[];
  setWatchlistIds:  (fn: (prev: string[]) => string[]) => void;
  // Provider rows — keyed by provider id (e.g. 'Netflix'), persists across tab switches
  providerCache:    Record<string, ProviderRows>;
  cacheProvider:    (id: string, rows: ProviderRows) => void;
}

const DiscoverCtx = createContext<DiscoverContextValue | null>(null);

export function DiscoverProvider({ children }: { children: React.ReactNode }) {
  const user = getUser();

  const [heroMovies,     setHeroMovies]     = useState<Movie[] | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[] | null>(null);
  const [newReleases,    setNewReleases]    = useState<Movie[] | null>(null);
  const [topRated,       setTopRated]       = useState<Movie[] | null>(null);
  const [classics,       setClassics]       = useState<Movie[] | null>(null);
  const [actionMovies,   setActionMovies]   = useState<Movie[] | null>(null);
  const [comedyMovies,   setComedyMovies]   = useState<Movie[] | null>(null);
  const [horrorMovies,   setHorrorMovies]   = useState<Movie[] | null>(null);
  const [scifiMovies,    setScifiMovies]    = useState<Movie[] | null>(null);
  const [acclaimed,      setAcclaimed]      = useState<Movie[] | null>(null);
  const [comingSoon,     setComingSoon]     = useState<Movie[] | null>(null);
  const [recommended,    setRecommended]    = useState<Movie[] | null>(null);
  const [userWatched,    setUserWatched]    = useState<WatchedMovie[]>([]);
  const [recentSpins,    setRecentSpins]    = useState<Movie[] | null>(null);
  const [watchlistIds,   _setWatchlistIds]  = useState<string[]>([]);
  const setWatchlistIds = useCallback(
    (fn: (prev: string[]) => string[]) => _setWatchlistIds(fn),
    []
  );

  const [providerCache, setProviderCache] = useState<Record<string, ProviderRows>>({});
  const cacheProvider = useCallback((id: string, rows: ProviderRows) => {
    setProviderCache(prev => ({ ...prev, [id]: rows }));
  }, []);

  // Guard: only fetch once per provider lifetime, even in React 18 StrictMode double-invoke
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Kick off recommendations immediately using the cached last-watched ID.
    // This runs in parallel with getWatchedMovies rather than waiting for it.
    const lastWatchedId = localStorage.getItem(LAST_WATCHED_KEY);
    if (user && lastWatchedId) {
      getMovieRecommendations(lastWatchedId)
        .then(recs => setRecommended(recs.slice(0, ROW_LIMIT)))
        .catch(() => setRecommended([]));
    } else if (!user) {
      setRecommended([]);
    }

    // ── All 10 catalogue rows fire simultaneously ──────────────────
    getTrendingMovies('week')
      .then(d => { setHeroMovies(d.slice(0, 5)); setTrendingMovies(d.slice(0, ROW_LIMIT)); })
      .catch(() => { setHeroMovies([]); setTrendingMovies([]); });

    getNowPlayingMovies()
      .then(d => setNewReleases(d.slice(0, ROW_LIMIT)))
      .catch(() => setNewReleases([]));

    getTopRatedMovies()
      .then(d => setTopRated(d.slice(0, ROW_LIMIT)))
      .catch(() => setTopRated([]));

    discoverMovies({ year_to: '1994', sort_by: 'rating', min_rating: 7 })
      .then(d => setClassics(d.slice(0, ROW_LIMIT)))
      .catch(() => setClassics([]));

    discoverMovies({ genre_id: '28|12', sort_by: 'popularity' })
      .then(d => setActionMovies(d.slice(0, ROW_LIMIT)))
      .catch(() => setActionMovies([]));

    discoverMovies({ genre_id: '35', sort_by: 'popularity' })
      .then(d => setComedyMovies(d.slice(0, ROW_LIMIT)))
      .catch(() => setComedyMovies([]));

    discoverMovies({ genre_id: '27', sort_by: 'popularity' })
      .then(d => setHorrorMovies(d.slice(0, ROW_LIMIT)))
      .catch(() => setHorrorMovies([]));

    discoverMovies({ genre_id: '878', sort_by: 'popularity' })
      .then(d => setScifiMovies(d.slice(0, ROW_LIMIT)))
      .catch(() => setScifiMovies([]));

    discoverMovies({ sort_by: 'rating', min_rating: 8 })
      .then(d => setAcclaimed(d.slice(0, ROW_LIMIT)))
      .catch(() => setAcclaimed([]));

    getUpcomingMovies()
      .then(d => setComingSoon(d.slice(0, ROW_LIMIT)))
      .catch(() => setComingSoon([]));

    // ── User-specific rows ─────────────────────────────────────────
    if (user) {
      getWatchLater(user.user_id)
        .then(ids => _setWatchlistIds(ids))
        .catch(() => {});

      getWatchedMovies(user.user_id, 200)
        .then(watched => {
          if (!watched.length) {
            // No watch history — nothing to base recommendations on
            if (!lastWatchedId) setRecommended([]);
            return;
          }
          setUserWatched(watched);
          const id = watched[0].movie_id;
          localStorage.setItem(LAST_WATCHED_KEY, id);
          // Only start recommendations from watched data if we had no cached ID
          if (!lastWatchedId) {
            getMovieRecommendations(id)
              .then(recs => setRecommended(recs.slice(0, ROW_LIMIT)))
              .catch(() => setRecommended([]));
          }
        })
        .catch(() => {
          if (!lastWatchedId) setRecommended([]);
        });

      getRouletteHistory(user.user_id, ROW_LIMIT)
        .then(spins => setRecentSpins(spins.map(spinToMovie)))
        .catch(() => setRecentSpins([]));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DiscoverCtx.Provider value={{
      heroMovies, trendingMovies, newReleases, topRated, classics,
      actionMovies, comedyMovies, horrorMovies, scifiMovies, acclaimed, comingSoon,
      recommended, userWatched, recentSpins, watchlistIds, setWatchlistIds,
      providerCache, cacheProvider,
    }}>
      {children}
    </DiscoverCtx.Provider>
  );
}

export function useDiscover(): DiscoverContextValue {
  const ctx = useContext(DiscoverCtx);
  if (!ctx) throw new Error('useDiscover must be called inside <DiscoverProvider>');
  return ctx;
}
