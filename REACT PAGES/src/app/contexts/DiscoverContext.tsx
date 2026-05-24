import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  getTrendingMovies, getTopRatedMovies, getNowPlayingMovies, getUpcomingMovies,
  discoverMovies, getMovieRecommendations, getWatchedMovies, getRouletteHistory,
  getWatchLater, getUser,
  getTrendingShows, getPopularShows, getTopRatedShows, discoverShows,
  getAIRecommendations,
} from '../services/api';
import type { Movie, WatchedMovie, RouletteSpin, AIRecommendationRow } from '../services/api';

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
  popular:      Movie[];
  newMovies:    Movie[];
  specificRows: Movie[][];
  showsPopular?: Movie[];
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
  // Shows rows — null = not yet loaded, loaded lazily on first switch to Shows mode
  showsTrending:    Movie[] | null;
  showsPopular:     Movie[] | null;
  showsTopRated:    Movie[] | null;
  showsDrama:       Movie[] | null;
  showsComedy:      Movie[] | null;
  showsCrime:       Movie[] | null;
  showsScifi:       Movie[] | null;
  showsAnimation:   Movie[] | null;
  triggerShowsFetch: () => void;
  // AI recommendation rows — null = loading, [] = no data or logged out
  aiRows: AIRecommendationRow[] | null;
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

  // Shows rows — fetched once on first request, persisted in-memory for the session
  const [showsTrending,  setShowsTrending]  = useState<Movie[] | null>(null);
  const [showsPopular,   setShowsPopular]   = useState<Movie[] | null>(null);
  const [showsTopRated,  setShowsTopRated]  = useState<Movie[] | null>(null);
  const [showsDrama,     setShowsDrama]     = useState<Movie[] | null>(null);
  const [showsComedy,    setShowsComedy]    = useState<Movie[] | null>(null);
  const [showsCrime,     setShowsCrime]     = useState<Movie[] | null>(null);
  const [showsScifi,     setShowsScifi]     = useState<Movie[] | null>(null);
  const [showsAnimation, setShowsAnimation] = useState<Movie[] | null>(null);
  const showsFetchedRef  = useRef(false);

  const triggerShowsFetch = useCallback(() => {
    if (showsFetchedRef.current) return;
    showsFetchedRef.current = true;
    getTrendingShows().then(setShowsTrending).catch(() => setShowsTrending([]));
    getPopularShows().then(setShowsPopular).catch(() => setShowsPopular([]));
    getTopRatedShows().then(setShowsTopRated).catch(() => setShowsTopRated([]));
    discoverShows({ genre_id: '18' }).then(setShowsDrama).catch(() => setShowsDrama([]));
    discoverShows({ genre_id: '35' }).then(setShowsComedy).catch(() => setShowsComedy([]));
    discoverShows({ genre_id: '80' }).then(setShowsCrime).catch(() => setShowsCrime([]));
    discoverShows({ genre_id: '10765' }).then(setShowsScifi).catch(() => setShowsScifi([]));
    discoverShows({ genre_id: '16' }).then(setShowsAnimation).catch(() => setShowsAnimation([]));
  }, []);

  // AI recommendation rows
  const [aiRows, setAiRows] = useState<AIRecommendationRow[] | null>(null);
  useEffect(() => {
    if (!user) { setAiRows([]); return; }
    getAIRecommendations().then(rows => setAiRows(rows)).catch(() => setAiRows([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      showsTrending, showsPopular, showsTopRated, showsDrama, showsComedy,
      showsCrime, showsScifi, showsAnimation, triggerShowsFetch,
      aiRows,
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
