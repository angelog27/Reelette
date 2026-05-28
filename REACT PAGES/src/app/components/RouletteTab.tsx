import { useState, useEffect, useRef } from "react";
import { Shuffle, Film, Tv, SlidersHorizontal, ChevronDown, ThumbsUp, ThumbsDown, Zap } from "lucide-react";
import { MovieDetailModal } from "./MovieDetailModal";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { PROVIDER_LOGOS } from "../constants/providers";
import {
  discoverMovies,
  discoverShows,
  getServices,
  hasServicesConfigured,
  getUser,
  getfriendsRouletteHistory,
  logRouletteSpin,
  getRouletteHistory,
  getRoulettePrefs,
  setRoulettePref,
  getSmartSpinStatus,
  doSmartSpin,
  type Movie,
  type RouletteSpin,
} from "../services/api";

const GENRES = [
  { label: "Action",          value: "28"    },
  { label: "Adventure",       value: "12"    },
  { label: "Animation",       value: "16"    },
  { label: "Comedy",          value: "35"    },
  { label: "Crime",           value: "80"    },
  { label: "Documentary",     value: "99"    },
  { label: "Drama",           value: "18"    },
  { label: "Family",          value: "10751" },
  { label: "Fantasy",         value: "14"    },
  { label: "History",         value: "36"    },
  { label: "Horror",          value: "27"    },
  { label: "Music",           value: "10402" },
  { label: "Mystery",         value: "9648"  },
  { label: "Romance",         value: "10749" },
  { label: "Science Fiction", value: "878"   },
  { label: "Thriller",        value: "53"    },
  { label: "War",             value: "10752" },
  { label: "Western",         value: "37"    },
];

const TV_GENRES = [
  { label: "Action & Adventure", value: "10759" },
  { label: "Animation",          value: "16"    },
  { label: "Comedy",             value: "35"    },
  { label: "Crime",              value: "80"    },
  { label: "Documentary",        value: "99"    },
  { label: "Drama",              value: "18"    },
  { label: "Family",             value: "10751" },
  { label: "Mystery",            value: "9648"  },
  { label: "Sci-Fi & Fantasy",   value: "10765" },
  { label: "Western",            value: "37"    },
];

const SERVICE_META: Record<string, { label: string; color: string }> = {
  netflix:     { label: 'Netflix',     color: '#E50914' },
  hboMax:      { label: 'Max',         color: '#5B4BDB' },
  disneyPlus:  { label: 'Disney+',     color: '#113CCF' },
  amazonPrime: { label: 'Prime Video', color: '#00A8E1' },
  appleTV:     { label: 'Apple TV+',   color: '#555555' },
  paramount:   { label: 'Paramount+',  color: '#0064FF' },
  peacock:     { label: 'Peacock',     color: '#6B38FB' },
  hulu:        { label: 'Hulu',        color: '#3DBB3D' },
};

const KEY_TO_DISPLAY: Record<string, string> = {
  netflix:     'Netflix',
  hboMax:      'Max',
  disneyPlus:  'Disney+',
  amazonPrime: 'Prime Video',
  appleTV:     'Apple TV+',
  paramount:   'Paramount+',
  peacock:     'Peacock',
  hulu:        'Hulu',
};

const GroqIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M9.5 1L3 9h5l-1.5 6L14 7H9L9.5 1Z" fill="url(#groq-reel)" />
    <defs>
      <linearGradient id="groq-reel" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#FF6B35" />
        <stop offset="100%" stopColor="#E63946" />
      </linearGradient>
    </defs>
  </svg>
);

async function buildPool(
  filters: Parameters<typeof discoverMovies>[0],
  dislikedIds: string[],
): Promise<Movie[]> {
  const pages = new Set<number>();
  pages.add(1);
  while (pages.size < 3) pages.add(Math.floor(Math.random() * 8) + 1);
  const results = await Promise.all(
    [...pages].map(p => discoverMovies({ ...filters, page: p }).catch(() => [] as Movie[])),
  );
  const seen = new Set<string>();
  const dislikedSet = new Set(dislikedIds);
  const pool: Movie[] = [];
  for (const page of results)
    for (const m of page)
      if (!seen.has(m.id) && !dislikedSet.has(m.id)) { seen.add(m.id); pool.push(m); }
  return pool;
}

