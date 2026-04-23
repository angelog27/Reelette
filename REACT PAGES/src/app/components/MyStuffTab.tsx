import { useState, useEffect, useRef } from 'react';
import { Star, Bookmark, BarChart2 } from 'lucide-react';
import {
  getWatchedMovies,
  getWatchLater,
  getMovieDetails,
  getMovieProvider,
  getUser,
} from '../services/api';
import type { WatchedMovie } from '../services/api';
import { MovieDetailModal } from './MovieDetailModal';
import { PROVIDER_LOGOS } from '../constants/providers';
import { StatsTab } from './StatsTab';

type Tab = 'watched' | 'watchlater' | 'stats';

interface WatchLaterMovie {
  movie_id: string;
  title: string;
  year: string;
  poster: string | null;
  streamingService: string;
}

const tabBaseClass =
  'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors';

const mediaCardClass =
  'relative rounded-xl overflow-hidden bg-card/80 border border-border group-hover:border-red-600/40 transition-colors';

export function MyStuffTab() {
  const [activeTab, setActiveTab] = useState<Tab>('watched');
  const [movies, setMovies] = useState<WatchedMovie[]>([]);
  const [watchLater, setWatchLater] = useState<WatchLaterMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const movieDetailsCacheRef = useRef<Map<string, WatchLaterMovie>>(new Map());

  const user = getUser();

  function loadWatched() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getWatchedMovies(user.user_id).then((m) => {
      setMovies(m);
      setLoading(false);
    });
  }

  function loadWatchLater() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getWatchLater(user.user_id).then(async (ids) => {
      const cache = movieDetailsCacheRef.current;

      const details = await Promise.all(
        ids.map((id) => {
          const strId = String(id);
          if (cache.has(strId)) return Promise.resolve(cache.get(strId)!);

          return Promise.all([getMovieDetails(strId), getMovieProvider(strId)]).then(
            ([d, svc]) => {
              const entry: WatchLaterMovie = {
                movie_id: strId,
                title: (d as any)?.title ?? 'Unknown',
                year: (d as any)?.release_date
                  ? String((d as any).release_date).slice(0, 4)
                  : '',
                poster: (d as any)?.poster_path
                  ? `https://image.tmdb.org/t/p/w500${(d as any).poster_path}`
                  : null,
                streamingService: svc,
              };
              cache.set(strId, entry);
              return entry;
            }
          );
        })
      );

      setWatchLater(details);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (activeTab === 'watched' || activeTab === 'stats') loadWatched();
    else loadWatchLater();
  }, [activeTab]);

  if (!user) {
    return (
      <div className="text-muted-foreground text-center py-16">
        Please log in to view your stuff.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40 -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent -z-10"></div>

      <div className="space-y-6">
        <div className="text-2xl font-bold text-foreground mb-6 relative inline-block">
          My Stuff
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)]"></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card/80 border border-border rounded-full p-1 w-fit">
          <button
            onClick={() => setActiveTab('watched')}
            className={`${tabBaseClass} ${
              activeTab === 'watched'
                ? 'bg-red-600 text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Watched
          </button>

          <button
            onClick={() => setActiveTab('watchlater')}
            className={`${tabBaseClass} ${
              activeTab === 'watchlater'
                ? 'bg-red-600 text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Watch Later
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`${tabBaseClass} ${
              activeTab === 'stats'
                ? 'text-white bg-orange-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Stats
          </button>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-center py-16">Loading...</div>
        ) : activeTab === 'stats' ? (
          <StatsTab movies={movies} onMovieClick={setSelectedMovieId} />
        ) : activeTab === 'watched' ? (
          movies.length === 0 ? (
            <div className="text-muted-foreground text-center py-16">
              You haven't watched any movies yet. Click a movie and hit
              "Mark as Watched"!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {movies.map((m) => (
                <button
                  key={m.movie_id}
                  onClick={() => setSelectedMovieId(m.movie_id)}
                  className="text-left group focus:outline-none"
                >
                  <div className={mediaCardClass}>
                    {m.poster ? (
                      <img
                        src={m.poster}
                        alt={m.title}
                        className="w-full aspect-[2/3] object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-xs text-center px-2">
                          {m.title}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5">
                      <Star className="w-3 h-3 fill-red-600 text-red-600" />
                      <span className="text-white text-xs font-semibold">{m.user_rating}</span>
                    </div>

                    {m.services[0] && PROVIDER_LOGOS[m.services[0]] && (
                      <div className="absolute top-2 right-2 w-8 h-8 rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10">
                        <img
                          src={PROVIDER_LOGOS[m.services[0]]}
                          alt={m.services[0]}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-2 px-0.5">
                    <p className="text-foreground text-sm font-medium leading-snug line-clamp-1">
                      {m.title}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">{m.year}</p>
                    {m.comment && (
                      <p className="text-muted-foreground text-xs mt-1 italic line-clamp-2">
                        "{m.comment}"
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : watchLater.length === 0 ? (
          <div className="text-muted-foreground text-center py-16">
            No movies saved yet. Hit the bookmark icon on any movie to save it!
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {watchLater.map((m) => (
              <button
                key={m.movie_id}
                onClick={() => setSelectedMovieId(m.movie_id)}
                className="text-left group focus:outline-none"
              >
                <div className={mediaCardClass}>
                  {m.poster ? (
                    <img
                      src={m.poster}
                      alt={m.title}
                      className="w-full aspect-[2/3] object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs text-center px-2">
                        {m.title}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 bg-black/70 rounded-full p-1">
                    <Bookmark className="w-3 h-3 fill-white text-white" />
                  </div>

                  {m.streamingService && PROVIDER_LOGOS[m.streamingService] && (
                    <div className="absolute top-2 right-2 w-8 h-8 rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10">
                      <img
                        src={PROVIDER_LOGOS[m.streamingService]}
                        alt={m.streamingService}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-2 px-0.5">
                  <p className="text-foreground text-sm font-medium leading-snug line-clamp-1">
                    {m.title}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">{m.year}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedMovieId && (
          <MovieDetailModal
            movieId={selectedMovieId}
            onClose={() => {
              setSelectedMovieId(null);
              if (activeTab === 'watched') loadWatched();
            }}
          />
        )}
      </div>
    </div>
  );
}