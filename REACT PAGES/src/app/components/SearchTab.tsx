import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { MovieDetailModal } from './MovieDetailModal';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { searchMovies, discoverMovies, getServices, SERVICE_DISPLAY } from '../services/api';
import type { Movie } from '../services/api';

// TMDB genre ID map
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

export function SearchTab() {
  //Tracks what user types in box
  const [searchQuery, setSearchQuery] = useState('');

  //Controls whether the advanced filters panel is open.
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  //Tracks whether a user actually uses or not
  const [filterStreaming, setFilterStreaming] = useState(false);

  //Filtering or setting the rating for a movie
  const [minRating, setMinRating] = useState([0]);

  //Movie filters
  const [actor, setActor] = useState('');
  const [director, setDirector] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [genre, setGenre] = useState('');
  const [sortBy, setSortBy] = useState('popularity');


  //State for storing the list of movies and loading status
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  //This is a timer reference instead of firing an API call on every single keystroke, it waits 500ms after the user stops typing before actually searching. 
  //Saves a ton of unnecessary API calls.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  //Get user's streaming services to apply filter if needed
  const userServices = getServices();

  //Check if user has any streaming services connected for filter toggle
  const hasServices = Object.values(userServices).some(Boolean);

  //Users actice services
  const activeServiceNames = Object.entries(userServices)
    .filter(([, on]) => on)
    .map(([key]) => SERVICE_DISPLAY[key]);

  // Debounced re-fetch on any filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const hasFilters = actor || director || yearFrom || yearTo || genre || minRating[0] > 0 || filterStreaming;

      //If a user hasnt typed anything or selected any filters, dont show anything.
      if (!searchQuery && !hasFilters) {
        setMovies([]);
        setLoading(false);
        return;
      }

      //Prompts our flask code to show loading...
      setLoading(true);

      //If there is a search use searchQuery for movies
      if (searchQuery) {
        searchMovies(searchQuery).then((m) => {
          setMovies(m);
          setLoading(false);
        });
      } else {

        //we are only applying a filter if there is a actual defined filter
        discoverMovies({
          genre_id: genre || undefined,
          year_from: yearFrom || undefined,
          year_to: yearTo || undefined,
          min_rating: minRating[0] > 0 ? minRating[0] : undefined,
          actor: actor || undefined,
          director: director || undefined,
          sort_by: sortBy,
          services_filter: filterStreaming && hasServices ? userServices : undefined,
        }).then((m) => {
          setMovies(m);
          setLoading(false);
        });
      }
      //timer to make sure we arent making unnecessary API calls on every keystroke
    }, 500);

    //resetting the timer if a user changes something, or edits a slider within the 500ms window.
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, actor, director, yearFrom, yearTo, genre, minRating, sortBy, filterStreaming]);

  // Client-side streaming filter on top of search results
  const displayedMovies =
    filterStreaming && activeServiceNames.length > 0 && searchQuery
      ? movies.filter((m) => activeServiceNames.includes(m.streamingService))
      : movies;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or keyword..."
          className="w-full bg-[#1C1C1C] border-[#2A2A2A] text-white placeholder:text-gray-600 pl-12 h-14 rounded-xl focus:border-[#C0392B]"
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
                <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="e.g., Tom Hanks" className="bg-[#141414] border-[#2A2A2A] text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Director</label>
                <Input value={director} onChange={(e) => setDirector(e.target.value)} placeholder="e.g., Christopher Nolan" className="bg-[#141414] border-[#2A2A2A] text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Year From</label>
                <Input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g., 1990" className="bg-[#141414] border-[#2A2A2A] text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Year To</label>
                <Input value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g., 2024" className="bg-[#141414] border-[#2A2A2A] text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-md px-3 py-2 focus:border-[#C0392B] focus:outline-none"
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
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-md px-3 py-2 focus:border-[#C0392B] focus:outline-none"
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
                <span className="text-white">{minRating[0]}/10</span>
              </div>
              <Slider value={minRating} onValueChange={setMinRating} max={10} step={0.5} className="w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Streaming Filter */}
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
            <span className="text-yellow-500 ml-2 text-xs">(no services set)</span>
          )}
        </label>
      </div>

      {/* Results */}
      <div>
        <h2 className="text-xl mb-4 text-gray-400 font-medium">Search Results</h2>
        {loading ? (
          <div className="text-gray-500 text-center py-16">Searching...</div>
        ) : displayedMovies.length === 0 && (searchQuery || actor || director || yearFrom || yearTo || genre || minRating[0] > 0 || filterStreaming) ? (
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
