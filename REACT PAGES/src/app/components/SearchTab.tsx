import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { MovieDetailModal } from './MovieDetailModal';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { searchMovies, discoverMovies } from '../services/api';
import type { Movie } from '../services/api';
import { GENRES } from '../constants/genres';
import { useMovieFilters, defaultFilterState } from '../hooks/useMovieFilters';
import type { FilterState } from '../hooks/useMovieFilters';

// Module-level store — survives React Router remounts so the user returns
// to exactly where they left off (query, filters, results).
type SearchStore = FilterState & {
  searchQuery: string;
  filtersExpanded: boolean;
  movies: Movie[];
};
const _store: SearchStore = {
  ...defaultFilterState(),
  searchQuery: '',
  filtersExpanded: true,
  movies: [],
};

export function SearchTab() {
  const f = useMovieFilters(_store);
  const [searchParams] = useSearchParams();

  // Local UI state initialised from the persistent store
  const [searchQuery,     _setSearchQuery]     = useState(_store.searchQuery);
  const [filtersExpanded, _setFiltersExpanded] = useState(_store.filtersExpanded);
  const [movies,          _setMovies]          = useState<Movie[]>(_store.movies);
  const [loading,         setLoading]          = useState(false);
  const [selectedMovieId, setSelectedMovieId]  = useState<string | null>(null);

  // Write-through setters keep the module store in sync
  const setSearchQuery     = (q: string)    => { _store.searchQuery = q;     _setSearchQuery(q); };
  const setFiltersExpanded = (v: boolean)   => { _store.filtersExpanded = v; _setFiltersExpanded(v); };
  const setMovies          = (m: Movie[])   => { _store.movies = m;          _setMovies(m); };

  // Pre-fill from navbar search (?q=...)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== searchQuery) setSearchQuery(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced re-fetch on any filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const hasFilters = f.actor || f.director || f.yearFrom || f.yearTo || f.genre || f.minRating[0] > 0 || f.filterStreaming;

      if (!searchQuery && !hasFilters) {
        setMovies([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      if (searchQuery) {
        searchMovies(searchQuery).then((m) => { setMovies(m); setLoading(false); });
      } else {
        discoverMovies({
          genre_id:   f.genre     || undefined,
          year_from:  f.yearFrom  || undefined,
          year_to:    f.yearTo    || undefined,
          min_rating: f.minRating[0] > 0 ? f.minRating[0] : undefined,
          actor:      f.actor     || undefined,
          director:   f.director  || undefined,
          sort_by:    f.sortBy,
          services_filter: f.filterStreaming && f.hasServices ? f.userServices : undefined,
        }).then((m) => { setMovies(m); setLoading(false); });
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, f.actor, f.director, f.yearFrom, f.yearTo, f.genre, f.minRating, f.sortBy, f.filterStreaming]);

  // Client-side streaming filter on top of search results
  const displayedMovies =
    f.filterStreaming && f.activeServiceNames.length > 0 && searchQuery
      ? movies.filter((m) => f.activeServiceNames.includes(m.streamingService))
      : movies;

  return (
    <div className="space-y-6">
      <div className="text-2xl text-white" style={{ fontFamily: "SanFran, system-ui, sans-serif", fontWeight: 100 }}>Search Movies</div>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or keyword..."
          className="w-full bg-[#1C1C1C] border-[#2A2A2A] text-white placeholder:text-gray-600 pl-12 h-14 rounded-xl focus:border-[#7C5DBD]"
        />
      </div>

      {/* Filter Panel */}
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#252525] transition-colors"
        >
          <span className="text-lg text-white font-medium">Advanced Filters</span>
          {filtersExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {filtersExpanded && (
          <div className="px-6 py-4 border-t border-[#2A2A2A] space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Actor</label>
                <Input value={f.actor} onChange={(e) => f.setActor(e.target.value)} placeholder="e.g., Tom Hanks" className="bg-[#141414] border-[#2A2A2A] text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Director</label>
                <Input value={f.director} onChange={(e) => f.setDirector(e.target.value)} placeholder="e.g., Christopher Nolan" className="bg-[#141414] border-[#2A2A2A] text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Year From</label>
                <Input value={f.yearFrom} onChange={(e) => f.setYearFrom(e.target.value)} placeholder="e.g., 1990" className="bg-[#141414] border-[#2A2A2A] text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Year To</label>
                <Input value={f.yearTo} onChange={(e) => f.setYearTo(e.target.value)} placeholder="e.g., 2024" className="bg-[#141414] border-[#2A2A2A] text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Genre</label>
                <select
                  value={f.genre}
                  onChange={(e) => f.setGenre(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-md px-3 py-2 focus:border-[#7C5DBD] focus:outline-none"
                >
                  <option value="">All Genres</option>
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Sort By</label>
                <select
                  value={f.sortBy}
                  onChange={(e) => f.setSortBy(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-md px-3 py-2 focus:border-[#7C5DBD] focus:outline-none"
                >
                  <option value="popularity">Popularity</option>
                  <option value="rating">Rating</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-500">Minimum Rating</label>
                <span className="text-white">{f.minRating[0]}/10</span>
              </div>
              <Slider value={f.minRating} onValueChange={f.setMinRating} max={10} step={0.5} className="w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Streaming Filter */}
      <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-full px-5 py-3.5 w-fit">
        <Switch
          checked={f.filterStreaming}
          onCheckedChange={f.setFilterStreaming}
          className="data-[state=checked]:bg-[#7C5DBD]"
        />
        <label
          className="text-gray-300 cursor-pointer text-sm"
          onClick={() => f.setFilterStreaming(!f.filterStreaming)}
        >
          Filter to my streaming services
          {f.filterStreaming && !f.hasServices && (
            <span className="text-yellow-500 ml-2 text-xs">(no services set)</span>
          )}
        </label>
      </div>

      {/* Results */}
      <div>
        <h2 className="text-xl mb-4 text-gray-400 font-medium">Search Results</h2>
        {loading ? (
          <div className="text-gray-500 text-center py-16">Searching...</div>
        ) : displayedMovies.length === 0 && (searchQuery || f.actor || f.director || f.yearFrom || f.yearTo || f.genre || f.minRating[0] > 0 || f.filterStreaming) ? (
          <div className="text-gray-500 text-center py-16">No movies found.</div>
        ) : displayedMovies.length === 0 ? (
          <div className="text-gray-500 text-center py-16">Enter a search term or apply filters to find movies.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayedMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onClick={(m) => setSelectedMovieId(m.id)} />
            ))}
          </div>
        )}
      </div>

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
