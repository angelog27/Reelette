import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  getHomeFeed,
  getTrendingMovies, getTopRatedMovies, getNowPlayingMovies, getUpcomingMovies,
  discoverMovies, getRecommendedMovies, getWatchedMovies, getRouletteHistory,
  getWatchLater, getUser,
  getTrendingShows, getPopularShows, getTopRatedShows, discoverShows,
  getAIRecommendations,
} from '../services/api';
import type { Movie, WatchedMovie, RouletteSpin, AIRecommendationRow, HomeRows } from '../services/api';

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
    const tagShow = (arr: Movie[]) => arr.map(m => ({ ...m, type: 'show' as const }));
    getTrendingShows().then(r => setShowsTrending(tagShow(r))).catch(() => setShowsTrending([]));
    getPopularShows().then(r => setShowsPopular(tagShow(r))).catch(() => setShowsPopular([]));
    getTopRatedShows().then(r => setShowsTopRated(tagShow(r))).catch(() => setShowsTopRated([]));
    discoverShows({ genre_id: '18' }).then(r => setShowsDrama(tagShow(r))).catch(() => setShowsDrama([]));
    discoverShows({ genre_id: '35' }).then(r => setShowsComedy(tagShow(r))).catch(() => setShowsComedy([]));
    discoverShows({ genre_id: '80' }).then(r => setShowsCrime(tagShow(r))).catch(() => setShowsCrime([]));
    discoverShows({ genre_id: '10765' }).then(r => setShowsScifi(tagShow(r))).catch(() => setShowsScifi([]));
    discoverShows({ genre_id: '16' }).then(r => setShowsAnimation(tagShow(r))).catch(() => setShowsAnimation([]));
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

    // Fetch recommendations filtered by the user's saved streaming services.
    if (user) {
      getRecommendedMovies()
        .then(recs => setRecommended(recs.slice(0, ROW_LIMIT)))
        .catch(() => setRecommended([]));
    } else {
      setRecommended([]);
    }

    // ── Generic catalogue rows ─────────────────────────────────────
    // Prefer the single batched /api/home request (1 round trip, server-side
    // fan-out, deduped provider lookups). Fall back to the per-row endpoints
    // if it fails, so behaviour is never worse than before.
    const sliceTo = (d: Movie[] | undefined) => (d ?? []).slice(0, ROW_LIMIT);

    const fetchRowsIndividually = () => {
      getTrendingMovies('week')
        .then(d => { setHeroMovies(d.slice(0, 5)); setTrendingMovies(d.slice(0, ROW_LIMIT)); })
        .catch(() => { setHeroMovies([]); setTrendingMovies([]); });
      getNowPlayingMovies().then(d => setNewReleases(sliceTo(d))).catch(() => setNewReleases([]));
      getTopRatedMovies().then(d => setTopRated(sliceTo(d))).catch(() => setTopRated([]));
      discoverMovies({ year_to: '1994', sort_by: 'rating', min_rating: 7 })
        .then(d => setClassics(sliceTo(d))).catch(() => setClassics([]));
      discoverMovies({ genre_id: '28|12', sort_by: 'popularity' })
        .then(d => setActionMovies(sliceTo(d))).catch(() => setActionMovies([]));
      discoverMovies({ genre_id: '35', sort_by: 'popularity' })
        .then(d => setComedyMovies(sliceTo(d))).catch(() => setComedyMovies([]));
      discoverMovies({ genre_id: '27', sort_by: 'popularity' })
        .then(d => setHorrorMovies(sliceTo(d))).catch(() => setHorrorMovies([]));
      discoverMovies({ genre_id: '878', sort_by: 'popularity' })
        .then(d => setScifiMovies(sliceTo(d))).catch(() => setScifiMovies([]));
      discoverMovies({ sort_by: 'rating', min_rating: 8 })
        .then(d => setAcclaimed(sliceTo(d))).catch(() => setAcclaimed([]));
      getUpcomingMovies().then(d => setComingSoon(sliceTo(d))).catch(() => setComingSoon([]));
    };

    const applyRows = (rows: HomeRows) => {
      setHeroMovies(rows.trending.slice(0, 5));
      setTrendingMovies(sliceTo(rows.trending));
      setNewReleases(sliceTo(rows.nowPlaying));
      setTopRated(sliceTo(rows.topRated));
      setComingSoon(sliceTo(rows.upcoming));
      setClassics(sliceTo(rows.classics));
      setActionMovies(sliceTo(rows.action));
      setComedyMovies(sliceTo(rows.comedy));
      setHorrorMovies(sliceTo(rows.horror));
      setScifiMovies(sliceTo(rows.scifi));
      setAcclaimed(sliceTo(rows.acclaimed));
    };

    getHomeFeed()
      .then(rows => { if (rows) applyRows(rows); else fetchRowsIndividually(); })
      .catch(() => fetchRowsIndividually());

    // ── User-specific rows ─────────────────────────────────────────
    if (user) {
      getWatchLater(user.user_id)
        .then(ids => _setWatchlistIds(ids))
        .catch(() => {});

      getWatchedMovies(user.user_id, 200)
        .then(watched => {
          if (!watched.length) return;
          setUserWatched(watched);
        })
        .catch(() => {});

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
