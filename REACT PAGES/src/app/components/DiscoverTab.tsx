import { useState, useEffect } from 'react';
import { MovieCard } from './MovieCard';
import { MovieDetailModal } from './MovieDetailModal';
import { Switch } from './ui/switch';
import { getPopularMovies, getTrendingMovies, getTopRatedMovies, discoverMovies, getServices, SERVICE_DISPLAY } from '../services/api';
import type { Movie } from '../services/api';

export function DiscoverTab() {
  const [viewMode, setViewMode] = useState<'popular' | 'trending' | 'allTime'>('popular');
  const [filterStreaming, setFilterStreaming] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const userServices = getServices();
  const hasServices = Object.values(userServices).some(Boolean);

  // Active display names for client-side badge filter (used when not using discover endpoint)
  const activeServiceNames = Object.entries(userServices)
    .filter(([, on]) => on)
    .map(([key]) => SERVICE_DISPLAY[key]);

  useEffect(() => {
    setLoading(true);

    if (filterStreaming && hasServices) {
      // Use discover endpoint with the user's provider IDs so TMDB does the filtering
      discoverMovies({ services_filter: userServices }).then((m) => {
        setMovies(m);
        setLoading(false);
      });
    } else if (viewMode === 'popular') {
      getPopularMovies().then((m) => {
        setMovies(m);
        setLoading(false);
      });
    } else if (viewMode === 'trending') {
      getTrendingMovies('week').then((m) => {
        setMovies(m);
        setLoading(false);
      });
    } else {
      getTopRatedMovies().then((m) => {
        setMovies(m);
        setLoading(false);
      });
    }
  }, [viewMode, filterStreaming]);

  const displayedMovies = filterStreaming && !hasServices
    ? movies  // no services configured — show all
    : filterStreaming && activeServiceNames.length > 0
      ? movies.filter((m) => activeServiceNames.includes(m.streamingService))
      : movies;

  return (
    <div className="space-y-6">
      {/* Toggle Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setViewMode('popular')}
          disabled={filterStreaming}
          className={`px-8 py-2.5 rounded-full transition-all font-medium ${
            viewMode === 'popular' && !filterStreaming
              ? 'bg-[#C0392B] text-white'
              : 'bg-[#2A2A2A] text-white hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          Currently Popular
        </button>
        <button
          onClick={() => setViewMode('trending')}
          disabled={filterStreaming}
          className={`px-8 py-2.5 rounded-full transition-all font-medium ${
            viewMode === 'trending' && !filterStreaming
              ? 'bg-[#C0392B] text-white'
              : 'bg-[#2A2A2A] text-white hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          Trending This Week
        </button>
        <button
          onClick={() => setViewMode('allTime')}
          disabled={filterStreaming}
          className={`px-8 py-2.5 rounded-full transition-all font-medium ${
            viewMode === 'allTime' && !filterStreaming
              ? 'bg-[#C0392B] text-white'
              : 'bg-[#2A2A2A] text-white hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          All Time Greats
        </button>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-full px-5 py-3.5 w-fit">
        <Switch
          checked={filterStreaming}
          onCheckedChange={setFilterStreaming}
          className="data-[state=checked]:bg-[#C0392B]"
        />
        <label
          className="text-gray-300 cursor-pointer text-sm"
          onClick={() => setFilterStreaming(!filterStreaming)}
        >
          Filter to my streaming services
          {filterStreaming && !hasServices && (
            <span className="text-yellow-500 ml-2 text-xs">(no services set — showing all)</span>
          )}
        </label>
      </div>

      {/* Movie Grid */}
      {loading ? (
        <div className="text-gray-500 text-center py-16">Loading movies...</div>
      ) : displayedMovies.length === 0 ? (
        <div className="text-gray-500 text-center py-16">
          No movies found on your streaming services. Try updating your services.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {displayedMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onClick={(m) => setSelectedMovieId(m.id)} />
          ))}
        </div>
      )}

      {selectedMovieId && (
        <MovieDetailModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
}
