import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, Info, Shuffle, RotateCcw, ArrowLeft, CheckCircle } from 'lucide-react';
import {
  discoverMovies,
  watchMovieLater,
  getWatchedMovies,
  getWatchLater,
  getMovieRecommendations,
  getTrendingMovies,
  getUser,
  getfriendsRouletteHistory,
  getRoulettePrefs,
  type Movie,
  type WatchedMovie,
} from '../services/api';
import { MovieDetailModal } from './MovieDetailModal';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 75;

const MOODS = [
  { label: 'Any',         genre: ''     },
  { label: 'Mind-bender', genre: '878'  },
  { label: 'Cozy',        genre: '35'   },
  { label: 'Date night',  genre: '10749'},
  { label: 'Horror',      genre: '27'   },
  { label: 'Action',      genre: '28'   },
];

const GENRE_ACCENT: Record<string, string> = {
  'Action':           '#ef4444',
  'Horror':           '#9333ea',
  'Comedy':           '#f59e0b',
  'Romance':          '#ec4899',
  'Science Fiction':  '#3b82f6',
  'Thriller':         '#475569',
  'Drama':            '#8b5cf6',
  'Animation':        '#10b981',
  'Fantasy':          '#6366f1',
  'Crime':            '#64748b',
  'Mystery':          '#7c3aed',
  'History':          '#b45309',
  'Documentary':      '#0891b2',
  'Music':            '#db2777',
  'War':              '#6b7280',
};

function getAccent(genres: string[]): string {
  for (const g of genres) {
    if (GENRE_ACCENT[g]) return GENRE_ACCENT[g];
  }
  return 'var(--reel-accent-hex)';
}

// ─────────────────────────────────────────────────────────────
// Recommendation engine
// ─────────────────────────────────────────────────────────────

function rerankDeck(movies: Movie[], affinity: Record<string, number>): Movie[] {
  return [...movies].sort((a, b) => {
    const score = (m: Movie) =>
      m.genres.reduce((s, g) => s + (affinity[g] || 0), 0) * 0.6
      + (m.rating / 10) * 0.3
      + (Math.random() - 0.5) * 0.25; // weighted shuffle — not fully deterministic
    return score(b) - score(a);
  });
}

// ─────────────────────────────────────────────────────────────
// Pool loader (mirrors RouletteTab's buildPool — used for mood changes)
// ─────────────────────────────────────────────────────────────

async function loadPool(genreId: string, dislikedIds: string[]): Promise<Movie[]> {
  const pages = new Set<number>();
  pages.add(1);
  while (pages.size < 3) pages.add(Math.floor(Math.random() * 8) + 1);

  const [modernResults, classics] = await Promise.all([
    Promise.all(
      [...pages].map(p =>
        discoverMovies({
          genre_id:   genreId || undefined,
          min_rating: 5,
          sort_by:    'popularity.desc',
          page:       p,
        }).catch(() => [] as Movie[])
      )
    ),
    discoverMovies({
      genre_id:   genreId || undefined,
      year_to:    '2005',
      min_rating: 7,
      sort_by:    'vote_count.desc',
      page:       Math.floor(Math.random() * 3) + 1,
    }).catch(() => [] as Movie[]),
  ]);

  const seen = new Set<string>();
  const dislikedSet = new Set(dislikedIds);
  const pool: Movie[] = [];
  for (const page of modernResults)
    for (const m of page)
      if (!seen.has(m.id) && !dislikedSet.has(m.id)) {
        seen.add(m.id);
        pool.push(m);
      }
  for (const m of classics)
    if (!seen.has(m.id) && !dislikedSet.has(m.id)) {
      seen.add(m.id);
      pool.push(m);
    }

  return pool.sort(() => Math.random() - 0.5);
}

// ─────────────────────────────────────────────────────────────
// SwipeCard component
// ─────────────────────────────────────────────────────────────

interface FriendAvatar { username: string; url: string }

