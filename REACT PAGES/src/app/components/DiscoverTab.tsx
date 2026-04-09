import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { MovieDetailModal } from './MovieDetailModal';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import {
  getPopularMovies, getTrendingMovies, getTopRatedMovies,
  searchMovies, discoverMovies, getServices, SERVICE_DISPLAY,
} from '../services/api';
import type { Movie } from '../services/api';

const GENRES = [
  { label: 'Action',          value: '28' },
  { label: 'Adventure',       value: '12' },
  { label: 'Animation',       value: '16' },
  { label: 'Comedy',          value: '35' },
  { label: 'Crime',           value: '80' },
  { label: 'Documentary',     value: '99' },
  { label: 'Drama',           value: '18' },
  { label: 'Family',          value: '10751' },
  { label: 'Fantasy',         value: '14' },
  { label: 'History',         value: '36' },
  { label: 'Horror',          value: '27' },
  { label: 'Music',           value: '10402' },
  { label: 'Mystery',         value: '9648' },
  { label: 'Romance',         value: '10749' },
  { label: 'Science Fiction', value: '878' },
  { label: 'Thriller',        value: '53' },
  { label: 'War',             value: '10752' },
  { label: 'Western',         value: '37' },
];

export function DiscoverTab() {
  // Catalog mode (no search/filters active)
  const [catalogMode, setCatalogMode] = useState<'popular' | 'trending' | 'allTime'>('popular');

  // Search & filter state
  const [searchQuery, setSearchQuery]   = useState('');
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [filterStreaming, setFilterStreaming] = useState(false);
  const [minRating, setMinRating]       = useState([0]);
  const [actor, setActor]               = useState('');
  const [director, setDirector]         = useState('');
  const [yearFrom, setYearFrom]         = useState('');
  const [yearTo, setYearTo]             = useState('');
  const [genre, setGenre]               = useState('');
  const [sortBy, setSortBy]             = useState('popularity');

  const [movies, setMovies]                   = useState<Movie[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userServices      = getServices();
  const hasServices       = Object.values(userServices).some(Boolean);
  const activeServiceNames = Object.entries(userServices)
    .filter(([, on]) => on)
    .map(([key]) => SERVICE_DISPLAY[key]);

  const hasFilters   = !!(actor || director || yearFrom || yearTo || genre || minRating[0] > 0 || filterStreaming);
  const isSearchMode = !!searchQuery || hasFilters;

  // Unified fetch effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!isSearchMode) {
      // Catalog: fetch immediately on mode change
      setLoading(true);
      const fetcher =
        catalogMode === 'popular'  ? getPopularMovies :
        catalogMode === 'trending' ? () => getTrendingMovies('week') :
        getTopRatedMovies;
      fetcher().then((m) => { setMovies(m); setLoading(false); });
      return;
    }

    // Search/filter: debounced
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      if (searchQuery) {
        searchMovies(searchQuery).then((m) => { setMovies(m); setLoading(false); });
      } else {
        discoverMovies({
          genre_id:   genre     || undefined,
          year_from:  yearFrom  || undefined,
          year_to:    yearTo    || undefined,
          min_rating: minRating[0] > 0 ? minRating[0] : undefined,
          actor:      actor     || undefined,
          director:   director  || undefined,
          sort_by:    sortBy,
          services_filter: filterStreaming && hasServices ? userServices : undefined,
        }).then((m) => { setMovies(m); setLoading(false); });
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [catalogMode, searchQuery, actor, director, yearFrom, yearTo, genre, minRating, sortBy, filterStreaming]);

  const displayedMovies =
    filterStreaming && activeServiceNames.length > 0 && searchQuery
      ? movies.filter((m) => activeServiceNames.includes(m.streamingService))
      : movies;

  function clearFilters() {
    setActor(''); setDirector(''); setYearFrom(''); setYearTo('');
    setGenre(''); setSortBy('popularity'); setMinRating([0]); setFilterStreaming(false);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white relative inline-block">
        Discover
        <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent"></div>
      </h1>
      {/* ── Search bar + filter circle ── */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies, actors, keywords…"
            className="w-full bg-[#1C1C1C] border-[#2A2A2A] text-white placeholder:text-gray-600 pl-12 pr-12 h-14 rounded-full focus:border-[#C0392B] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter toggle circle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          title="Filters"
          className={`w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
            filtersOpen || hasFilters
              ? 'bg-[#C0392B] text-white shadow-lg shadow-[#C0392B]/30'
              : 'bg-[#1C1C1C] text-gray-400 hover:bg-[#252525] hover:text-white border border-[#2A2A2A]'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* ── Smooth filter panel ── */}
      <div
        style={{ transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease' }}
        className={`overflow-hidden ${filtersOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-[#161616] border border-[#2A2A2A] rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Actor</label>
              <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="e.g. Tom Hanks" className="bg-[#1C1C1C] border-[#2A2A2A] text-white rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Director</label>
              <Input value={director} onChange={(e) => setDirector(e.target.value)} placeholder="e.g. Christopher Nolan" className="bg-[#1C1C1C] border-[#2A2A2A] text-white rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Year From</label>
              <Input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="1990" className="bg-[#1C1C1C] border-[#2A2A2A] text-white rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Year To</label>
              <Input value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="2024" className="bg-[#1C1C1C] border-[#2A2A2A] text-white rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-[#2A2A2A] text-white rounded-xl px-3 py-2 focus:border-[#C0392B] focus:outline-none text-sm"
              >
                <option value="">All Genres</option>
                {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-[#2A2A2A] text-white rounded-xl px-3 py-2 focus:border-[#C0392B] focus:outline-none text-sm"
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
              <label className="text-xs text-gray-500 uppercase tracking-wide">Minimum Rating</label>
              <span className="text-white text-sm font-medium">{minRating[0] > 0 ? `${minRating[0]} / 10` : 'Any'}</span>
            </div>
            <Slider value={minRating} onValueChange={setMinRating} max={10} step={0.5} className="w-full" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-[#1C1C1C] rounded-full px-5 py-3 border border-[#2A2A2A]">
              <Switch checked={filterStreaming} onCheckedChange={setFilterStreaming} className="data-[state=checked]:bg-[#C0392B]" />
              <label className="text-gray-300 cursor-pointer text-sm" onClick={() => setFilterStreaming(!filterStreaming)}>
                My streaming services only
                {filterStreaming && !hasServices && (
                  <span className="text-yellow-500 ml-2 text-xs">(no services set)</span>
                )}
              </label>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-white transition-colors underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Catalog mode pills (only when not in search/filter mode) ── */}
      {!isSearchMode && (
        <div className="flex gap-3 flex-wrap">
          {(['popular', 'trending', 'allTime'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCatalogMode(mode)}
              className={`px-6 py-2 rounded-full transition-all font-medium text-sm ${
                catalogMode === mode
                  ? 'bg-[#C0392B] text-white'
                  : 'bg-[#2A2A2A] text-white hover:bg-[#333333]'
              }`}
            >
              {mode === 'popular' ? 'Trending' : mode === 'trending' ? 'New Releases' : 'Classics'}
            </button>
          ))}
        </div>
      )}

      {/* ── Result count (search mode) ── */}
      {isSearchMode && !loading && (
        <div className="text-sm text-gray-500">
          {displayedMovies.length} result{displayedMovies.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* ── Movie grid ── */}
      {loading ? (
        <div className="text-gray-500 text-center py-16">
          {isSearchMode ? 'Searching…' : 'Loading…'}
        </div>
      ) : displayedMovies.length === 0 && isSearchMode ? (
        <div className="text-gray-500 text-center py-16">No movies found. Try adjusting your search or filters.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {displayedMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onClick={(m) => setSelectedMovieId(m.id)} />
          ))}
        </div>
      )}

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
