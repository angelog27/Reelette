import { useState, useEffect, useRef } from "react";
import { Shuffle, ChevronDown, ThumbsUp, ThumbsDown, Film, SlidersHorizontal } from "lucide-react";
import { MovieDetailModal } from "./MovieDetailModal";
import { RouletteWheelModal, getWheelColor } from "./RouletteWheelModal";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import reeletteLogo from "../../assets/Reelette_LOGO_upscaled.png";
import { PROVIDER_LOGOS } from "../constants/providers";
import {
  discoverMovies,
  getServices,
  hasServicesConfigured,
  getUser,
  getfriendsRouletteHistory,
  logRouletteSpin,
  getRouletteHistory,
  getRoulettePrefs,
  setRoulettePref,
  timeAgo,
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

const MOODS = [
  { label: "Mind-bender", genre: "878"   },
  { label: "Cozy",        genre: "35"    },
  { label: "Date night",  genre: "10749" },
  { label: "Horror",      genre: "27"    },
  { label: "Action",      genre: "28"    },
];

// Film strip holes — rendered as a static row
const FILM_HOLES = Array.from({ length: 48 });

function FilmStrip({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={`absolute inset-x-0 z-20 flex items-center h-[22px] bg-[#0c0c0c] ${
        position === "top" ? "top-0 border-b border-[#1a1a1a]" : "bottom-0 border-t border-[#1a1a1a]"
      }`}
    >
      {FILM_HOLES.map((_, i) => (
        <div key={i} className="shrink-0 flex-1 px-[3px]">
          <div className="h-[13px] rounded-[2px] bg-[#050505]" />
        </div>
      ))}
    </div>
  );
}

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

async function buildPool(
  filters: Parameters<typeof discoverMovies>[0],
  dislikedIds: string[],
): Promise<Movie[]> {
  const pages = new Set<number>();
  pages.add(1);
  while (pages.size < 3) pages.add(Math.floor(Math.random() * 8) + 1);

  const results = await Promise.all(
    [...pages].map(page => discoverMovies({ ...filters, page }).catch(() => [] as Movie[])),
  );

  const seen       = new Set<string>();
  const dislikedSet = new Set(dislikedIds);
  const pool: Movie[] = [];
  for (const page of results)
    for (const m of page)
      if (!seen.has(m.id) && !dislikedSet.has(m.id)) { seen.add(m.id); pool.push(m); }
  return pool;
}

export function RouletteTab() {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterStreaming, setFilterStreaming]  = useState(false);
  const [genre, setGenre]                      = useState("");
  const [yearFrom, setYearFrom]                = useState("");
  const [yearTo, setYearTo]                    = useState("");
  const [minRating, setMinRating]              = useState([0]);
  const [spinning, setSpinning]                = useState(false);
  const [canFinish, setCanFinish]              = useState(false);
  const [poolSize, setPoolSize]                = useState<number | null>(null);
  const filtersDropdownRef                     = useRef<HTMLDivElement>(null);

  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [pendingMovie, setPendingMovie]        = useState<Movie | null>(null);
  const [awaitingVote, setAwaitingVote]        = useState(false);
  const [userVote, setUserVote]                = useState<"like" | "dislike" | null>(null);

  const [error, setError]                      = useState("");
  const [activeMood, setActiveMood]            = useState("");
  const [friendSpins, setFriendSpins]          = useState<
    { friend_id: string; friend_username: string; avatarUrl?: string; spins: RouletteSpin[] }[]
  >([]);
  const [recentSpins, setRecentSpins]          = useState<RouletteSpin[]>([]);
  const [spinsLoaded, setSpinsLoaded]          = useState(false);

  const user         = getUser();
  const userServices = getServices();
  const hasServices  = hasServicesConfigured(userServices);
  const btnColor     = getWheelColor(genre);

  useEffect(() => {
    if (!user) return;
    getfriendsRouletteHistory(user.user_id, 1).then(setFriendSpins).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) { setSpinsLoaded(true); return; }
    getRouletteHistory(user.user_id, 8)
      .then(s => { setRecentSpins(s); setSpinsLoaded(true); })
      .catch(() => setSpinsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(e.target as Node))
        setFiltersExpanded(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const refreshSpins = () => {
    if (!user) return;
    getRouletteHistory(user.user_id, 8).then(setRecentSpins).catch(() => {});
  };

  const spin = async () => {
    setSpinning(true);
    setCanFinish(false);
    setPendingMovie(null);
    setAwaitingVote(false);
    setUserVote(null);
    setSelectedMovieId(null);
    setPoolSize(null);
    setError("");

    const filters = {
      genre_id:        genre || undefined,
      year_from:       yearFrom || undefined,
      year_to:         yearTo || undefined,
      min_rating:      minRating[0] > 0 ? minRating[0] : undefined,
      services_filter: filterStreaming && hasServices ? userServices : undefined,
    };

    const dislikedIds = user ? getRoulettePrefs(user.user_id).disliked : [];

    try {
      let pool = await buildPool(filters, dislikedIds);
      if (pool.length === 0) pool = await buildPool(filters, []);

      if (pool.length === 0) {
        setError("No movies found — try loosening your filters.");
        setSpinning(false);
        return;
      }

      setPoolSize(pool.length);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setPendingMovie(pick);
      setCanFinish(true);

      if (user) {
        logRouletteSpin(user.user_id, user.avatarUrl, pick.id, pick.title, pick.poster).catch(() => {});
        setTimeout(refreshSpins, 800);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSpinning(false);
    }
  };

  const handleWheelFinished = () => {
    setSpinning(false);
    setCanFinish(false);
    if (pendingMovie) setAwaitingVote(true);
  };

  const handleVote = (vote: "like" | "dislike") => {
    if (!pendingMovie) return;
    setUserVote(vote);
    if (user) setRoulettePref(user.user_id, pendingMovie.id, vote);
    if (vote === "like") setSelectedMovieId(pendingMovie.id);
    else setTimeout(() => spin(), 400);
  };

  const hasActiveFilters = !!genre || minRating[0] > 0 || !!yearFrom || !!yearTo;

  return (
    <div className="flex flex-col">

      {/* ── Cinema Hero — full-bleed, flush with nav ── */}
      <div
        className="full-bleed relative overflow-hidden"
        style={{ marginTop: -32, marginBottom: 0 }}
      >
        {/* Film strips top + bottom */}
        <FilmStrip position="top" />
        <FilmStrip position="bottom" />

        {/* Dynamic glow that connects directly to the nav tab indicator */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 0%, ${btnColor}30 0%, ${btnColor}08 45%, transparent 75%)`,
          }}
        />

        {/* Spotlight beams — two faint cones from top center */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute"
            style={{
              top: 0, left: "50%", width: 500, height: "110%",
              transform: "translateX(-80%) rotate(-18deg)",
              transformOrigin: "top center",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.032) 0%, transparent 65%)",
            }}
          />
          <div
            className="absolute"
            style={{
              top: 0, left: "50%", width: 500, height: "110%",
              transform: "translateX(-20%) rotate(18deg)",
              transformOrigin: "top center",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.032) 0%, transparent 65%)",
            }}
          />
        </div>

        {/* Side curtain gradients */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black/70 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black/70 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center py-14 px-6 text-center" style={{ paddingTop: 56, paddingBottom: 48 }}>

          {/* "NOW PLAYING" marquee badge */}
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#7C5DBD]/60" />
            <span
              className="text-[11px] font-bold tracking-[0.25em] text-[#7C5DBD] uppercase"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              Now Playing
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C5DBD] animate-pulse" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#7C5DBD]/60" />
          </div>

          {/* Reelette logo */}
          <img
            src={reeletteLogo}
            alt="Reelette"
            className="h-20 w-auto mb-5"
            style={{
              filter: `drop-shadow(0 0 24px ${btnColor}99) drop-shadow(0 0 60px ${btnColor}44)`,
              transition: "filter 0.7s ease",
            }}
          />

          {/* Main tagline */}
          <h1
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
              lineHeight: 1.15,
              color: "#fff",
              textShadow: "0 2px 24px rgba(0,0,0,0.8)",
              letterSpacing: "-0.01em",
            }}
          >
            Don't know what to watch?
          </h1>

          {/* Subtitle */}
          <p
            className="mt-3 text-gray-400 font-medium"
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: "1.1rem",
              letterSpacing: "0.04em",
            }}
          >
            Let fate decide.
          </p>

          {/* Decorative rule */}
          <div className="flex items-center gap-3 mt-5">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#7C5DBD]/50" />
            <span className="text-[#7C5DBD]/60 text-xs tracking-widest">✦</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#7C5DBD]/50" />
          </div>

          {/* Pool size badge */}
          {poolSize !== null && (
            <div
              className="mt-4 flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs text-gray-400 animate-in fade-in duration-300"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }}
            >
              <Film className="w-3 h-3" />
              Picking from <span className="text-white font-semibold mx-0.5">{poolSize}</span> movies
            </div>
          )}
        </div>
      </div>

      {/* ── Main three-column layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr_280px] gap-6 items-start px-2 md:px-6 pt-8 pb-12">

        {/* ── Left: My Recent Spins ── */}
        <aside className="hidden md:flex flex-col gap-1">
          <p
            className="text-[10px] font-bold tracking-[0.2em] text-gray-600 uppercase px-1 mb-3"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            My Recent Spins
          </p>

          {!spinsLoaded && (
            [...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                <div className="w-14 h-[82px] rounded-lg bg-[#1C1C1C] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#1C1C1C] rounded w-3/4" />
                  <div className="h-2.5 bg-[#1C1C1C] rounded w-1/2" />
                </div>
              </div>
            ))
          )}

          {spinsLoaded && recentSpins.length === 0 && (
            <p className="text-gray-600 text-xs px-1 leading-relaxed">
              {user ? "Your spins will appear here." : "Log in to track your spins."}
            </p>
          )}

          {spinsLoaded && recentSpins.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2 group cursor-default">
              <div className="w-14 h-[82px] rounded-lg overflow-hidden bg-[#1C1C1C] shrink-0 ring-1 ring-white/5">
                {s.poster_url
                  ? <img src={s.poster_url} alt={s.movie_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  : <div className="w-full h-full bg-[#252525]" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{s.movie_title}</p>
                <p className="text-gray-600 text-[11px] mt-1">{timeAgo(s.spun_at)}</p>
              </div>
            </div>
          ))}
        </aside>

        {/* ── Center: Wheel + controls ── */}
        <div className="flex flex-col items-center gap-5">

          {/* Mood chips — always visible, primary filter */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5" style={{ maxWidth: 400, width: '100%' }}>
            <button
              onClick={() => { setActiveMood(""); setGenre(""); }}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition duration-150 active:scale-[0.97]"
              style={
                !activeMood
                  ? { backgroundColor: 'oklch(0.35 0.08 278)', borderColor: 'oklch(0.55 0.11 278)', color: '#d4c9f5' }
                  : { backgroundColor: '#111', borderColor: '#222', color: '#6b7280' }
              }
            >
              Any
            </button>
            {MOODS.map(mood => {
              const isActive = activeMood === mood.label;
              const moodColor = getWheelColor(mood.genre);
              return (
                <button
                  key={mood.label}
                  onClick={() => {
                    if (isActive) { setActiveMood(""); setGenre(""); }
                    else { setActiveMood(mood.label); setGenre(mood.genre); }
                  }}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition duration-150 active:scale-[0.97]"
                  style={
                    isActive
                      ? { backgroundColor: moodColor, borderColor: moodColor, color: '#fff', boxShadow: `0 0 14px ${moodColor}55` }
                      : { backgroundColor: '#111', borderColor: '#222', color: '#9ca3af' }
                  }
                >
                  {mood.label}
                </button>
              );
            })}
          </div>

          {/* Secondary controls */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-full px-3.5 py-2">
              <Switch
                checked={filterStreaming}
                onCheckedChange={setFilterStreaming}
                className="data-[state=checked]:bg-[#7C5DBD] scale-90"
              />
              <span
                className="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                onClick={() => setFilterStreaming(v => !v)}
              >
                My services only
                {filterStreaming && !hasServices && (
                  <span className="text-yellow-500 ml-1 text-[10px]">(none set)</span>
                )}
              </span>
            </div>

            <div className="relative" ref={filtersDropdownRef}>
              <button
                onClick={() => setFiltersExpanded(v => !v)}
                className={`flex items-center gap-1.5 text-xs border rounded-full px-3.5 py-2 transition-colors ${
                  (minRating[0] > 0 || !!yearFrom || !!yearTo)
                    ? "bg-[#111] border-[#3d3566] text-[#a89de0]"
                    : "bg-[#111] border-[#1e1e1e] text-gray-400 hover:text-white hover:border-[#333]"
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                Filters
                {(minRating[0] > 0 || !!yearFrom || !!yearTo) && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--reel-accent)' }} />
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${filtersExpanded ? "rotate-180" : ""}`} />
              </button>

              {filtersExpanded && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-[#111] border border-[#1e1e1e] rounded-2xl shadow-2xl z-50 p-5 space-y-5 panel-enter" style={{ transformOrigin: 'top center' }}>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Genre</p>
                    <select
                      value={genre}
                      onChange={e => { setGenre(e.target.value); setActiveMood(""); }}
                      className="w-full bg-[#0a0a0a] border border-[#252525] text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none"
                    >
                      <option value="">Any Genre</option>
                      {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">From</p>
                      <Input value={yearFrom} onChange={e => setYearFrom(e.target.value)} placeholder="1990"
                        className="bg-[#0a0a0a] border-[#252525] text-white text-xs h-8 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">To</p>
                      <Input value={yearTo} onChange={e => setYearTo(e.target.value)} placeholder="2025"
                        className="bg-[#0a0a0a] border-[#252525] text-white text-xs h-8 rounded-lg" />
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
                      onClick={() => { setGenre(""); setActiveMood(""); setMinRating([0]); setYearFrom(""); setYearTo(""); }}
                      className="text-xs hover:opacity-80 transition-opacity font-medium"
                      style={{ color: 'var(--reel-accent)' }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Spin button — above the wheel */}
          {!awaitingVote && (
            <div className="relative w-full max-w-[340px]">
              <div
                className={`absolute -inset-2 rounded-full blur-xl transition-opacity duration-500 ${spinning ? "opacity-0" : "opacity-60 animate-pulse"}`}
                style={{ backgroundColor: `${btnColor}60` }}
              />
              <button
                onClick={spin}
                disabled={spinning}
                className="relative w-full py-5 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-full shadow-xl active:scale-[0.97]"
                style={{
                  backgroundColor: btnColor,
                  boxShadow: `0 8px 40px ${btnColor}60`,
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  letterSpacing: "0.01em",
                  transition: 'transform 150ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 300ms ease, opacity 200ms ease',
                }}
              >
                <Shuffle className={`w-6 h-6 ${spinning ? "animate-spin" : ""} shrink-0`} style={{ fontStyle: "normal" }} />
                {spinning ? "Spinning…" : "Spin the Reel"}
              </button>
            </div>
          )}

          {/* Wheel */}
          <div
            style={{
              filter: awaitingVote ? "brightness(0.35) blur(2px)" : "none",
              transition: "filter 0.4s ease",
              pointerEvents: awaitingVote ? "none" : "auto",
            }}
          >
            <RouletteWheelModal
              genre={genre}
              isSpinning={spinning}
              canFinish={canFinish}
              onFinished={handleWheelFinished}
            />
          </div>

          {error && <p className="text-yellow-500 text-sm text-center">{error}</p>}

          {/* Vote card */}
          {awaitingVote && pendingMovie && (
            <div className="w-full max-w-[420px] bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="flex gap-5 p-5 pb-3">
                <div className="relative shrink-0">
                  {pendingMovie.poster ? (
                    <img src={pendingMovie.poster} alt={pendingMovie.title}
                      className="w-24 h-36 rounded-xl object-cover shadow-xl ring-1 ring-white/10" />
                  ) : (
                    <div className="w-24 h-36 rounded-xl bg-[#1a1a1a] flex items-center justify-center ring-1 ring-white/5">
                      <Film className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  {pendingMovie.streamingService && PROVIDER_LOGOS[pendingMovie.streamingService] && (
                    <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-lg overflow-hidden shadow-lg ring-1 ring-black">
                      <img src={PROVIDER_LOGOS[pendingMovie.streamingService]} alt={pendingMovie.streamingService} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                  <p
                    className="text-white font-bold leading-snug line-clamp-2"
                    style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: '1rem' }}
                  >
                    {pendingMovie.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    {pendingMovie.year > 0 && <span className="text-gray-500">{pendingMovie.year}</span>}
                    {pendingMovie.rating > 0 && <span className="text-yellow-400 font-semibold">★ {pendingMovie.rating.toFixed(1)}</span>}
                  </div>
                  {pendingMovie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {pendingMovie.genres.slice(0, 2).map(g => (
                        <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-500 border border-white/[0.06]">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p
                className="text-[11px] text-gray-600 text-center italic px-5 pb-3"
                style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
              >
                Fate has spoken. Your verdict?
              </p>

              <div className="grid grid-cols-2 gap-3 px-4 pb-3">
                <button
                  onClick={() => handleVote("dislike")}
                  disabled={userVote !== null}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-[#222] bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm font-semibold text-gray-400 hover:text-red-400 disabled:opacity-40"
                >
                  <ThumbsDown className="w-4 h-4" /> Pass
                </button>
                <button
                  onClick={() => handleVote("like")}
                  disabled={userVote !== null}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all text-sm font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
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
                  onClick={() => setSelectedMovieId(pendingMovie.id)}
                  className="text-xs text-gray-400 hover:text-white transition-colors font-medium"
                >
                  More info →
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── Right: Friends' Spins ── */}
        <aside className="hidden md:flex flex-col gap-1">
          <p
            className="text-[10px] font-bold tracking-[0.2em] text-gray-600 uppercase px-1 mb-3"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Friends' Spins
          </p>
          {friendSpins.length === 0 && (
            <p className="text-gray-600 text-xs px-1">
              {user ? "No friend spins yet." : "Log in to see friends' spins."}
            </p>
          )}
          {friendSpins.slice(0, 8).map(entry => {
            const s = entry.spins[0];
            return (
              <div key={entry.friend_id} className="flex items-center gap-3 py-2 group cursor-default">
                {s.poster_url ? (
                  <div className="relative w-14 h-[82px] rounded-lg overflow-hidden bg-[#1C1C1C] shrink-0 ring-1 ring-white/5">
                    <img src={s.poster_url} alt={s.movie_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    <img
                      src={entry.avatarUrl || dicebearUrl(entry.friend_username)}
                      alt={entry.friend_username}
                      className="absolute bottom-1 right-1 w-6 h-6 rounded-full object-cover bg-[#1a1a1a] ring-1 ring-black"
                      onError={e => { (e.target as HTMLImageElement).src = dicebearUrl(entry.friend_username); }}
                    />
                  </div>
                ) : (
                  <img
                    src={entry.avatarUrl || dicebearUrl(entry.friend_username)}
                    alt={entry.friend_username}
                    className="w-10 h-10 rounded-full object-cover shrink-0 bg-[#1a1a1a] ring-1 ring-white/10"
                    onError={e => { (e.target as HTMLImageElement).src = dicebearUrl(entry.friend_username); }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{s.movie_title}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">@{entry.friend_username}</p>
                  <p className="text-gray-700 text-[10px] mt-0.5">{timeAgo(s.spun_at)}</p>
                </div>
              </div>
            );
          })}
        </aside>
      </div>

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