interface SwipeCardProps {
  movie:         Movie;
  stackIndex:    number; // 0 = top, 1 = peeking behind
  friendAvatars: FriendAvatar[];
  onSwipeLeft:   (movie: Movie) => void;
  onSwipeRight:  (movie: Movie) => void;
  onInfo:        () => void;
}

function SwipeCard({ movie, stackIndex, friendAvatars, onSwipeLeft, onSwipeRight, onInfo }: SwipeCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const startX      = useRef(0);
  const exitFired   = useRef(false);  // one-shot guard — prevents double-trigger from any source
  const exitTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active      = stackIndex === 0;

  const accent = getAccent(movie.genres);

  // Reset all local state when a new card becomes active
  useEffect(() => {
    setDragX(0);
    setExitDir(null);
    exitFired.current = false;
    if (exitTimer.current) { clearTimeout(exitTimer.current); exitTimer.current = null; }
  }, [movie.id]);

  // Clean up any pending exit timer on unmount
  useEffect(() => {
    return () => { if (exitTimer.current) clearTimeout(exitTimer.current); };
  }, []);

  const triggerExit = useCallback((dir: 'left' | 'right') => {
    if (exitFired.current) return;  // already exiting — ignore duplicate calls
    exitFired.current = true;
    setExitDir(dir);
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      if (dir === 'right') onSwipeRight(movie);
      else onSwipeLeft(movie);
    }, 280);
  }, [onSwipeLeft, onSwipeRight, movie]);

  // Pointer events (unified mouse + touch)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active || exitDir) return;
    cardRef.current?.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || exitDir) return;
    setDragX(e.clientX - startX.current);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    const dx = e.clientX - startX.current;
    if      (dx >  SWIPE_THRESHOLD) triggerExit('right');
    else if (dx < -SWIPE_THRESHOLD) triggerExit('left');
    else setDragX(0);
  };

  const x      = exitDir === 'right' ? 520 : exitDir === 'left' ? -520 : dragX;
  const rotate = x * 0.06;

  const likeOpacity = Math.min(1, Math.max(0, dragX / 60));
  const passOpacity = Math.min(1, Math.max(0, -dragX / 60));

  // Stack transforms for the peeking card
  const scale      = active ? 1    : 0.93;
  const translateY = active ? 0    : 14;
  const opacity    = stackIndex > 1 ? 0 : 1;

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 rounded-[22px] overflow-hidden select-none"
      style={{
        transform: active
          ? `translateX(${x}px) rotate(${rotate}deg)`
          : `scale(${scale}) translateY(${translateY}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
        cursor: active ? (isDragging ? 'grabbing' : 'grab') : 'default',
        zIndex: 2 - stackIndex,
        opacity,
        background: `radial-gradient(ellipse at 55% 15%, ${accent}28 0%, #0c0c0f 60%)`,
        pointerEvents: active ? 'auto' : 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerCancel={() => { setIsDragging(false); setDragX(0); }}
    >
      {/* Poster */}
      {movie.poster && (
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center top' }}
          draggable={false}
        />
      )}
      {!movie.poster && (
        <div className="w-full h-full flex items-center justify-center" style={{ background: `${accent}15` }}>
          <span className="text-gray-600 text-lg font-medium px-8 text-center">{movie.title}</span>
        </div>
      )}

      {/* Bottom scrim */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.6) 38%, rgba(0,0,0,0.1) 65%, transparent 100%)' }}
      />

      {/* LIKE badge */}
      <div
        className="absolute top-10 left-5 px-4 py-2 rounded-xl pointer-events-none"
        style={{
          opacity: likeOpacity,
          border: '2px solid #4ade80',
          transform: 'rotate(-18deg)',
        }}
      >
        <span className="font-black text-xl tracking-widest" style={{ color: '#4ade80' }}>LIKE</span>
      </div>

      {/* PASS badge */}
      <div
        className="absolute top-10 right-5 px-4 py-2 rounded-xl pointer-events-none"
        style={{
          opacity: passOpacity,
          border: '2px solid #f87171',
          transform: 'rotate(18deg)',
        }}
      >
        <span className="font-black text-xl tracking-widest text-red-400">PASS</span>
      </div>

      {/* Friend avatars — top right */}
      {friendAvatars.length > 0 && (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1 pointer-events-none">
          <div className="flex -space-x-2">
            {friendAvatars.slice(0, 3).map((fa, i) => (
              <img
                key={i}
                src={fa.url}
                alt={fa.username}
                title={`@${fa.username} also liked this`}
                className="w-8 h-8 rounded-full object-cover"
                style={{ border: '2px solid #4ade80' }}
              />
            ))}
            {friendAvatars.length > 3 && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-black"
                style={{ background: '#4ade80', border: '2px solid #0c0c0f' }}
              >
                +{friendAvatars.length - 3}
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium" style={{ color: '#4ade80' }}>
            {friendAvatars.length === 1 ? `@${friendAvatars[0].username} liked` : `${friendAvatars.length} friends liked`}
          </span>
        </div>
      )}

      {/* Card content */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-[88px] pt-10 pointer-events-none">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2
            className="text-white leading-tight flex-1"
            style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: 'clamp(1.25rem, 3vw, 1.6rem)' }}
          >
            {movie.title}
          </h2>
          {movie.year > 0 && (
            <span className="text-gray-400 text-sm font-medium mt-1 shrink-0">{movie.year}</span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {movie.genres.slice(0, 2).map(g => (
            <span
              key={g}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: `${accent}25`, color: accent, border: `1px solid ${accent}35` }}
            >
              {g}
            </span>
          ))}
          {movie.rating > 0 && (
            <span className="text-amber-400 text-xs font-bold">★ {movie.rating.toFixed(1)}</span>
          )}
        </div>

        {movie.overview && (
          <p
            className="text-gray-400 text-sm leading-relaxed line-clamp-3"
            style={{ fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 300 }}
          >
            {movie.overview}
          </p>
        )}
      </div>

      {/* Action buttons — inside card at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 pb-5 pt-2">
        {/* Pass */}
        <button
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ background: 'rgba(20,20,24,0.92)', border: '1px solid rgba(248,113,113,0.3)' }}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); triggerExit('left'); }}
        >
          <X className="w-6 h-6 text-red-400" />
        </button>

        {/* Info */}
        <button
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ background: 'rgba(20,20,24,0.92)', border: '1px solid rgba(255,255,255,0.12)' }}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onInfo(); }}
        >
          <Info className="w-4 h-4 text-white/70" />
        </button>

        {/* Like */}
        <button
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ background: 'rgba(20,20,24,0.92)', border: '1px solid rgba(74,222,128,0.3)' }}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); triggerExit('right'); }}
        >
          <Heart className="w-6 h-6" style={{ color: '#4ade80' }} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────

