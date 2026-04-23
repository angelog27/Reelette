import { useState, useEffect, useRef } from "react";
import { Shuffle, ChevronDown } from "lucide-react";
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
  timeAgo,
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

const cardClass = "bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-xl";
const subCardClass = "bg-background/80 border border-border rounded-lg";
const inputClass =
  "w-full bg-background/80 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 transition-all";
const primaryButtonClass =
  "bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30";
const secondaryButtonClass =
  "bg-muted hover:bg-accent text-foreground border border-border rounded-lg transition-all";

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

export function RouletteTab() {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterStreaming, setFilterStreaming] = useState(false);
  const [genre, setGenre] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minRating, setMinRating] = useState([0]);
  const [spinning, setSpinning] = useState(false);
  const [canFinish, setCanFinish] = useState(false);
  const pendingMovieIdRef = useRef<string | null>(null);
  const filtersDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeMood, setActiveMood] = useState("");
  const [friendSpins, setFriendSpins] = useState<
    { friend_id: string; friend_username: string; avatarUrl?: string; spins: RouletteSpin[] }[]
  >([]);
  const [recentSpins, setRecentSpins] = useState<RouletteSpin[]>([]);
  const [spinsLoaded, setSpinsLoaded] = useState(false);

  const user = getUser();
  const userServices = getServices();
  const hasServices = hasServicesConfigured(userServices);

  useEffect(() => {
    if (!user) return;
    getfriendsRouletteHistory(user.user_id, 1)
      .then(setFriendSpins)
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) {
      setSpinsLoaded(true);
      return;
    }
    getRouletteHistory(user.user_id, 8)
      .then((spins) => {
        setRecentSpins(spins);
        setSpinsLoaded(true);
      })
      .catch(() => setSpinsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filtersDropdownRef.current &&
        !filtersDropdownRef.current.contains(e.target as Node)
      ) {
        setFiltersExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshSpins = () => {
    if (!user) return;
    getRouletteHistory(user.user_id, 8)
      .then(setRecentSpins)
      .catch(() => {});
  };

  const handleMoodClick = (mood: (typeof MOODS)[0]) => {
    if (activeMood === mood.label) {
      setActiveMood("");
      setGenre("");
    } else {
      setActiveMood(mood.label);
      setGenre(mood.genre);
    }
  };

  const handleGenreChange = (val: string) => {
    setGenre(val);
    setActiveMood("");
  };

  const spin = async () => {
    setSpinning(true);
    setCanFinish(false);
    setSelectedMovieId(null);
    pendingMovieIdRef.current = null;
    setError("");

    const randomPage = Math.floor(Math.random() * 5) + 1;

    const filters = {
      genre_id: genre || undefined,
      year_from: yearFrom || undefined,
      year_to: yearTo || undefined,
      min_rating: minRating[0] > 0 ? minRating[0] : undefined,
      services_filter:
        filterStreaming && hasServices ? userServices : undefined,
    };

    try {
      let movies = await discoverMovies({ ...filters, page: randomPage });
      if (movies.length === 0) {
        movies = await discoverMovies({ ...filters, page: 1 });
      }
      if (movies.length === 0) {
        setError("No movies found with these filters. Try adjusting your criteria.");
        setSpinning(false);
        setCanFinish(false);
      } else {
        const pick = movies[Math.floor(Math.random() * movies.length)];
        pendingMovieIdRef.current = pick.id;
        setCanFinish(true);
        if (user) {
          logRouletteSpin(
            user.user_id,
            user.avatarUrl,
            pick.id,
            pick.title,
            pick.poster
          ).catch(() => {});
          setTimeout(refreshSpins, 800);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSpinning(false);
      setCanFinish(false);
    }
  };

  const handleWheelFinished = () => {
    setSpinning(false);
    setCanFinish(false);
    if (pendingMovieIdRef.current) setSelectedMovieId(pendingMovieIdRef.current);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40 -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent -z-10"></div>

      {/* Hero */}
      <div className="px-4 md:px-6 pt-6">
        <div className="relative overflow-hidden rounded-2xl h-[320px] w-full border border-border">
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: `url(${HERO_POSTER})`,
              backgroundPosition: "right top",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />

          <div className="relative z-10 h-full flex flex-col justify-center px-8 py-5 max-w-[540px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-bold tracking-widest text-red-600 uppercase border border-red-600/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm bg-background/40">
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
              <span className="text-white/80 text-xs">2025</span>
              <span className="text-white/50 text-xs">·</span>
              <span className="text-yellow-400 text-xs font-medium">★ 7.4</span>
              <span className="text-white/50 text-xs">·</span>
              {["Action", "Sci-Fi", "Adventure"].map((g) => (
                <span
                  key={g}
                  className="text-[10px] text-white/85 border border-white/25 px-1.5 py-0.5 rounded"
                >
                  {g}
                </span>
              ))}
            </div>

            <p className="text-white/75 text-xs mt-2 leading-relaxed line-clamp-2 max-w-[380px]">
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
                className="flex items-center gap-1.5 border border-white/30 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs px-4 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                <Shuffle className={`w-3 h-3 ${spinning ? "animate-spin" : ""}`} />
                Re-spin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-start px-4 md:px-6 py-6">
        {/* Left — My Recent Spins */}
        <aside className="hidden md:flex flex-col gap-2">
          <h3 className="text-foreground font-semibold text-sm px-1 mb-1">
            My Recent Spins
          </h3>

          {!spinsLoaded && (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 animate-pulse">
                  <div className="w-9 h-12 rounded bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </>
          )}

          {spinsLoaded && recentSpins.length === 0 && (
            <p className="text-muted-foreground text-xs px-1 leading-relaxed">
              {user
                ? "Your spins will appear here."
                : "Log in to track your spins."}
            </p>
          )}

          {spinsLoaded && recentSpins.length > 0 && (
            <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto">
              {recentSpins.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-9 h-12 rounded overflow-hidden bg-muted flex-shrink-0 border border-border">
                    {s.poster_url ? (
                      <img
                        src={s.poster_url}
                        alt={s.movie_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-[11px] font-medium truncate leading-tight">
                      {s.movie_title}
                    </p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">
                      {timeAgo(s.spun_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center — Roulette controls */}
        <div className="flex flex-col items-center gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={filterStreaming}
                onCheckedChange={setFilterStreaming}
                className="data-[state=checked]:bg-red-600"
              />
              <label
                className="text-muted-foreground text-xs cursor-pointer whitespace-nowrap"
                onClick={() => setFilterStreaming(!filterStreaming)}
              >
                Only show movies I can watch
                {filterStreaming && !hasServices && (
                  <span className="text-yellow-600 dark:text-yellow-400 ml-1.5 text-[10px]">
                    (no services set)
                  </span>
                )}
              </label>
            </div>

            <div className="relative" ref={filtersDropdownRef}>
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-red-600/40 bg-card/80 px-2.5 py-1.5 rounded-md transition-colors"
              >
                Filters
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${filtersExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {filtersExpanded && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl z-50 p-4 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Vibe</label>
                    <div className="flex flex-wrap gap-1.5">
                      {MOODS.map((mood) => (
                        <button
                          key={mood.label}
                          onClick={() => handleMoodClick(mood)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                            activeMood === mood.label
                              ? "bg-red-600 border-red-600 text-white"
                              : "border-border text-muted-foreground hover:border-red-600/50 hover:text-foreground bg-background/70"
                          }`}
                        >
                          {mood.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Genre</label>
                    <select
                      value={genre}
                      onChange={(e) => handleGenreChange(e.target.value)}
                      className="w-full bg-background/80 border border-border text-foreground text-xs rounded-md px-2.5 py-1.5 focus:border-red-600 focus:outline-none"
                    >
                      <option value="">Any Genre</option>
                      {GENRES.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Year From</label>
                      <Input
                        value={yearFrom}
                        onChange={(e) => setYearFrom(e.target.value)}
                        placeholder="1990"
                        className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground text-xs h-7"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Year To</label>
                      <Input
                        value={yearTo}
                        onChange={(e) => setYearTo(e.target.value)}
                        placeholder="2024"
                        className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground text-xs h-7"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">Min Rating</label>
                      <span className="text-foreground text-xs">{minRating[0]}/10</span>
                    </div>
                    <Slider
                      value={minRating}
                      onValueChange={setMinRating}
                      max={10}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {(() => {
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
                  style={{
                    backgroundColor: btnColor,
                    boxShadow: `0 10px 30px ${btnColor}40`,
                  }}
                >
                  <Shuffle className={`w-6 h-6 ${spinning ? "animate-spin" : ""}`} />
                  {spinning ? "Spinning…" : "Spin the Roulette"}
                </button>
              </div>
            );
          })()}

          {error && (
            <p className="text-center text-yellow-600 dark:text-yellow-400 text-sm">{error}</p>
          )}

          <RouletteWheelModal
            genre={genre}
            isSpinning={spinning}
            canFinish={canFinish}
            onFinished={handleWheelFinished}
          />
        </div>

        {/* Right — Friends' Spins */}
        <aside className="hidden md:flex flex-col gap-2">
          <h3 className="text-foreground font-semibold text-sm px-1 mb-1">
            Friends' Spins
          </h3>
          {friendSpins.slice(0, 6).map((entry) => {
            const spin = entry.spins[0];
            return (
              <div
                key={entry.friend_id}
                className="flex items-start gap-2 bg-card/80 border border-border rounded-lg p-2.5"
              >
                <img
                  src={entry.avatarUrl || dicebearUrl(entry.friend_username)}
                  alt={entry.friend_username}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-muted border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = dicebearUrl(
                      entry.friend_username
                    );
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-xs font-medium truncate">
                    {spin.movie_title}
                  </p>
                  <p className="text-muted-foreground text-[10px] truncate">
                    @{entry.friend_username}
                  </p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">
                    {timeAgo(spin.spun_at)}
                  </p>
                </div>
              </div>
            );
          })}
          {friendSpins.length === 0 && (
            <p className="text-muted-foreground text-xs px-1">
              {user ? "No friend spins yet." : "Log in to see friends' spins."}
            </p>
          )}
        </aside>
      </div>

      {selectedMovieId && (
        <MovieDetailModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
}