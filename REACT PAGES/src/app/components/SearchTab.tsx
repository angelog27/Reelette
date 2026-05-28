import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { MovieDetailModal } from './MovieDetailModal';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { searchMovies, discoverMovies, searchShows, discoverShows } from '../services/api';
import type { Movie } from '../services/api';
import { GENRES } from '../constants/genres';
import { useMovieFilters, defaultFilterState } from '../hooks/useMovieFilters';
import type { FilterState } from '../hooks/useMovieFilters';

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

  const [mediaType,        setMediaType]        = useState<'movie' | 'show'>('movie');
  const [searchQuery,     _setSearchQuery]      = useState(_store.searchQuery);
  const [filtersExpanded, _setFiltersExpanded]  = useState(_store.filtersExpanded);
  const [movies,          _setMovies]           = useState<Movie[]>(_store.movies);
  const [loading,         setLoading]           = useState(false);
  const [selectedMovieId, setSelectedMovieId]   = useState<string | null>(null);

  const setSearchQuery     = (q: string)  => { _store.searchQuery = q;     _setSearchQuery(q); };
  const setFiltersExpanded = (v: boolean) => { _store.filtersExpanded = v; _setFiltersExpanded(v); };
  const setMovies          = (m: Movie[]) => { _store.movies = m;          _setMovies(m); };

  // Pre-fill from navbar search (?q=...) — re-runs whenever the URL query changes
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== searchQuery) setSearchQuery(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Clear results + genre filter when switching media type
  const prevMediaType = useRef(mediaType);
  useEffect(() => {
    if (prevMediaType.current !== mediaType) {
      prevMediaType.current = mediaType;
      setMovies([]);
      f.setGenre('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced re-fetch on any filter/query/mediaType change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const hasFilters = f.yearFrom || f.yearTo || f.genre || f.minRating[0] > 0 || f.filterStreaming
        || (mediaType === 'movie' && (f.actor || f.director));

      if (!searchQuery && !hasFilters) {
        setMovies([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      if (mediaType === 'show') {
        if (searchQuery) {
          searchShows(searchQuery).then((m) => { setMovies(m); setLoading(false); });
        } else {
          discoverShows({
            genre_id:        f.genre    || undefined,
            year_from:       f.yearFrom || undefined,
            year_to:         f.yearTo   || undefined,
            min_rating:      f.minRating[0] > 0 ? f.minRating[0] : undefined,
            sort_by:         f.sortBy,
            services_filter: f.filterStreaming && f.hasServices ? f.userServices : undefined,
          }).then((m) => { setMovies(m); setLoading(false); });
        }
      } else {
        if (searchQuery) {
          searchMovies(searchQuery).then((m) => { setMovies(m); setLoading(false); });
        } else {
          discoverMovies({
            genre_id:        f.genre     || undefined,
            year_from:       f.yearFrom  || undefined,
            year_to:         f.yearTo    || undefined,
            min_rating:      f.minRating[0] > 0 ? f.minRating[0] : undefined,
            actor:           f.actor     || undefined,
            director:        f.director  || undefined,
            sort_by:         f.sortBy,
            services_filter: f.filterStreaming && f.hasServices ? f.userServices : undefined,
          }).then((m) => { setMovies(m); setLoading(false); });
        }
      }
    }, 1000);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, mediaType, f.actor, f.director, f.yearFrom, f.yearTo, f.genre, f.minRating, f.sortBy, f.filterStreaming]);

  // Client-side streaming filter on top of search results
  const displayedMovies =
    f.filterStreaming && f.activeServiceNames.length > 0 && searchQuery
      ? movies.filter((m) => f.activeServiceNames.includes(m.streamingService))
      : movies;

  const label = mediaType === 'show' ? 'Show' : 'Movie';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-2xl text-white" style={{ fontFamily: "SanFran, system-ui, sans-serif", fontWeight: 100 }}>
        Search {mediaType === 'show' ? 'Shows' : 'Movies'}
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10" style={{ color: '#52525b', transition: 'color 180ms cubic-bezier(0.23, 1, 0.32, 1)' }} />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or keyword..."
          className="w-full bg-[#1C1C1C] border-[#2A2A2A] text-white placeholder:text-gray-600 pl-12 h-14 rounded-xl"
          style={{
            transition: 'border-color 180ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 180ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--reel-accent-hex)';
            e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--reel-accent-hex) 20%, transparent)';
            const icon = e.currentTarget.previousElementSibling as HTMLElement | null;
            if (icon) icon.style.color = 'var(--reel-accent-hex)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '';
            e.currentTarget.style.boxShadow = '';
            const icon = e.currentTarget.previousElementSibling as HTMLElement | null;
            if (icon) icon.style.color = '';
          }}
        />
      </div>

      {/* Media type toggle — sliding pill */}
      <div className="relative flex p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Sliding indicator */}
        <div style={{
          position: 'absolute', top: 4, bottom: 4, left: 4,
          width: 'calc(50% - 4px)',
          background: 'color-mix(in srgb, var(--reel-accent-hex) 82%, transparent)',
          borderRadius: '0.625rem',
          transform: mediaType === 'show' ? 'translateX(100%)' : 'translateX(0)',
          transition: 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1)',
          pointerEvents: 'none',
        }} />
        <button
          onClick={() => setMediaType('movie')}
          className="relative z-10 flex-1 py-2.5 text-sm font-semibold active:scale-[0.97]"
          style={{ color: mediaType === 'movie' ? '#fff' : '#6b7280', transition: 'color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}
        >
          Movies
        </button>
        <button
          onClick={() => setMediaType('show')}
          className="relative z-10 flex-1 py-2.5 text-sm font-semibold active:scale-[0.97]"
          style={{ color: mediaType === 'show' ? '#fff' : '#6b7280', transition: 'color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}
        >
          Shows
        </button>
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
            {/* Actor / Director — movies only */}
            {mediaType === 'movie' && (
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
            )}

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
                  {(mediaType === 'show' ? TV_GENRES : GENRES).map((g) => (
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
        ) : displayedMovies.length === 0 && (searchQuery || f.yearFrom || f.yearTo || f.genre || f.minRating[0] > 0 || f.filterStreaming || (mediaType === 'movie' && (f.actor || f.director))) ? (
          <div className="text-gray-500 text-center py-16">No {label.toLowerCase()}s found.</div>
        ) : displayedMovies.length === 0 ? (
          <div className="text-gray-500 text-center py-16">Enter a search term or apply filters to find {label.toLowerCase()}s.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {displayedMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onClick={(m) => setSelectedMovieId(m.id)} />
            ))}
          </div>
        )}
      </div>

      {selectedMovieId && (
        <MovieDetailModal movieId={selectedMovieId} type={mediaType} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}
