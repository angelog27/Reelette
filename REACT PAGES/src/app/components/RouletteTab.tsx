import { useState, useEffect, useRef } from "react";
import { Shuffle, ChevronDown, ThumbsUp, ThumbsDown } from "lucide-react";
import { MovieDetailModal } from "./MovieDetailModal";
import { RouletteWheelModal, getWheelColor } from "./RouletteWheelModal";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
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

const HERO_POSTER =
  "https://image.tmdb.org/t/p/original/np0dsehLDdbfyHFRtqCiL1GR0TQ.jpg";

const GENRES = [
  { label: "Action", value: "28" },
  { label: "Adventure", value: "12" },
  { label: "Animation", value: "16" },
  { label: "Comedy", value: "35" },
  { label: "Crime", value: "80" },
  { label: "Documentary", value: "99" },
  { label: "Drama", value: "18" },
  { label: "Family", value: "10751" },
  { label: "Fantasy", value: "14" },
  { label: "History", value: "36" },
  { label: "Horror", value: "27" },
  { label: "Music", value: "10402" },
  { label: "Mystery", value: "9648" },
  { label: "Romance", value: "10749" },
  { label: "Science Fiction", value: "878" },
  { label: "Thriller", value: "53" },
  { label: "War", value: "10752" },
  { label: "Western", value: "37" },
];

const MOODS = [
  { label: "Mind-bender", genre: "878" },
  { label: "Cozy", genre: "35" },
  { label: "Short", genre: "16" },
  { label: "Date night", genre: "10749" },
];

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

/** Fetch 3 pages in parallel (cache makes repeat calls free), dedup, filter disliked. */
async function buildPool(
  filters: Parameters<typeof discoverMovies>[0],
  dislikedIds: string[]
): Promise<Movie[]> {
  // Pick 3 unique random pages from 1–8 to maximise variety
  const pages = new Set<number>();
  pages.add(1); // always include page 1 as anchor
  while (pages.size < 3) pages.add(Math.floor(Math.random() * 8) + 1);

  const results = await Promise.all(
    [...pages].map(page => discoverMovies({ ...filters, page }).catch(() => [] as Movie[]))
  );

  const seen = new Set<string>();
  const dislikedSet = new Set(dislikedIds);
  const pool: Movie[] = [];

  for (const page of results) {
    for (const m of page) {
      if (!seen.has(m.id) && !dislikedSet.has(m.id)) {
        seen.add(m.id);
        pool.push(m);
      }
    }
  }
  return pool;
}