function Toast({ message, visible, onAction }: { message: string; visible: boolean; onAction?: () => void }) {
  return (
    <div
      className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full z-50"
      style={{
        background: 'rgba(22,22,28,0.96)',
        border: '1px solid rgba(74,222,128,0.3)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        transition: 'opacity 0.25s, transform 0.25s',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : 10}px)`,
        pointerEvents: onAction ? 'auto' : 'none',
      }}
    >
      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#4ade80' }} />
      <span className="text-white text-sm font-medium">{message}</span>
      {onAction && (
        <button
          onClick={onAction}
          className="ml-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
        >
          View
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main SpeedSwipeTab
// ─────────────────────────────────────────────────────────────

export function SpeedSwipeTab() {
  const navigate = useNavigate();
  const user     = getUser();

  // Deck state
  const [deck,    setDeck]    = useState<Movie[]>([]);
  const [index,   setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<number[]>([]);

  // Filter
  const [activeMood, setActiveMood] = useState(MOODS[0]);

  // Affinity engine
  const affinity    = useRef<Record<string, number>>({});
  const leftStreaks = useRef<Record<string, number>>({});

  // Session dedup sets — reset on mount, never persisted
  const seenIds       = useRef<Set<string>>(new Set());
  const watchedIds    = useRef<Set<string>>(new Set());
  const watchLaterIds = useRef<Set<string>>(new Set());
  // Tracks which discover page to hit next during refills
  const refillPage = useRef(2);
  // Mirror of `index` as a ref so async callbacks always read the current value
  const indexRef = useRef(0);
  indexRef.current = index;

  // Modal
  const [modalMovieId,   setModalMovieId]   = useState<string | null>(null);
  const [modalMovieType, setModalMovieType] = useState<'movie' | 'show'>('movie');

  // Toast
  const [toastMsg,    setToastMsg]    = useState('');
  const [toastShow,   setToastShow]   = useState(false);
  const [toastAction, setToastAction] = useState<(() => void) | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Friends layer: movie_id → FriendAvatar[]
  const [friendMap, setFriendMap] = useState<Record<string, FriendAvatar[]>>({});

  // ── Session initialization — runs once on mount ───────────────────
  const initSession = useCallback(async () => {
    setLoading(true);
    setHistory([]);

    seenIds.current       = new Set();
    watchedIds.current    = new Set();
    watchLaterIds.current = new Set();
    refillPage.current    = 2;
    affinity.current      = {};
    leftStreaks.current   = {};

    // 1. Fetch watched history + watch later in parallel
    const [watchedList, watchLaterList] = await Promise.all([
      user
        ? getWatchedMovies(user.user_id, 500).catch(() => [] as WatchedMovie[])
        : Promise.resolve([] as WatchedMovie[]),
      user
        ? getWatchLater(user.user_id).catch(() => [] as string[])
        : Promise.resolve([] as string[]),
    ]);

    // 2. Watched → seenIds (watch later stays out of seenIds so it can appear naturally)
    for (const w of watchedList) {
      watchedIds.current.add(w.movie_id);
      seenIds.current.add(w.movie_id);
    }
    for (const id of watchLaterList) {
      watchLaterIds.current.add(id);
    }

    // 3. Pick one random watch later movie as seed, fetch its recs
    let seedRecs: Movie[] = [];
    if (watchLaterList.length > 0) {
      const seedId = watchLaterList[Math.floor(Math.random() * watchLaterList.length)];
      seedRecs = await getMovieRecommendations(seedId).catch(() => []);
    }

    // 4. Fetch trending + classics in parallel
    const [trending, classics] = await Promise.all([
      getTrendingMovies('week').catch(() => [] as Movie[]),
      discoverMovies({ year_to: '2005', min_rating: 7.5, sort_by: 'vote_count.desc', page: 1 })
        .catch(() => [] as Movie[]),
    ]);

    // 5. Combine: seed recs first, then interleave trending + classics (~1 classic per 3 modern)
    const addedThisSession = new Set<string>();
    const combined: Movie[] = [];
    const tryAdd = (m: Movie) => {
      if (seenIds.current.has(m.id) || addedThisSession.has(m.id)) return;
      addedThisSession.add(m.id);
      combined.push(m);
    };
    for (const m of seedRecs) tryAdd(m);

    const classicQueue = classics.filter(m => !seenIds.current.has(m.id) && !addedThisSession.has(m.id));
    let ci = 0;
    for (let mi = 0; mi < trending.length; mi++) {
      tryAdd(trending[mi]);
      if ((mi + 1) % 3 === 0 && ci < classicQueue.length) tryAdd(classicQueue[ci++]);
    }
    while (ci < classicQueue.length) tryAdd(classicQueue[ci++]);

    // Supplement with popular + more classics if the combined pool is thin
    if (combined.length < 10) {
      const [extra, moreClassics] = await Promise.all([
        discoverMovies({ min_rating: 5, sort_by: 'popularity', page: 1 }).catch(() => [] as Movie[]),
        discoverMovies({ year_to: '2005', min_rating: 7, sort_by: 'vote_count.desc', page: 2 }).catch(() => [] as Movie[]),
      ]);
      for (const m of extra) tryAdd(m);
      for (const m of moreClassics) tryAdd(m);
    }

    // 6. Mark all deck IDs seen so future refills don't repeat them
    for (const m of combined) seenIds.current.add(m.id);

    setDeck(rerankDeck(combined, affinity.current));
    setIndex(0);
    setLoading(false);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mood-change deck reload (uses existing loadPool) ─────────────
  const loadDeck = useCallback(async (mood: typeof MOODS[0]) => {
    setLoading(true);
    setHistory([]);

    // Keep watched filter; clear deck-seen state for the new mood
    seenIds.current    = new Set(watchedIds.current);
    refillPage.current = 2;

    const disliked = user ? getRoulettePrefs(user.user_id).disliked : [];
    const movies   = await loadPool(mood.genre, disliked);
    const fresh    = movies.filter(m => !seenIds.current.has(m.id));
    for (const m of fresh) seenIds.current.add(m.id);

    setDeck(fresh.length > 0 ? fresh : movies);
    setIndex(0);
    setLoading(false);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mount: run session init
  useEffect(() => { initSession(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track seen cards as they render (safety net for injected recs)
  useEffect(() => {
    const cur  = deck[index];
    const next = deck[index + 1];
    if (cur)  seenIds.current.add(cur.id);
    if (next) seenIds.current.add(next.id);
  }, [index, deck]);

  // Mood change
  const handleMoodChange = (mood: typeof MOODS[0]) => {
    if (mood.label === activeMood.label) return;
    affinity.current    = {};
    leftStreaks.current = {};
    setActiveMood(mood);
    loadDeck(mood);
  };

  // ── Friends layer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getfriendsRouletteHistory(user.user_id, 5).then(friendsData => {
      const map: Record<string, FriendAvatar[]> = {};
      for (const fd of friendsData) {
        for (const spin of fd.spins) {
          if (!map[spin.movie_id]) map[spin.movie_id] = [];
          map[spin.movie_id].push({
            username: fd.friend_username,
            url: fd.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fd.friend_username)}`,
          });
        }
      }
      setFriendMap(map);
    }).catch(() => {});
  }, [user?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refill when ≤ 3 cards remain
  useEffect(() => {
    if (loading || deck.length === 0 || index < deck.length - 3) return;
    const page = refillPage.current++;
    discoverMovies({
      genre_id:   activeMood.genre || undefined,
      min_rating: 5,
      sort_by:    'popularity',
      page,
    }).then(more => {
      const fresh = more.filter(m => !seenIds.current.has(m.id));
      if (fresh.length > 0) {
        for (const m of fresh) seenIds.current.add(m.id);
        setDeck(prev => [...prev, ...fresh]);
      }
    }).catch(() => {});
  }, [index, deck.length, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Affinity engine ───────────────────────────────────────────────
  const applyAffinity = (movie: Movie, dir: 'left' | 'right') => {
    const delta = dir === 'right' ? 1 : -0.5;
    for (const g of movie.genres) {
      affinity.current[g] = (affinity.current[g] || 0) + delta;
      if (dir === 'left') {
        leftStreaks.current[g] = (leftStreaks.current[g] || 0) + 1;
        if (leftStreaks.current[g] >= 3) affinity.current[g] -= 1;
      } else {
        leftStreaks.current[g] = 0;
      }
    }
  };

  const rerank = (currentIndex: number) => {
    setDeck(prev => {
      const done      = prev.slice(0, currentIndex + 1);
      const remaining = prev.slice(currentIndex + 1);
      return [...done, ...rerankDeck(remaining, affinity.current)];
    });
  };

  // ── Toast ─────────────────────────────────────────────────────────
  const showToast = (msg: string, action?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastAction(action);
    setToastShow(true);
    toastTimer.current = setTimeout(() => setToastShow(false), action ? 4000 : 2200);
  };

  // ── Swipe handlers ────────────────────────────────────────────────
  const currentMovie = deck[index] ?? null;

  // movie arg is passed directly from SwipeCard at gesture time — immune to deck mutations
  const handleSwipeRight = (movie: Movie) => {
    if (!movie) return;
    const capturedIndex = indexRef.current;
    const nextIdx       = capturedIndex + 1;

    applyAffinity(movie, 'right');
    setHistory(h => [...h, capturedIndex]);
    rerank(capturedIndex);
    setIndex(nextIdx);

    // Duplicate state checks
    if (watchedIds.current.has(movie.id)) {
      showToast("You've seen this one!");
    } else if (watchLaterIds.current.has(movie.id)) {
      showToast(
        "Already saved — want to watch it now?",
        () => {
          setModalMovieId(movie.id);
          setModalMovieType('movie');
          setToastShow(false);
        },
      );
    } else {
      if (user) {
        watchMovieLater(user.user_id, movie.id).catch(() => {});
        watchLaterIds.current.add(movie.id);
      }
      showToast(`Added "${movie.title}" to Watch Later`);
    }

    // Background: inject top unseen rec behind the current top card.
    // Always uses indexRef so it never displaces whichever card is on top right now.
    getMovieRecommendations(movie.id).then(recs => {
      const fresh = recs.find(r => !seenIds.current.has(r.id));
      if (!fresh) return;
      seenIds.current.add(fresh.id);
      setDeck(prev => {
        const insertAt = indexRef.current + 1;
        return [
          ...prev.slice(0, insertAt),
          fresh,
          ...prev.slice(insertAt),
        ];
      });
    }).catch(() => {});
  };

  const handleSwipeLeft = (movie: Movie) => {
    if (!movie) return;
    const capturedIndex = indexRef.current;
    seenIds.current.add(movie.id);
    applyAffinity(movie, 'left');
    setHistory(h => [...h, capturedIndex]);
    rerank(capturedIndex);
    setIndex(capturedIndex + 1);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setIndex(prev);
  };

  const handleShuffle = () => {
    affinity.current    = {};
    leftStreaks.current = {};
    setActiveMood(MOODS[0]);
    initSession();
  };

  const isDone = !loading && index >= deck.length;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 60px)', background: '#0c0c0f' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <button
          onClick={() => navigate('/home/roulette')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <span
          className="font-bold text-white tracking-tight"
          style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: '1.1rem' }}
        >
          SpeedSwipe
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo last swipe"
            className="p-2 rounded-full transition-colors disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={handleShuffle}
            title="Reshuffle deck"
            className="p-2 rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <Shuffle className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Mood chips */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {MOODS.map(m => {
            const active = m.label === activeMood.label;
            return (
              <button
                key={m.label}
                onClick={() => handleMoodChange(m)}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                style={active
                  ? { background: '#4ade80', color: '#0c0c0f' }
                  : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#4ade80', borderTopColor: 'transparent' }} />
            <p className="text-gray-500 text-sm">Loading your deck…</p>
          </div>
        ) : isDone ? (
          <div className="flex flex-col items-center gap-5 text-center px-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: '#4ade80' }} />
            </div>
            <div>
              <h3 className="text-white text-xl font-bold mb-2" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>
                You've seen it all!
              </h3>
              <p className="text-gray-500 text-sm">
                Try a different mood or reshuffle.
              </p>
            </div>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm"
              style={{ background: '#4ade80', color: '#0c0c0f' }}
            >
              <Shuffle className="w-4 h-4" /> Reshuffle
            </button>
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ maxWidth: 380, height: 'min(580px, calc(100vh - 260px))' }}
          >
            {/* Render top 2 cards (next card peeks behind) */}
            {[index + 1, index].map((cardIdx) => {
              const movie = deck[cardIdx];
              if (!movie) return null;
              const stackIndex = index + 1 - cardIdx; // 0 = top, 1 = behind
              return (
                <SwipeCard
                  key={movie.id}
                  movie={movie}
                  stackIndex={stackIndex}
                  friendAvatars={friendMap[movie.id] ?? []}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onInfo={() => {
                    setModalMovieId(movie.id);
                    setModalMovieType(movie.type === 'show' ? 'show' : 'movie');
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      <Toast message={toastMsg} visible={toastShow} onAction={toastAction} />

      {/* Modal */}
      {modalMovieId && (
        <MovieDetailModal
          movieId={modalMovieId}
          type={modalMovieType}
          knownTitle={deck.find(m => m.id === modalMovieId)?.title}
          onClose={() => setModalMovieId(null)}
        />
      )}
    </div>
  );
}
