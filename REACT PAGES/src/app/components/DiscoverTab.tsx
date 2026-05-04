import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { MovieDetailModal } from './MovieDetailModal';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import {
  getPopularMovies,
  getTrendingMovies,
  getTopRatedMovies,
  searchMovies,
  discoverMovies,
} from '../services/api';
import type { Movie } from '../services/api';
import { GENRES } from '../constants/genres';
import { useMovieFilters, defaultFilterState } from '../hooks/useMovieFilters';
import type { FilterState } from '../hooks/useMovieFilters';

type DiscoverStore = FilterState & {
  catalogMode: 'popular' | 'trending' | 'allTime';
  searchQuery: string;
  filtersOpen: boolean;
  movies: Movie[];
  loading: boolean;
};

const _store: DiscoverStore = {
  ...defaultFilterState(),
  catalogMode: 'popular',
  searchQuery: '',
  filtersOpen: false,
  movies: [],
  loading: true,
};

const sectionCardClass =
  'bg-card/80 backdrop-blur-sm border border-border rounded-2xl';

const inputClass =
  'bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus:border-red-600 transition-colors';

const pillBaseClass =
  'px-6 py-2 rounded-full transition-all font-medium text-sm';

export function DiscoverTab() {
  const f = useMovieFilters(_store);

  const [catalogMode, _setCatalogMode] = useState(_store.catalogMode);
  const [searchQuery, _setSearchQuery] = useState(_store.searchQuery);
  const [filtersOpen, _setFiltersOpen] = useState(_store.filtersOpen);
  const [movies, _setMovies] = useState<Movie[]>(_store.movies);
  const [loading, _setLoading] = useState(_store.loading);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const setCatalogMode = (m: DiscoverStore['catalogMode']) => {
    _store.catalogMode = m;
    _setCatalogMode(m);
  };

  const setSearchQuery = (q: string) => {
    _store.searchQuery = q;
    _setSearchQuery(q);
  };

  const setFiltersOpen = (v: boolean) => {
    _store.filtersOpen = v;
    _setFiltersOpen(v);
  };

  const setMovies = (m: Movie[]) => {
    _store.movies = m;
    _setMovies(m);
  };

  const setLoading = (v: boolean) => {
    _store.loading = v;
    _setLoading(v);
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters = !!(
    f.actor ||
    f.director ||
    f.yearFrom ||
    f.yearTo ||
    f.genre ||
    f.minRating[0] > 0 ||
    f.filterStreaming
  );

  const isSearchMode = !!searchQuery || hasFilters;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!isSearchMode) {
      setLoading(true);

      const fetcher =
        catalogMode === 'popular'
          ? getPopularMovies
          : catalogMode === 'trending'
            ? () => getTrendingMovies('week')
            : getTopRatedMovies;

      fetcher().then((m) => {
        setMovies(m);
        setLoading(false);
      });

      return;
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true);

      if (searchQuery) {
        searchMovies(searchQuery).then((m) => {
          setMovies(m);
          setLoading(false);
        });
      } else {
        discoverMovies({
          genre_id: f.genre || undefined,
          year_from: f.yearFrom || undefined,
          year_to: f.yearTo || undefined,
          min_rating: f.minRating[0] > 0 ? f.minRating[0] : undefined,
          actor: f.actor || undefined,
          director: f.director || undefined,
          sort_by: f.sortBy,
          services_filter:
            f.filterStreaming && f.hasServices ? f.userServices : undefined,
        }).then((m) => {
          setMovies(m);
          setLoading(false);
        });
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    catalogMode,
    searchQuery,
    f.actor,
    f.director,
    f.yearFrom,
    f.yearTo,
    f.genre,
    f.minRating,
    f.sortBy,
    f.filterStreaming,
  ]);

  const displayedMovies =
    f.filterStreaming && f.activeServiceNames.length > 0 && searchQuery
      ? movies.filter((m) => f.activeServiceNames.includes(m.streamingService))
      : movies;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40 -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent -z-10"></div>

      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-foreground relative inline-block">
          Discover
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)]"></div>
        </h1>

        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, actors, keywords…"
              className={`w-full pl-12 pr-12 h-14 rounded-full ${inputClass}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            title="Filters"
            className={`w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              filtersOpen || hasFilters
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground border border-border'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div
          style={{
            transition:
              'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
          }}
          className={`overflow-hidden ${
            filtersOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`${sectionCardClass} p-6 space-y-5`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Actor
                </label>
                <Input
                  value={f.actor}
                  onChange={(e) => f.setActor(e.target.value)}
                  placeholder="e.g. Tom Hanks"
                  className={`rounded-xl ${inputClass}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Director
                </label>
                <Input
                  value={f.director}
                  onChange={(e) => f.setDirector(e.target.value)}
                  placeholder="e.g. Christopher Nolan"
                  className={`rounded-xl ${inputClass}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Year From
                </label>
                <Input
                  value={f.yearFrom}
                  onChange={(e) => f.setYearFrom(e.target.value)}
                  placeholder="1990"
                  className={`rounded-xl ${inputClass}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Year To
                </label>
                <Input
                  value={f.yearTo}
                  onChange={(e) => f.setYearTo(e.target.value)}
                  placeholder="2024"
                  className={`rounded-xl ${inputClass}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Genre
                </label>
                <select
                  value={f.genre}
                  onChange={(e) => f.setGenre(e.target.value)}
                  className="w-full bg-background/80 border border-border text-foreground rounded-xl px-3 py-2 focus:border-red-600 focus:outline-none text-sm"
                >
                  <option value="">All Genres</option>
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Sort By
                </label>
                <select
                  value={f.sortBy}
                  onChange={(e) => f.setSortBy(e.target.value)}
                  className="w-full bg-background/80 border border-border text-foreground rounded-xl px-3 py-2 focus:border-red-600 focus:outline-none text-sm"
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
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Minimum Rating
                </label>
                <span className="text-foreground text-sm font-medium">
                  {f.minRating[0] > 0 ? `${f.minRating[0]} / 10` : 'Any'}
                </span>
              </div>
              <Slider
                value={f.minRating}
                onValueChange={f.setMinRating}
                max={10}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 bg-background/80 rounded-full px-5 py-3 border border-border">
                <Switch
                  checked={f.filterStreaming}
                  onCheckedChange={f.setFilterStreaming}
                  className="data-[state=checked]:bg-red-600"
                />
                <label
                  className="text-muted-foreground cursor-pointer text-sm"
                  onClick={() => f.setFilterStreaming(!f.filterStreaming)}
                >
                  My streaming services only
                  {f.filterStreaming && !f.hasServices && (
                    <span className="text-yellow-600 dark:text-yellow-400 ml-2 text-xs">
                      (no services set)
                    </span>
                  )}
                </label>
              </div>

              {hasFilters && (
                <button
                  onClick={f.clearFilters}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {(['popular', 'trending', 'allTime'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setCatalogMode(mode);
                setSearchQuery('');
                f.clearFilters();
              }}
              className={`${pillBaseClass} ${
                catalogMode === mode && !isSearchMode
                  ? 'bg-red-600 text-white'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              {mode === 'popular'
                ? 'Trending'
                : mode === 'trending'
                  ? 'New Releases'
                  : 'Classics'}
            </button>
          ))}
        </div>

        {isSearchMode && !loading && (
          <div className="text-sm text-muted-foreground">
            {displayedMovies.length} result{displayedMovies.length !== 1 ? 's' : ''}
          </div>
        )}

        {loading ? (
          <div className="text-muted-foreground text-center py-16">
            {isSearchMode ? 'Searching…' : 'Loading…'}
          </div>
        ) : displayedMovies.length === 0 && isSearchMode ? (
          <div className="text-muted-foreground text-center py-16">
            No movies found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={(m) => setSelectedMovieId(m.id)}
              />
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
    </div>
  );
}