export function RouletteTab() {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterStreaming, setFilterStreaming]   = useState(false);
  const [genre, setGenre]                       = useState("");
  const [yearFrom, setYearFrom]                 = useState("");
  const [yearTo, setYearTo]                     = useState("");
  const [minRating, setMinRating]               = useState([0]);
  const [spinning, setSpinning]                 = useState(false);
  const [canFinish, setCanFinish]               = useState(false);
  const filtersDropdownRef = useRef<HTMLDivElement>(null);

  // Movie selected for detail modal
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  // Movie pending a vote (shown after wheel stops)
  const [pendingMovie, setPendingMovie]       = useState<Movie | null>(null);
  const [awaitingVote, setAwaitingVote]       = useState(false);
  const [userVote, setUserVote]               = useState<'like' | 'dislike' | null>(null);

  const [error, setError]                     = useState("");
  const [activeMood, setActiveMood]           = useState("");
  const [friendSpins, setFriendSpins]         = useState<
    { friend_id: string; friend_username: string; avatarUrl?: string; spins: RouletteSpin[] }[]
  >([]);
  const [recentSpins, setRecentSpins]         = useState<RouletteSpin[]>([]);
  const [spinsLoaded, setSpinsLoaded]         = useState(false);

  const user         = getUser();
  const userServices = getServices();
  const hasServices  = hasServicesConfigured(userServices);

  useEffect(() => {
    if (!user) return;
    getfriendsRouletteHistory(user.user_id, 1).then(setFriendSpins).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) { setSpinsLoaded(true); return; }
    getRouletteHistory(user.user_id, 8)
      .then(spins => { setRecentSpins(spins); setSpinsLoaded(true); })
      .catch(() => setSpinsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(e.target as Node))
        setFiltersExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const refreshSpins = () => {
    if (!user) return;
    getRouletteHistory(user.user_id, 8).then(setRecentSpins).catch(() => {});
  };

  const handleMoodClick = (mood: (typeof MOODS)[0]) => {
    if (activeMood === mood.label) { setActiveMood(""); setGenre(""); }
    else { setActiveMood(mood.label); setGenre(mood.genre); }
  };

  const handleGenreChange = (val: string) => { setGenre(val); setActiveMood(""); };

  const spin = async () => {
    setSpinning(true);
    setCanFinish(false);
    setPendingMovie(null);
    setAwaitingVote(false);
    setUserVote(null);
    setSelectedMovieId(null);
    setError("");

    const filters = {
      genre_id:       genre || undefined,
      year_from:      yearFrom || undefined,
      year_to:        yearTo || undefined,
      min_rating:     minRating[0] > 0 ? minRating[0] : undefined,
      services_filter: filterStreaming && hasServices ? userServices : undefined,
    };

    const dislikedIds = user ? getRoulettePrefs(user.user_id).disliked : [];

    try {
      // Build a pool of up to ~60 movies across 3 pages, minus disliked
      let pool = await buildPool(filters, dislikedIds);

      // If filtering wiped out everything, try without disliked filter as fallback
      if (pool.length === 0) {
        pool = await buildPool(filters, []);
      }

      if (pool.length === 0) {
        setError("No movies found with these filters. Try adjusting your criteria.");
        setSpinning(false);
      } else {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setPendingMovie(pick);
        setCanFinish(true);

        if (user) {
          logRouletteSpin(user.user_id, user.avatarUrl, pick.id, pick.title, pick.poster).catch(() => {});
          setTimeout(refreshSpins, 800);
        }
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

  const handleVote = (vote: 'like' | 'dislike') => {
    if (!pendingMovie) return;
    setUserVote(vote);
    if (user) setRoulettePref(user.user_id, pendingMovie.id, vote);

    if (vote === 'like') {
      // Open movie detail
      setSelectedMovieId(pendingMovie.id);
    } else {
      // Disliked — respin immediately
      setTimeout(() => spin(), 400);
    }
  };

  return (
    <div className="space-y-0">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-6">
        <div className="relative overflow-hidden rounded-2xl h-[320px] w-full">
          <div
            className="absolute inset-0 bg-cover"
            style={{ backgroundImage: `url(${HERO_POSTER})`, backgroundPosition: "right top" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808] from-0% via-[#080808]/75 via-60% to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D]/70 via-transparent to-transparent" />

          <div className="relative z-10 h-full flex flex-col justify-center px-8 py-5 max-w-[540px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-bold tracking-widest text-[#C0392B] uppercase border border-[#C0392B]/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                Sponsored Spin
              </span>
              <span className="text-[9px] font-bold tracking-wide text-white bg-[#0063e5] px-2.5 py-0.5 rounded-full">
                Only on Disney+
              </span>
            </div>

            <h1 className="text-5xl font-black uppercase text-white tracking-tight leading-none">
              TRON: ARES
            </h1>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-gray-400 text-xs">2025</span>
              <span className="text-gray-600 text-xs">·</span>
              <span className="text-yellow-400 text-xs font-medium">★ 7.4</span>
              <span className="text-gray-600 text-xs">·</span>
              {["Action", "Sci-Fi", "Adventure"].map(g => (
                <span key={g} className="text-[10px] text-gray-300 border border-gray-600/70 px-1.5 py-0.5 rounded">{g}</span>
              ))}
            </div>

            <p className="text-gray-400 text-xs mt-2 leading-relaxed line-clamp-2 max-w-[380px]">
              A rogue program escapes the digital Grid and enters the real world
              — only Ares, a lethal enforcer built for war, can bring him back.
              Starring Jared Leto &amp; Evan Peters.
            </p>

            <div className="flex items-center gap-2.5 mt-4">
              <button className="flex items-center gap-1.5 bg-[#0063e5] hover:bg-[#0057cc] text-white font-semibold text-xs px-4 py-2 rounded-full transition-colors">
                Watch on Disney+
              </button>
              <button
                onClick={spin}
                disabled={spinning}
                className="flex items-center gap-1.5 border border-white/30 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs px-4 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                <Shuffle className={`w-3 h-3 ${spinning ? "animate-spin" : ""}`} />
                Re-spin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Three-column grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-start px-4 md:px-6 py-6">

        {/* Left — My Recent Spins */}
        <aside className="hidden md:flex flex-col gap-2">
          <h3 className="text-white font-semibold text-sm px-1 mb-1">My Recent Spins</h3>

          {!spinsLoaded && (
            [...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="w-9 h-12 rounded bg-[#1C1C1C] flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-[#1C1C1C] rounded w-3/4" />
                  <div className="h-2 bg-[#1C1C1C] rounded w-1/2" />
                </div>
              </div>
            ))
          )}

          {spinsLoaded && recentSpins.length === 0 && (
            <p className="text-gray-600 text-xs px-1 leading-relaxed">
              {user ? "Your spins will appear here." : "Log in to track your spins."}
            </p>
          )}

          {spinsLoaded && recentSpins.length > 0 && (
            <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto">
              {recentSpins.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-9 h-12 rounded overflow-hidden bg-[#1C1C1C] flex-shrink-0">
                    {s.poster_url
                      ? <img src={s.poster_url} alt={s.movie_title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-[#252525]" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[11px] font-medium truncate leading-tight">{s.movie_title}</p>
                    <p className="text-gray-600 text-[10px] mt-0.5">{timeAgo(s.spun_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center — Roulette controls */}
        <div className="flex flex-col items-center gap-4 min-w-0">

          {/* Controls row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={filterStreaming}
                onCheckedChange={setFilterStreaming}
                className="data-[state=checked]:bg-[#C0392B]"
              />
              <label
                className="text-gray-300 text-xs cursor-pointer whitespace-nowrap"
                onClick={() => setFilterStreaming(!filterStreaming)}
              >
                Only show movies I can watch
                {filterStreaming && !hasServices && (
                  <span className="text-yellow-500 ml-1.5 text-[10px]">(no services set)</span>
                )}
              </label>
            </div>

            {/* Filters dropdown */}
            <div className="relative" ref={filtersDropdownRef}>
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-[#444] bg-[#1A1A1A] px-2.5 py-1.5 rounded-md transition-colors"
              >
                Filters
                <ChevronDown className={`w-3 h-3 transition-transform ${filtersExpanded ? "rotate-180" : ""}`} />
              </button>

              {filtersExpanded && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl shadow-2xl z-50 p-4 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">Vibe</label>
                    <div className="flex flex-wrap gap-1.5">
                      {MOODS.map(mood => (
                        <button
                          key={mood.label}
                          onClick={() => handleMoodClick(mood)}
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

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500">Genre</label>
                    <select
                      value={genre}
                      onChange={e => handleGenreChange(e.target.value)}
                      className="w-full bg-[#141414] border border-[#2A2A2A] text-white text-xs rounded-md px-2.5 py-1.5 focus:border-[#C0392B] focus:outline-none"
                    >
                      <option value="">Any Genre</option>
                      {GENRES.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-500">Year From</label>
                      <Input value={yearFrom} onChange={e => setYearFrom(e.target.value)} placeholder="1990"
                        className="bg-[#141414] border-[#2A2A2A] text-white text-xs h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-500">Year To</label>
                      <Input value={yearTo} onChange={e => setYearTo(e.target.value)} placeholder="2024"
                        className="bg-[#141414] border-[#2A2A2A] text-white text-xs h-7" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-500">Min Rating</label>
                      <span className="text-white text-xs">{minRating[0]}/10</span>
                    </div>
                    <Slider value={minRating} onValueChange={setMinRating} max={10} step={0.5} className="w-full" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Spin Button — hidden while awaiting vote */}
          {!awaitingVote && (() => {
            const btnColor = getWheelColor(genre);
            return (
              <div className="relative w-full max-w-sm">
                <div
                  className={`absolute -inset-1 rounded-full blur-md transition-opacity ${spinning ? "opacity-0" : "animate-pulse"}`}
                  style={{ backgroundColor: `${btnColor}40` }}
                />
                <button
                  onClick={spin}
                  disabled={spinning}
                  className="relative w-full py-5 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xl rounded-full transition-all shadow-lg"
                  style={{ backgroundColor: btnColor, boxShadow: `0 10px 30px ${btnColor}40` }}
                >
                  <Shuffle className={`w-6 h-6 ${spinning ? "animate-spin" : ""}`} />
                  {spinning ? "Spinning…" : "Spin the Roulette"}
                </button>
              </div>
            );
          })()}

          {error && <p className="text-center text-yellow-500 text-sm">{error}</p>}

          {/* Wheel */}
          <RouletteWheelModal
            genre={genre}
            isSpinning={spinning}
            canFinish={canFinish}
            onFinished={handleWheelFinished}
          />

          {/* ── Vote card — shown after wheel stops ── */}
          {awaitingVote && pendingMovie && (
            <div className="w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex gap-4 p-4">
                {pendingMovie.poster && (
                  <img
                    src={pendingMovie.poster}
                    alt={pendingMovie.title}
                    className="w-16 h-24 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-white font-semibold text-sm line-clamp-2 leading-snug">
                    {pendingMovie.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {pendingMovie.year > 0 && <span>{pendingMovie.year}</span>}
                    {pendingMovie.rating > 0 && (
                      <span className="text-yellow-500">★ {pendingMovie.rating.toFixed(1)}</span>
                    )}
                  </div>
                  {pendingMovie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pendingMovie.genres.slice(0, 2).map(g => (
                        <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.07] text-gray-400">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4">
                <p className="text-xs text-gray-500 text-center mb-3">What do you think of this pick?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVote('dislike')}
                    disabled={userVote !== null}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2A2A2A] bg-white/[0.04] hover:bg-red-500/10 hover:border-red-500/40 transition-colors text-sm font-medium text-gray-300 hover:text-red-400 disabled:opacity-50"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Nope, respin
                  </button>
                  <button
                    onClick={() => handleVote('like')}
                    disabled={userVote !== null}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2A2A2A] bg-white/[0.04] hover:bg-green-500/10 hover:border-green-500/40 transition-colors text-sm font-medium text-gray-300 hover:text-green-400 disabled:opacity-50"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    I'll watch it
                  </button>
                </div>
              </div>

              {/* Respin without voting */}
              <div className="border-t border-[#2A2A2A] px-4 py-2.5 flex items-center justify-between">
                <button
                  onClick={() => {
                    setAwaitingVote(false);
                    setPendingMovie(null);
                    spin();
                  }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Skip &amp; spin again
                </button>
                <button
                  onClick={() => setSelectedMovieId(pendingMovie.id)}
                  className="text-xs text-[#C0392B] hover:text-[#E74C3C] transition-colors font-medium"
                >
                  More info →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right — Friends' Spins */}
        <aside className="hidden md:flex flex-col gap-2">
          <h3 className="text-white font-semibold text-sm px-1 mb-1">Friends' Spins</h3>
          {friendSpins.slice(0, 6).map(entry => {
            const s = entry.spins[0];
            return (
              <div key={entry.friend_id} className="flex items-start gap-2 bg-[#1A1A1A] rounded-lg p-2.5">
                <img
                  src={entry.avatarUrl || dicebearUrl(entry.friend_username)}
                  alt={entry.friend_username}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-[#2A2A2A]"
                  onError={e => { (e.target as HTMLImageElement).src = dicebearUrl(entry.friend_username); }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">{s.movie_title}</p>
                  <p className="text-gray-500 text-[10px] truncate">@{entry.friend_username}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5">{timeAgo(s.spun_at)}</p>
                </div>
              </div>
            );
          })}
          {friendSpins.length === 0 && (
            <p className="text-gray-600 text-xs px-1">
              {user ? "No friend spins yet." : "Log in to see friends' spins."}
            </p>
          )}
        </aside>
      </div>

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
