import { useState, useEffect, useRef } from "react";
import { Shuffle, ChevronDown, ThumbsUp, ThumbsDown, Film, SlidersHorizontal } from "lucide-react";
import { MovieDetailModal } from "./MovieDetailModal";
import { RouletteWheelModal, getWheelColor } from "./RouletteWheelModal";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import reeletteLogo from "../../assets/Reelette_LOGO_upscaled.png";
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
    <div className="min-h-[calc(100vh-80px)] flex flex-col">

      {/* ── Hero header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden flex flex-col items-center justify-center pt-12 pb-10 px-6 select-none">
        {/* Ambient background glow */}
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${btnColor}22 0%, transparent 70%)`,
          }}
        />
        {/* Subtle film-strip lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 60px)",
          }}
        />

        <img
          src={reeletteLogo}
          alt="Reelette"
          className="relative z-10 h-20 w-auto mb-4 drop-shadow-[0_0_30px_rgba(192,57,43,0.5)]"
        />
        <h1 className="relative z-10 text-4xl md:text-5xl font-black text-white tracking-tight text-center leading-tight">
          Don't know what to watch?
        </h1>
        <p className="relative z-10 mt-2 text-lg text-gray-400 font-medium tracking-wide text-center">
          Let fate decide.
        </p>

        {/* Pool size badge — shown after a spin */}
        {poolSize !== null && (
          <div className="relative z-10 mt-4 flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.1] px-3 py-1.5 rounded-full text-xs text-gray-400">
            <Film className="w-3 h-3" />
            Picking from <span className="text-white font-semibold mx-0.5">{poolSize}</span> movies
          </div>
        )}
      </div>

      {/* ── Main three-column layout ─────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[200px_1fr_200px] gap-6 items-start px-4 md:px-8 pb-12">

        {/* ── Left: My Recent Spins ── */}
        <aside className="hidden md:flex flex-col gap-1 pt-2">
          <p className="text-[11px] font-bold tracking-widest text-gray-500 uppercase px-1 mb-2">
            My Recent Spins
          </p>

          {!spinsLoaded && (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5 animate-pulse">
                <div className="w-9 h-[52px] rounded-md bg-[#1C1C1C] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-[#1C1C1C] rounded w-3/4" />
                  <div className="h-2 bg-[#1C1C1C] rounded w-1/2" />
                </div>
              </div>
            ))
          )}

          {spinsLoaded && recentSpins.length === 0 && (
            <p className="text-gray-600 text-xs px-1 leading-relaxed mt-1">
              {user ? "Your spins will appear here." : "Log in to track your spins."}
            </p>
          )}

          {spinsLoaded && recentSpins.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5 group">
              <div className="w-9 h-[52px] rounded-md overflow-hidden bg-[#1C1C1C] shrink-0">
                {s.poster_url
                  ? <img src={s.poster_url} alt={s.movie_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  : <div className="w-full h-full bg-[#252525]" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-[11px] font-medium truncate leading-tight">{s.movie_title}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{timeAgo(s.spun_at)}</p>
              </div>
            </div>
          ))}
        </aside>

        {/* ── Center: Wheel + controls ── */}
        <div className="flex flex-col items-center gap-5">

          {/* Filter controls bar */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* Streaming toggle */}
            <div className="flex items-center gap-2 bg-[#161616] border border-[#222] rounded-full px-3.5 py-2">
              <Switch
                checked={filterStreaming}
                onCheckedChange={setFilterStreaming}
                className="data-[state=checked]:bg-[#C0392B] scale-90"
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

            {/* Filters dropdown */}
            <div className="relative" ref={filtersDropdownRef}>
              <button
                onClick={() => setFiltersExpanded(v => !v)}
                className={`flex items-center gap-1.5 text-xs border rounded-full px-3.5 py-2 transition-colors ${
                  hasActiveFilters
                    ? "bg-[#C0392B]/10 border-[#C0392B]/40 text-[#E74C3C]"
                    : "bg-[#161616] border-[#222] text-gray-400 hover:text-white hover:border-[#444]"
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                Filters
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#C0392B]" />}
                <ChevronDown className={`w-3 h-3 transition-transform ${filtersExpanded ? "rotate-180" : ""}`} />
              </button>

              {filtersExpanded && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-[#161616] border border-[#252525] rounded-2xl shadow-2xl z-50 p-5 space-y-5">
                  {/* Vibe chips */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vibe</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MOODS.map(mood => (
                        <button
                          key={mood.label}
                          onClick={() => {
                            if (activeMood === mood.label) { setActiveMood(""); setGenre(""); }
                            else { setActiveMood(mood.label); setGenre(mood.genre); }
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                            activeMood === mood.label
                              ? "bg-[#C0392B] border-[#C0392B] text-white"
                              : "border-[#2A2A2A] text-gray-400 hover:border-[#C0392B]/50 hover:text-white"
                          }`}
                        >
                          {mood.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Genre */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Genre</p>
                    <select
                      value={genre}
                      onChange={e => { setGenre(e.target.value); setActiveMood(""); }}
                      className="w-full bg-[#111] border border-[#2A2A2A] text-white text-xs rounded-lg px-2.5 py-2 focus:border-[#C0392B] focus:outline-none"
                    >
                      <option value="">Any Genre</option>
                      {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>

                  {/* Year */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">From</p>
                      <Input value={yearFrom} onChange={e => setYearFrom(e.target.value)} placeholder="1990"
                        className="bg-[#111] border-[#2A2A2A] text-white text-xs h-8 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">To</p>
                      <Input value={yearTo} onChange={e => setYearTo(e.target.value)} placeholder="2025"
                        className="bg-[#111] border-[#2A2A2A] text-white text-xs h-8 rounded-lg" />
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Min Rating</p>
                      <span className="text-white text-xs font-semibold">
                        {minRating[0] > 0 ? `${minRating[0]}+` : "Any"}
                      </span>
                    </div>
                    <Slider value={minRating} onValueChange={setMinRating} max={9} step={0.5} className="w-full" />
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={() => { setGenre(""); setActiveMood(""); setMinRating([0]); setYearFrom(""); setYearTo(""); }}
                      className="text-xs text-[#C0392B] hover:text-[#E74C3C] transition-colors font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Wheel — always rendered, it's the star */}
          <div
            className="relative"
            style={{
              filter: awaitingVote ? "brightness(0.45) blur(1px)" : "none",
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

          {/* Error */}
          {error && <p className="text-yellow-500 text-sm text-center">{error}</p>}

          {/* Vote card — slides up over the wheel area */}
          {awaitingVote && pendingMovie && (
            <div className="w-full max-w-[380px] -mt-4 bg-[#161616] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex gap-4 p-4">
                {pendingMovie.poster ? (
                  <img src={pendingMovie.poster} alt={pendingMovie.title}
                    className="w-16 h-24 rounded-xl object-cover shrink-0 shadow-lg" />
                ) : (
                  <div className="w-16 h-24 rounded-xl bg-[#222] shrink-0 flex items-center justify-center">
                    <Film className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-white font-bold text-sm line-clamp-2 leading-snug">{pendingMovie.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    {pendingMovie.year > 0 && <span className="text-gray-500">{pendingMovie.year}</span>}
                    {pendingMovie.rating > 0 && <span className="text-yellow-400 font-semibold">★ {pendingMovie.rating.toFixed(1)}</span>}
                  </div>
                  {pendingMovie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pendingMovie.genres.slice(0, 3).map(g => (
                        <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400 border border-white/[0.08]">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-gray-500 text-center">Fate has spoken — what do you think?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleVote("dislike")}
                    disabled={userVote !== null}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#2A2A2A] bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/50 transition-all text-sm font-semibold text-gray-300 hover:text-red-400 disabled:opacity-40"
                  >
                    <ThumbsDown className="w-4 h-4" /> Nope
                  </button>
                  <button
                    onClick={() => handleVote("like")}
                    disabled={userVote !== null}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#2A2A2A] bg-white/[0.03] hover:bg-green-500/10 hover:border-green-500/50 transition-all text-sm font-semibold text-gray-300 hover:text-green-400 disabled:opacity-40"
                  >
                    <ThumbsUp className="w-4 h-4" /> I'm in
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => { setAwaitingVote(false); setPendingMovie(null); spin(); }}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Skip &amp; respin
                  </button>
                  <button
                    onClick={() => setSelectedMovieId(pendingMovie.id)}
                    className="text-xs text-[#C0392B] hover:text-[#E74C3C] transition-colors font-semibold"
                  >
                    More info →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Spin button — hidden while vote card is up */}
          {!awaitingVote && (
            <div className="relative w-full max-w-[340px]">
              <div
                className={`absolute -inset-1.5 rounded-full blur-xl transition-opacity duration-500 ${spinning ? "opacity-0" : "opacity-70 animate-pulse"}`}
                style={{ backgroundColor: `${btnColor}55` }}
              />
              <button
                onClick={spin}
                disabled={spinning}
                className="relative w-full py-5 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-xl rounded-full tracking-wide transition-all shadow-xl active:scale-[0.97]"
                style={{
                  backgroundColor: btnColor,
                  boxShadow: `0 8px 32px ${btnColor}55`,
                  letterSpacing: "0.06em",
                }}
              >
                <Shuffle className={`w-6 h-6 ${spinning ? "animate-spin" : ""}`} />
                {spinning ? "Spinning…" : "Spin the Reel"}
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Friends' Spins ── */}
        <aside className="hidden md:flex flex-col gap-1 pt-2">
          <p className="text-[11px] font-bold tracking-widest text-gray-500 uppercase px-1 mb-2">
            Friends' Spins
          </p>
          {friendSpins.length === 0 && (
            <p className="text-gray-600 text-xs px-1">
              {user ? "No friend spins yet." : "Log in to see friends' spins."}
            </p>
          )}
          {friendSpins.slice(0, 7).map(entry => {
            const s = entry.spins[0];
            return (
              <div key={entry.friend_id} className="flex items-start gap-2.5 py-1.5 group">
                <img
                  src={entry.avatarUrl || dicebearUrl(entry.friend_username)}
                  alt={entry.friend_username}
                  className="w-8 h-8 rounded-full object-cover shrink-0 bg-[#2A2A2A] ring-1 ring-white/10"
                  onError={e => { (e.target as HTMLImageElement).src = dicebearUrl(entry.friend_username); }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-[11px] font-medium truncate leading-tight">{s.movie_title}</p>
                  <p className="text-gray-500 text-[10px] truncate">@{entry.friend_username}</p>
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
