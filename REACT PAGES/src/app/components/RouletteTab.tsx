import { useState, useEffect } from "react";
import { Shuffle, ChevronDown, ChevronUp, Star, Play } from "lucide-react";
import { MovieDetailModal } from "./MovieDetailModal";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import {
  discoverMovies,
  getServices,
  hasServicesConfigured,
  getUser,
  getFeed,
  getUserPublicProfile,
  logRouletteSpin,
  getRouletteHistory,
  timeAgo,
  type RouletteSpin,
  type FeedPost,
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

export function RouletteTab() {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterStreaming, setFilterStreaming] = useState(false);
  const [genre, setGenre] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minRating, setMinRating] = useState([0]);
  const [spinning, setSpinning] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeMood, setActiveMood] = useState("");
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedAvatars, setFeedAvatars] = useState<Record<string, string>>({});
  const [recentSpins, setRecentSpins] = useState<RouletteSpin[]>([]);
  const [spinsLoaded, setSpinsLoaded] = useState(false);

  const user = getUser();
  const userServices = getServices();
  const hasServices = hasServicesConfigured(userServices);

  // Load community feed for the right sidebar
  useEffect(() => {
    getFeed(10)
      .then((posts) => {
        setFeedPosts(posts);
        const uniqueIds = [...new Set(posts.map((p) => p.user_id))];
        Promise.allSettled(
          uniqueIds.map((id) => getUserPublicProfile(id))
        ).then((results) => {
          const map: Record<string, string> = {};
          results.forEach((r, i) => {
            if (r.status === "fulfilled" && r.value?.avatarUrl) {
              map[uniqueIds[i]] = r.value.avatarUrl;
            }
          });
          setFeedAvatars(map);
        });
      })
      .catch(() => {});
  }, []);

  // Load the user's own spin history on mount
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
    setSelectedMovieId(null);
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
        setError(
          "No movies found with these filters. Try adjusting your criteria."
        );
      } else {
        const pick = movies[Math.floor(Math.random() * movies.length)];
        setSelectedMovieId(pick.id);
        if (user) {
          logRouletteSpin(
            user.user_id,
            pick.id,
            pick.title,
            pick.poster
          ).catch(() => {});
          setTimeout(refreshSpins, 800);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">

      {/* ── Sponsored Hero Card ─────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden h-[260px] bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_POSTER})` }}
      >
        {/* layered gradients for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/95 via-[#0A0A0A]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 via-transparent to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end p-6 gap-3">
          {/* badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold tracking-widest text-[#C0392B] uppercase border border-[#C0392B]/50 px-2 py-0.5 rounded-full">
              Sponsored Spin
            </span>
            <span className="text-[9px] font-bold tracking-wide text-white bg-[#0063e5] px-2.5 py-0.5 rounded-full">
              Only on Disney+
            </span>
          </div>

          {/* title */}
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Tron: Ares
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              2025 · Sci-Fi · Action
            </p>
          </div>

          {/* action buttons */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 bg-white text-black font-semibold text-sm px-5 py-2 rounded-full hover:bg-gray-100 transition-colors">
              <Play className="w-3.5 h-3.5 fill-black" />
              Watch Now
            </button>
            <button className="flex items-center gap-1.5 border border-white/30 text-white font-medium text-sm px-5 py-2 rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm">
              Trailer
            </button>
          </div>
        </div>
      </div>

      {/* ── Three-column layout ─────────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Left — My Recent Spins */}
        <aside className="w-44 hidden md:flex flex-col gap-2 flex-shrink-0">
          <h3 className="text-white font-semibold text-sm px-1 mb-1">
            My Recent Spins
          </h3>

          {/* not loaded yet — blank placeholders */}
          {!spinsLoaded && (
            <>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 animate-pulse"
                >
                  <div className="w-9 h-12 rounded bg-[#1C1C1C] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-[#1C1C1C] rounded w-3/4" />
                    <div className="h-2 bg-[#1C1C1C] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* loaded, empty */}
          {spinsLoaded && recentSpins.length === 0 && (
            <p className="text-gray-600 text-xs px-1 leading-relaxed">
              {user
                ? "Your spins will appear here."
                : "Log in to track your spins."}
            </p>
          )}

          {/* loaded, has spins */}
          {spinsLoaded && recentSpins.length > 0 && (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-0.5">
              {recentSpins.map((s, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <div className="w-9 h-12 rounded overflow-hidden bg-[#1C1C1C] flex-shrink-0">
                    {s.poster_url ? (
                      <img
                        src={s.poster_url}
                        alt={s.movie_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#252525]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[11px] font-medium truncate leading-tight">
                      {s.movie_title}
                    </p>
                    <p className="text-gray-600 text-[10px] mt-0.5">
                      {timeAgo(s.spun_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center — Roulette controls */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Streaming toggle */}
          <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-full px-5 py-3.5 w-fit">
            <Switch
              checked={filterStreaming}
              onCheckedChange={setFilterStreaming}
              className="data-[state=checked]:bg-[#C0392B]"
            />
            <label
              className="text-gray-300 text-sm cursor-pointer"
              onClick={() => setFilterStreaming(!filterStreaming)}
            >
              Only show movies I can watch
              {filterStreaming && !hasServices && (
                <span className="text-yellow-500 ml-2 text-xs">
                  (no services set)
                </span>
              )}
            </label>
          </div>

          {/* Apply Filters collapsible */}
          <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#252525] transition-colors"
            >
              <span className="text-white font-medium">Apply Filters</span>
              {filtersExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {filtersExpanded && (
              <div className="px-6 py-4 border-t border-[#2A2A2A] space-y-6">
                {/* Vibe chips */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Vibe</label>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((mood) => (
                      <button
                        key={mood.label}
                        onClick={() => handleMoodClick(mood)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
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
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Genre</label>
                  <select
                    value={genre}
                    onChange={(e) => handleGenreChange(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-md px-3 py-2 focus:border-[#C0392B] focus:outline-none"
                  >
                    <option value="">Any Genre</option>
                    {GENRES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Year From</label>
                    <Input
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                      placeholder="e.g., 1990"
                      className="bg-[#141414] border-[#2A2A2A] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Year To</label>
                    <Input
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                      placeholder="e.g., 2024"
                      className="bg-[#141414] border-[#2A2A2A] text-white"
                    />
                  </div>
                </div>

                {/* Min Rating */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-500">
                      Minimum Rating
                    </label>
                    <span className="text-white">{minRating[0]}/10</span>
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

          {/* Big Spin Button */}
          <div className="relative w-full max-w-sm mx-auto">
            <div
              className={`absolute -inset-1 rounded-full bg-[#C0392B]/25 blur-md transition-opacity ${
                spinning ? "opacity-0" : "animate-pulse"
              }`}
            />
            <button
              onClick={spin}
              disabled={spinning}
              className="relative w-full py-5 flex items-center justify-center gap-3 bg-[#C0392B] hover:bg-[#A93226] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xl rounded-full transition-colors shadow-lg shadow-[#C0392B]/30"
            >
              <Shuffle
                className={`w-6 h-6 ${spinning ? "animate-spin" : ""}`}
              />
              {spinning ? "Finding your movie..." : "Spin the Roulette"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-yellow-500 text-sm">{error}</p>
          )}
        </div>

        {/* Right — Friends' Spins */}
        <aside className="w-44 hidden md:flex flex-col gap-2 flex-shrink-0">
          <h3 className="text-white font-semibold text-sm px-1 mb-1">
            Friends' Spins
          </h3>
          {feedPosts.slice(0, 6).map((post) => {
            const avatar =
              feedAvatars[post.user_id] || post.avatarUrl || null;
            return (
              <div
                key={post.post_id}
                className="flex items-start gap-2 bg-[#1A1A1A] rounded-lg p-2.5"
              >
                <img
                  src={avatar || dicebearUrl(post.username)}
                  alt={post.username}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-[#2A2A2A]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = dicebearUrl(
                      post.username
                    );
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">
                    {post.movie_title}
                  </p>
                  <p className="text-gray-500 text-[10px] truncate">
                    @{post.username}
                  </p>
                  {post.rating > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-400 text-[10px]">
                        {post.rating}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {feedPosts.length === 0 && (
            <p className="text-gray-600 text-xs px-1">No activity yet.</p>
          )}
        </aside>
      </div>

      {/* Movie Detail Modal */}
      {selectedMovieId && (
        <MovieDetailModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
}