async function buildShowPool(
  filters: Parameters<typeof discoverShows>[0],
  dislikedIds: string[],
): Promise<Movie[]> {
  const pages = new Set<number>();
  pages.add(1);
  while (pages.size < 3) pages.add(Math.floor(Math.random() * 8) + 1);
  const results = await Promise.all(
    [...pages].map(p => discoverShows({ ...filters, page: p }).catch(() => [] as Movie[])),
  );
  const seen = new Set<string>();
  const dislikedSet = new Set(dislikedIds);
  const pool: Movie[] = [];
  for (const page of results)
    for (const m of page)
      if (!seen.has(m.id) && !dislikedSet.has(m.id)) { seen.add(m.id); pool.push(m); }
  return pool;
}

export function RouletteTab() {
  const [mediaType, setMediaType]            = useState<'movie' | 'show'>('movie');
  const [genre, setGenre]                    = useState("");
  const [yearFrom, setYearFrom]              = useState("");
  const [yearTo, setYearTo]                  = useState("");
  const [minRating, setMinRating]            = useState([0]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen]        = useState(false);
  const filtersRef                           = useRef<HTMLDivElement>(null);

  const [spinning, setSpinning]              = useState(false);
  const [pendingMovie, setPendingMovie]      = useState<Movie | null>(null);
  const [awaitingVote, setAwaitingVote]      = useState(false);
  const [userVote, setUserVote]              = useState<"like" | "dislike" | null>(null);
  const [error, setError]                    = useState("");

  const [selectedMovieId, setSelectedMovieId]     = useState<string | null>(null);
  const [selectedMovieType, setSelectedMovieType] = useState<'movie' | 'show'>('movie');

  const [smartSpinAvailable, setSmartSpinAvailable] = useState(true);
  const [hoursUntilReset, setHoursUntilReset]       = useState(0);
  const [smartSpinLoading, setSmartSpinLoading]     = useState(false);
  const [smartPreferences, setSmartPreferences]     = useState("");
  const [smartResult, setSmartResult]               = useState<{ movie: Movie; reason: string } | null>(null);
  const [smartError, setSmartError]                 = useState("");
  const [smartSpinResting, setSmartSpinResting]     = useState(false);
  const smartResultRef                              = useRef<HTMLDivElement>(null);

  const [friendSpins, setFriendSpins] = useState<
    { friend_id: string; friend_username: string; avatarUrl?: string; spins: RouletteSpin[] }[]
  >([]);
  const [recentSpins, setRecentSpins] = useState<RouletteSpin[]>([]);
  const [spinsLoaded, setSpinsLoaded] = useState(false);

  const user         = getUser();
  const userServices = getServices();
  const hasServices  = hasServicesConfigured(userServices);

  useEffect(() => {
    if (!user) return;
    getfriendsRouletteHistory(user.user_id, 1).then(setFriendSpins).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    getSmartSpinStatus()
      .then(s => { setSmartSpinAvailable(s.available); setHoursUntilReset(s.hoursUntilReset); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) { setSpinsLoaded(true); return; }
    getRouletteHistory(user.user_id, 12)
      .then(s => { setRecentSpins(s); setSpinsLoaded(true); })
      .catch(() => setSpinsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const refreshSpins = () => {
    if (!user) return;
    getRouletteHistory(user.user_id, 12).then(setRecentSpins).catch(() => {});
  };

  const handleSmartSpin = async () => {
    if (!user || smartSpinLoading) return;
    setSmartSpinLoading(true);
    setSmartError("");
    setSmartResult(null);
    try {
      const res = await doSmartSpin(smartPreferences, "", genre);
      setSmartResult({ movie: res.movie, reason: res.reason });
      setSmartSpinAvailable(false);
      setHoursUntilReset(24);
      setTimeout(() => smartResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { hoursUntilReset?: number } };
      if (e.status === 429) {
        setSmartSpinAvailable(false);
        setHoursUntilReset(e.data?.hoursUntilReset ?? 24);
        setSmartError("Smart Watch resets tomorrow!");
      } else if (e.status === 503) {
        setSmartError("Smart Watch is resting — try again soon.");
        setSmartSpinResting(true);
        setTimeout(() => { setSmartSpinResting(false); setSmartError(""); }, 60000);
      } else {
        setSmartError("Something went wrong. Please try again.");
      }
    } finally {
      setSmartSpinLoading(false);
    }
  };

  const spin = async () => {
    setSpinning(true);
    setPendingMovie(null);
    setAwaitingVote(false);
    setUserVote(null);
    setSelectedMovieId(null);
    setError("");

    const filters = {
      genre_id:        genre || undefined,
      year_from:       yearFrom || undefined,
      year_to:         yearTo || undefined,
      min_rating:      minRating[0] > 0 ? minRating[0] : undefined,
      services_filter: selectedProviders.length > 0
        ? Object.fromEntries(selectedProviders.map(p => [p, true]))
        : undefined,
    };

    const dislikedIds = user ? getRoulettePrefs(user.user_id).disliked : [];

    try {
      let pool = mediaType === 'show'
        ? await buildShowPool(filters, dislikedIds)
        : await buildPool(filters, dislikedIds);
      if (pool.length === 0) {
        pool = mediaType === 'show'
          ? await buildShowPool(filters, [])
          : await buildPool(filters, []);
      }
      if (pool.length === 0) {
        setError(`No ${mediaType === 'show' ? 'shows' : 'movies'} found — try loosening your filters.`);
        setSpinning(false);
        return;
      }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setPendingMovie(pick);
      setAwaitingVote(true);
      if (user) {
        logRouletteSpin(user.user_id, user.avatarUrl, pick.id, pick.title, pick.poster).catch(() => {});
        setTimeout(refreshSpins, 800);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSpinning(false);
    }
  };

  const handleVote = (vote: "like" | "dislike") => {
    if (!pendingMovie) return;
    setUserVote(vote);
    if (user) setRoulettePref(user.user_id, pendingMovie.id, vote);
    if (vote === "like") {
      setSelectedMovieId(pendingMovie.id);
      setSelectedMovieType(mediaType);
    } else {
      setTimeout(() => spin(), 400);
    }
  };

  const toggleProvider = (name: string) => {
    setSelectedProviders(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name],
    );
  };

  const hasActiveFilters = !!genre || minRating[0] > 0 || !!yearFrom || !!yearTo;

  return (
    <div className="flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-10 pb-20">

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-8">

            {/* Headline */}
            <div>
              <h1
                style={{
                  fontFamily: "SanFran, system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
                  lineHeight: 1.08,
                  color: "#ffffff",
                  letterSpacing: "-0.035em",
                }}
              >
                What can you<br />watch tonight?
              </h1>
              <p
                style={{
                  fontFamily: "SanFran, system-ui, sans-serif",
                  fontSize: "0.7rem",
                  letterSpacing: "0.16em",
                  color: "#374151",
                  marginTop: "0.65rem",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                stop scrolling, start watching
              </p>
            </div>

            {/* Movies / Shows toggle — sliding pill */}
            <div className="relative flex items-center p-1 rounded-full w-fit"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Sliding indicator */}
              <div style={{
                position: 'absolute', top: 4, bottom: 4, left: 4,
                width: 'calc(50% - 4px)',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 9999,
                transform: mediaType === 'show' ? 'translateX(100%)' : 'translateX(0)',
                transition: 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1)',
                pointerEvents: 'none',
              }} />
              <button
                onClick={() => { setMediaType('movie'); setGenre(''); }}
                className="relative z-10 flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold active:scale-[0.97]"
                style={{ color: mediaType === 'movie' ? '#fff' : '#4b5563', transition: 'color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}
              >
                <Film className="w-3.5 h-3.5" /> Movies
              </button>
              <button
                onClick={() => { setMediaType('show'); setGenre(''); }}
                className="relative z-10 flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold active:scale-[0.97]"
                style={{ color: mediaType === 'show' ? '#fff' : '#4b5563', transition: 'color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}
              >
                <Tv className="w-3.5 h-3.5" /> Shows
              </button>
            </div>

            {/* Your services */}
            {hasServices && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p
                    className="text-[10px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: '#374151' }}
                  >
                    Your services - Toggle services on or off for certain results
                  </p>
                  {selectedProviders.length > 0 && (
                    <button
                      onClick={() => setSelectedProviders([])}
                      className="text-[10px] transition-colors hover:opacity-70"
                      style={{ color: '#4b5563' }}
                    >
                      Clear filter
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(userServices).filter(([, on]) => on).map(([key]) => {
                    const displayName = KEY_TO_DISPLAY[key];
                    const logo = PROVIDER_LOGOS[displayName];
                    const meta = SERVICE_META[key];
                    if (!logo || !meta) return null;
                    const isFiltered = selectedProviders.includes(key);
                    const isVisible  = selectedProviders.length === 0 || isFiltered;
                    return (
                      <button
                        key={key}
                        onClick={() => toggleProvider(key)}
                        className="flex flex-col items-center gap-2 transition-all duration-200"
                        style={{ opacity: isVisible ? 1 : 0.35 }}
                      >
                        <div className="relative w-full">
                          <img
                            src={logo}
                            alt={meta.label}
                            className="w-full aspect-square rounded-2xl object-cover transition-all duration-200"
                            style={{
                              boxShadow: isFiltered
                                ? `0 0 28px ${meta.color}70, 0 0 8px ${meta.color}40`
                                : 'none',
                              transform: isFiltered ? 'scale(1.04)' : 'scale(1)',
                            }}
                          />
                          {isFiltered && (
                            <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20" />
                          )}
                        </div>
                        <span
                          className="text-[10px] font-semibold tracking-wide"
                          style={{ color: isFiltered ? '#fff' : '#6b7280' }}
                        >
                          {meta.label}
                        </span>
                        <div style={{
                          height: 2,
                          width: isFiltered ? '60%' : 0,
                          background: meta.color,
                          borderRadius: 1,
                          transition: 'width 0.25s',
                        }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div ref={filtersRef} className="relative">
              <button
                onClick={() => setFiltersOpen(v => !v)}
                className="flex items-center gap-2 text-xs rounded-full px-4 py-2 transition-colors"
                style={
                  hasActiveFilters
                    ? { background: 'rgba(124,93,189,0.1)', border: '1px solid rgba(124,93,189,0.35)', color: '#a89de0' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }
                }
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--reel-accent)' }} />
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>

              {filtersOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl p-5 space-y-5 z-50"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Genre</p>
                    <select
                      value={genre}
                      onChange={e => setGenre(e.target.value)}
                      className="w-full text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none"
                      style={{ background: '#070707', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <option value="">Any Genre</option>
                      {(mediaType === 'show' ? TV_GENRES : GENRES).map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Year from</p>
                      <Input
                        value={yearFrom}
                        onChange={e => setYearFrom(e.target.value)}
                        placeholder="1990"
                        className="bg-[#070707] text-white text-xs h-8 rounded-lg"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Year to</p>
                      <Input
                        value={yearTo}
                        onChange={e => setYearTo(e.target.value)}
                        placeholder="2025"
                        className="bg-[#070707] text-white text-xs h-8 rounded-lg"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Min Rating</p>
                      <span className="text-white text-xs font-semibold">
                        {minRating[0] > 0 ? `${minRating[0]}+` : "Any"}
                      </span>
                    </div>
                    <Slider value={minRating} onValueChange={setMinRating} max={9} step={0.5} className="w-full" />
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={() => { setGenre(""); setMinRating([0]); setYearFrom(""); setYearTo(""); }}
                      className="text-xs font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--reel-accent)' }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>


            {/* Spin button */}
            {!awaitingVote && (
              <button
                onClick={spin}
                disabled={spinning}
                className="flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontFamily: "SanFran, system-ui, sans-serif",
                  letterSpacing: '-0.01em',
                }}
              >
                <Shuffle className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
                {spinning ? "Finding something for you…" : "Spin the Reel"}
              </button>
            )}




            {/* Smart Watch */}
            {user && (
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-2">
                  <GroqIcon size={14} />
                  <p className="text-sm font-semibold text-white">Smart Watch</p>
                  <span className="text-[10px] ml-auto" style={{ color: '#374151' }}>
                    {smartSpinAvailable ? "1 use remaining today" : `Resets in ${hoursUntilReset}h`}
                  </span>
                </div>

                <textarea
                  value={smartPreferences}
                  onChange={e => setSmartPreferences(e.target.value)}
                  maxLength={300}
                  disabled={smartSpinLoading}
                  placeholder="Describe what you want to watch tonight…"
                  rows={3}
                  className="w-full text-xs rounded-xl px-3 py-2.5 resize-none focus:outline-none placeholder-[#2d2d2d] transition-colors disabled:opacity-40"
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#fff',
                    fontFamily: "SanFran, system-ui, sans-serif",
                  }}
                />

                <button
                  onClick={smartSpinAvailable ? handleSmartSpin : spin}
                  disabled={smartSpinLoading || smartSpinResting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    smartSpinAvailable && !smartSpinResting
                      ? {
                          background: 'rgba(255,107,53,0.08)',
                          border: '1px solid rgba(255,107,53,0.25)',
                          color: '#FF6B35',
                        }
                      : {
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          color: '#4b5563',
                        }
                  }
                >
                  <GroqIcon size={13} />
                  {smartSpinLoading
                    ? "Finding your perfect pick…"
                    : smartSpinResting
                    ? "Smart Watch is resting…"
                    : smartSpinAvailable
                    ? "Smart Watch"
                    : "Find Movie"}
                </button>

                {smartError && (
                  <p className="text-yellow-500 text-xs text-center">{smartError}</p>
                )}

                {smartResult && (
                  <div
                    ref={smartResultRef}
                    className="rounded-xl overflow-hidden cursor-pointer animate-in fade-in duration-300"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onClick={() => {
                      setSelectedMovieId(smartResult.movie.id);
                      setSelectedMovieType('movie');
                    }}
                  >
                    <div className="flex gap-4 p-4">
                      {smartResult.movie.poster ? (
                        <img
                          src={smartResult.movie.poster}
                          alt={smartResult.movie.title}
                          className="w-16 h-24 rounded-lg object-cover shrink-0"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      ) : (
                        <div className="w-16 h-24 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0">
                          <Film className="w-5 h-5 text-gray-700" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                        <p className="text-white font-bold text-sm leading-snug line-clamp-2">
                          {smartResult.movie.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          {smartResult.movie.year > 0 && (
                            <span className="text-gray-500">{smartResult.movie.year}</span>
                          )}
                          {smartResult.movie.rating > 0 && (
                            <span className="text-yellow-400 font-semibold">★ {smartResult.movie.rating.toFixed(1)}</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-[11px] italic leading-relaxed line-clamp-3">
                          {smartResult.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 px-4 pb-3">
                      <GroqIcon size={10} />
                      <span className="text-[10px] text-gray-700">Powered by Groq</span>
                    </div>
                  </div>
                )}
              </div>
            )}


            {error && <p className="text-yellow-500 text-sm">{error}</p>}

            {/* Vote card */}
            {awaitingVote && pendingMovie && (
              <div
                className="rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300"
                style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <div className="flex gap-5 p-5 pb-3">
                  <div className="relative shrink-0">
                    {pendingMovie.poster ? (
                      <img
                        src={pendingMovie.poster}
                        alt={pendingMovie.title}
                        className="w-24 h-36 rounded-xl object-cover shadow-xl"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    ) : (
                      <div className="w-24 h-36 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                        <Film className="w-6 h-6 text-gray-700" />
                      </div>
                    )}
                    {pendingMovie.streamingService && PROVIDER_LOGOS[pendingMovie.streamingService] && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-lg overflow-hidden shadow-lg ring-1 ring-black">
                        <img
                          src={PROVIDER_LOGOS[pendingMovie.streamingService]}
                          alt={pendingMovie.streamingService}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                    <p
                      className="text-white font-bold leading-snug line-clamp-2"
                      style={{ fontFamily: "SanFran, system-ui, sans-serif", fontSize: '1rem' }}
                    >
                      {pendingMovie.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {pendingMovie.year > 0 && <span className="text-gray-500">{pendingMovie.year}</span>}
                      {pendingMovie.rating > 0 && (
                        <span className="text-yellow-400 font-semibold">★ {pendingMovie.rating.toFixed(1)}</span>
                      )}
                    </div>
                    {pendingMovie.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {pendingMovie.genres.slice(0, 2).map(g => (
                          <span
                            key={g}
                            className="text-[10px] px-2 py-0.5 rounded-full text-gray-500"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p
                  className="text-[11px] text-gray-600 text-center italic px-5 pb-3"
                  style={{ fontFamily: "SanFran, system-ui, sans-serif" }}
                >
                  Fate has spoken. Your verdict?
                </p>

                <div className="grid grid-cols-2 gap-3 px-4 pb-3">
                  <button
                    onClick={() => handleVote("dislike")}
                    disabled={userVote !== null}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all text-gray-400 hover:text-red-400 disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <ThumbsDown className="w-4 h-4" /> Pass
                  </button>
                  <button
                    onClick={() => handleVote("like")}
                    disabled={userVote !== null}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                    style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)' }}
                  >
                    <ThumbsUp className="w-4 h-4" /> I'm in
                  </button>
                </div>

                <div className="flex items-center justify-between px-4 pb-4">
                  <button
                    onClick={() => { setAwaitingVote(false); setPendingMovie(null); spin(); }}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Skip &amp; respin
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMovieId(pendingMovie.id);
                      setSelectedMovieType(mediaType);
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors font-medium"
                  >
                    More info →
                  </button>
                </div>
              </div>
            )}

      

          </div>

          {/* ── RIGHT COLUMN — Spins ── */}
          <div className="hidden lg:flex flex-col gap-10">

            {/* Recent Spins */}
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase mb-4"
                style={{ color: '#374151' }}
              >
                Recent Spins
              </p>

              {!spinsLoaded && (
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl animate-pulse"
                      style={{ aspectRatio: '2/3', background: '#111' }}
                    />
                  ))}
                </div>
              )}

              {spinsLoaded && recentSpins.length === 0 && (
                <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                  {user ? "Your spin history will appear here." : "Log in to track spins."}
                </p>
              )}

              {spinsLoaded && recentSpins.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {recentSpins.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedMovieId(s.movie_id);
                        setSelectedMovieType('movie');
                      }}
                      className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.04]"
                      style={{
                        aspectRatio: '2/3',
                        background: '#111',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {s.poster_url ? (
                        <img
                          src={s.poster_url}
                          alt={s.movie_title}
                          className="w-full h-full object-cover group-hover:brightness-90 transition-all duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                          <Film className="w-5 h-5 text-gray-700" />
                        </div>
                      )}
                      <div
                        className="absolute inset-x-0 bottom-0 p-2"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)' }}
                      >
                        <p className="text-white text-[9px] font-semibold line-clamp-2 leading-tight">
                          {s.movie_title}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Friends' Spins — horizontal scroll poster grid */}
            {friendSpins.length > 0 && (
              <div>
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase mb-4"
                  style={{ color: '#374151' }}
                >
                  Friends' Spins
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {friendSpins.slice(0, 10).map(entry => {
                    const s = entry.spins[0];
                    return (
                      <button
                        key={entry.friend_id}
                        onClick={() => {
                          setSelectedMovieId(s.movie_id);
                          setSelectedMovieType('movie');
                        }}
                        className="group relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.04]"
                        style={{
                          width: 100,
                          aspectRatio: '2/3',
                          background: '#111',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {s.poster_url ? (
                          <img
                            src={s.poster_url}
                            alt={s.movie_title}
                            className="w-full h-full object-cover group-hover:brightness-90 transition-all duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                            <Film className="w-5 h-5 text-gray-700" />
                          </div>
                        )}
                        {/* Username at top */}
                        <div
                          className="absolute inset-x-0 top-0 p-1.5"
                          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, transparent 100%)' }}
                        >
                          <p className="text-white text-[9px] font-bold line-clamp-1 leading-tight">
                            @{entry.friend_username}
                          </p>
                        </div>
                        {/* Title at bottom */}
                        <div
                          className="absolute inset-x-0 bottom-0 p-1.5"
                          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)' }}
                        >
                          <p className="text-white text-[9px] line-clamp-2 leading-tight">
                            {s.movie_title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile recent spins */}
        <div className="lg:hidden mt-10">
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase mb-4"
            style={{ color: '#374151' }}
          >
            Recent Spins
          </p>
          {!spinsLoaded && (
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl animate-pulse" style={{ aspectRatio: '2/3', background: '#111' }} />
              ))}
            </div>
          )}
          {spinsLoaded && recentSpins.length === 0 && (
            <p className="text-xs" style={{ color: '#374151' }}>
              {user ? "Your spin history will appear here." : "Log in to track spins."}
            </p>
          )}
          {spinsLoaded && recentSpins.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {recentSpins.slice(0, 8).map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedMovieId(s.movie_id); setSelectedMovieType('movie'); }}
                  className="group relative rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.96]"
                  style={{ aspectRatio: '2/3', background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {s.poster_url ? (
                    <img src={s.poster_url} alt={s.movie_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                      <Film className="w-4 h-4 text-gray-700" />
                    </div>
                  )}
                  <div
                    className="absolute inset-x-0 bottom-0 p-1.5"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
                  >
                    <p className="text-white text-[8px] font-semibold line-clamp-2 leading-tight">
                      {s.movie_title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile friends' spins */}
        {friendSpins.length > 0 && (
          <div className="lg:hidden mt-8">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase mb-4"
              style={{ color: '#374151' }}
            >
              Friends' Spins
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {friendSpins.slice(0, 10).map(entry => {
                const s = entry.spins[0];
                return (
                  <button
                    key={entry.friend_id}
                    onClick={() => { setSelectedMovieId(s.movie_id); setSelectedMovieType('movie'); }}
                    className="group relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.96]"
                    style={{ width: 90, aspectRatio: '2/3', background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {s.poster_url ? (
                      <img src={s.poster_url} alt={s.movie_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                        <Film className="w-4 h-4 text-gray-700" />
                      </div>
                    )}
                    <div
                      className="absolute inset-x-0 top-0 p-1.5"
                      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, transparent 100%)' }}
                    >
                      <p className="text-white text-[8px] font-bold line-clamp-1 leading-tight">
                        @{entry.friend_username}
                      </p>
                    </div>
                    <div
                      className="absolute inset-x-0 bottom-0 p-1.5"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)' }}
                    >
                      <p className="text-white text-[8px] line-clamp-2 leading-tight">
                        {s.movie_title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {selectedMovieId && (
        <MovieDetailModal
          movieId={selectedMovieId}
          type={selectedMovieType}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
}
