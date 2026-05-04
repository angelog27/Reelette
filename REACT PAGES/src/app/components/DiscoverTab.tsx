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
  'rounded-2xl border border-border bg-card text-card-foreground shadow-sm';

const inputClass =
  'bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-red-600 focus-visible:ring-red-600 transition-colors';

const selectClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20';

const pillBaseClass =
  'rounded-full px-6 py-2 text-sm font-medium transition-all';

export function DiscoverTab() {
  const f = useMovieFilters(_store);

  const [catalogMode, _setCatalogMode] = useState(_store.catalogMode);
  const [searchQuery, _setSearchQuery] = useState(_store.searchQuery);
  const [filtersOpen, _setFiltersOpen] = useState(_store.filtersOpen);
  const [movies, _setMovies] = useState<Movie[]>(_store.movies);
  const [loading, _setLoading] = useState(_store.loading);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const setCatalogMode = (mode: DiscoverStore['catalogMode']) => {
    _store.catalogMode = mode;
    _setCatalogMode(mode);
  };

  const setSearchQuery = (query: string) => {
    _store.searchQuery = query;
    _setSearchQuery(query);
  };

  const setFiltersOpen = (value: boolean) => {
    _store.filtersOpen = value;
    _setFiltersOpen(value);
  };

  const setMovies = (nextMovies: Movie[]) => {
    _store.movies = nextMovies;
    _setMovies(nextMovies);
  };

  const setLoading = (value: boolean) => {
    _store.loading = value;
    _setLoading(value);
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
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const handleError = (error: unknown) => {
      console.error('Failed to load movies:', error);

      setMovies([]);
      setError(
        error instanceof Error
          ? error.message
          : 'Could not load movies. Please try again.'
      );
    };

    if (!isSearchMode) {
      setLoading(true);
      setError(null);

      const fetcher =
        catalogMode === 'popular'
          ? getPopularMovies
          : catalogMode === 'trending'
            ? () => getTrendingMovies('week')
            : getTopRatedMovies;

      fetcher()
        .then((movies) => {
          setMovies(movies);
        })
        .catch(handleError)
        .finally(() => {
          setLoading(false);
        });

      return;
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);

      const request = searchQuery
        ? searchMovies(searchQuery)
        : discoverMovies({
            genre_id: f.genre || undefined,
            year_from: f.yearFrom || undefined,
            year_to: f.yearTo || undefined,
            min_rating: f.minRating[0] > 0 ? f.minRating[0] : undefined,
            actor: f.actor || undefined,
            director: f.director || undefined,
            sort_by: f.sortBy,
            services_filter:
              f.filterStreaming && f.hasServices ? f.userServices : undefined,
          });

      request
        .then((movies) => {
          setMovies(movies);
        })
        .catch(handleError)
        .finally(() => {
          setLoading(false);
        });
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    catalogMode,
    searchQuery,
    f.actor,
    f.director,
    f.yearFrom,
    f.yearTo,
    f.genre,
    f.minRating[0],
    f.sortBy,
    f.filterStreaming,
    f.hasServices,
    f.userServices,
  ]);

  const displayedMovies =
    f.filterStreaming && f.activeServiceNames.length > 0 && searchQuery
      ? movies.filter((movie) =>
          f.activeServiceNames.includes(movie.streamingService)
        )
      : movies;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/40" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent" />

      <div className="space-y-5">
        <h1 className="relative inline-block text-2xl font-bold text-foreground">
          Discover
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)]" />
        </h1>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search movies, actors, keywords…"
              className={`h-14 w-full rounded-full pl-12 pr-12 ${inputClass}`}
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            title="Filters"
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
              filtersOpen || hasFilters
                ? 'bg-red-600 text-primary-foreground shadow-lg shadow-red-600/30 hover:bg-red-700'
                : 'border border-border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
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
          <div className={`${sectionCardClass} space-y-5 p-6`}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Actor
                </label>
                <Input
                  value={f.actor}
                  onChange={(event) => f.setActor(event.target.value)}
                  placeholder="e.g. Tom Hanks"
                  className={`rounded-xl ${inputClass}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Director
                </label>
                <Input
                  value={f.director}
                  onChange={(event) => f.setDirector(event.target.value)}
                  placeholder="e.g. Christopher Nolan"
                  className={`rounded-xl ${inputClass}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Year From
                </label>
                <Input
                  value={f.yearFrom}
                  onChange={(event) => f.setYearFrom(event.target.value)}
                  placeholder="1990"
                  className={`rounded-xl ${inputClass}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Year To
                </label>
                <Input
                  value={f.yearTo}
                  onChange={(event) => f.setYearTo(event.target.value)}
                  placeholder="2024"
                  className={`rounded-xl ${inputClass}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Genre
                </label>
                <select
                  value={f.genre}
                  onChange={(event) => f.setGenre(event.target.value)}
                  className={selectClass}
                >
                  <option value="">All Genres</option>
                  {GENRES.map((genre) => (
                    <option key={genre.value} value={genre.value}>
                      {genre.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sort By
                </label>
                <select
                  value={f.sortBy}
                  onChange={(event) => f.setSortBy(event.target.value)}
                  className={selectClass}
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
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Minimum Rating
                </label>
                <span className="text-sm font-medium text-foreground">
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 rounded-full border border-border bg-muted/60 px-5 py-3">
                <Switch
                  checked={f.filterStreaming}
                  onCheckedChange={f.setFilterStreaming}
                  className="data-[state=checked]:bg-red-600"
                />

                <label
                  className="cursor-pointer text-sm text-muted-foreground"
                  onClick={() => f.setFilterStreaming(!f.filterStreaming)}
                >
                  My streaming services only
                  {f.filterStreaming && !f.hasServices && (
                    <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                      (no services set)
                    </span>
                  )}
                </label>
              </div>

              {hasFilters && (
                <button
                  onClick={f.clearFilters}
                  className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
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
                  ? 'bg-red-600 text-primary-foreground shadow-sm hover:bg-red-700'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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

        {isSearchMode && !loading && !error && (
          <div className="text-sm text-muted-foreground">
            {displayedMovies.length} result
            {displayedMovies.length !== 1 ? 's' : ''}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            {isSearchMode ? 'Searching…' : 'Loading…'}
          </div>
        ) : error ? null : displayedMovies.length === 0 && isSearchMode ? (
          <div className="py-16 text-center text-muted-foreground">
            No movies found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {displayedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={(movie) => setSelectedMovieId(movie.id)}
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