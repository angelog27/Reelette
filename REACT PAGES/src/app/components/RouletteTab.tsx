import { useState } from "react";
import { Shuffle, ChevronDown, ChevronUp } from "lucide-react";
import { MovieDetailModal } from "./MovieDetailModal";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import {
  discoverMovies,
  getServices,
  hasServicesConfigured,
} from "../services/api";

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

  const userServices = getServices();
  const hasServices = hasServicesConfigured(userServices);

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
          "No movies found with these filters. Try adjusting your criteria.",
        );
      } else {
        const pick = movies[Math.floor(Math.random() * movies.length)];
        setSelectedMovieId(pick.id);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Movie Roulette</h1>
        <p className="text-gray-400">
          Can't decide what to watch? Let fate decide.
        </p>
      </div>

      {/* Streaming toggle */}
      <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-full px-5 py-3.5 mx-auto w-fit">
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

      {/* Filters Panel */}
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#252525] transition-colors"
        >
          <span className="text-white font-medium">Filters (optional)</span>
          {filtersExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {filtersExpanded && (
          <div className="px-6 py-4 border-t border-[#2A2A2A] space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-500">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-500">Minimum Rating</label>
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

      {/* Spin Button */}
      <div className="flex justify-center">
        <button
          onClick={spin}
          disabled={spinning}
          className="flex items-center gap-3 bg-[#C0392B] hover:bg-[#A93226] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg px-10 py-4 rounded-full transition-colors shadow-lg shadow-[#C0392B]/30"
        >
          <Shuffle className={`w-6 h-6 ${spinning ? "animate-spin" : ""}`} />
          {spinning ? "Finding your movie..." : "Spin the Roulette"}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-center text-yellow-500 text-sm">{error}</p>}

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
