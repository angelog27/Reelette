import { useState, useEffect } from 'react';
import { Star, Bookmark } from 'lucide-react';
import { getWatchedMovies, getWatchLater, getMovieDetails, getUser } from '../services/api';
import type { WatchedMovie } from '../services/api';
import { MovieDetailModal } from './MovieDetailModal';

type Tab = 'watched' | 'watchlater';

interface WatchLaterMovie {
  movie_id: string;
  title: string;
  year: string;
  poster: string | null;
}

export function MyStuffTab() {
  const [activeTab, setActiveTab] = useState<Tab>('watched');
  const [movies, setMovies] = useState<WatchedMovie[]>([]);
  const [watchLater, setWatchLater] = useState<WatchLaterMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const user = getUser();

  function loadWatched() {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    getWatchedMovies(user.user_id).then((m) => {
      setMovies(m);
      setLoading(false);
    });
  }

  function loadWatchLater() {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    getWatchLater(user.user_id).then(async (ids) => {
      const details = await Promise.all(
        ids.map((id) =>
          getMovieDetails(id).then((d) => ({
            movie_id: String(id),
            title: d?.title ?? 'Unknown',
            year: d?.release_date ? d.release_date.slice(0, 4) : '',
            poster: d?.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
          }))
        )
      );
      setWatchLater(details);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (activeTab === 'watched') loadWatched();
    else loadWatchLater();
  }, [activeTab]);

  if (!user) {
    return (
      <div className="text-gray-500 text-center py-16">
        Please log in to view your stuff.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-2xl font-bold text-white mb-6 relative inline-block">
        My Stuff
        <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent"></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full p-1 w-fit">
        <button
          onClick={() => setActiveTab('watched')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'watched'
              ? 'bg-[#C0392B] text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          Watched
        </button>
        <button
          onClick={() => setActiveTab('watchlater')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'watchlater'
              ? 'bg-[#C0392B] text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          Watch Later
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-16">Loading...</div>
      ) : activeTab === 'watched' ? (
        movies.length === 0 ? (
          <div className="text-gray-500 text-center py-16">
            You haven't watched any movies yet. Click a movie and hit "Mark as Watched"!
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {movies.map((m) => (
              <button
                key={m.movie_id}
                onClick={() => setSelectedMovieId(m.movie_id)}
                className="text-left group focus:outline-none"
              >
                <div className="relative rounded-xl overflow-hidden bg-[#1A1A1A] border border-[#2A2A2A] group-hover:border-[#C0392B]/50 transition-colors">
                  {m.poster ? (
                    <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-[#2A2A2A] flex items-center justify-center">
                      <span className="text-gray-600 text-xs text-center px-2">{m.title}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5">
                    <Star className="w-3 h-3 fill-[#C0392B] text-[#C0392B]" />
                    <span className="text-white text-xs font-semibold">{m.user_rating}</span>
                  </div>
                </div>
                <div className="mt-2 px-0.5">
                  <p className="text-white text-sm font-medium leading-snug line-clamp-1">{m.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{m.year}</p>
                  {m.comment && (
                    <p className="text-gray-400 text-xs mt-1 italic line-clamp-2">"{m.comment}"</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        watchLater.length === 0 ? (
          <div className="text-gray-500 text-center py-16">
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
                <div className="relative rounded-xl overflow-hidden bg-[#1A1A1A] border border-[#2A2A2A] group-hover:border-[#C0392B]/50 transition-colors">
                  {m.poster ? (
                    <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-[#2A2A2A] flex items-center justify-center">
                      <span className="text-gray-600 text-xs text-center px-2">{m.title}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
                    <Bookmark className="w-3 h-3 fill-white text-white" />
                  </div>
                </div>
                <div className="mt-2 px-0.5">
                  <p className="text-white text-sm font-medium leading-snug line-clamp-1">{m.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{m.year}</p>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {selectedMovieId && (
        <MovieDetailModal
          movieId={selectedMovieId}
          onClose={() => {
            setSelectedMovieId(null);
            if (activeTab === 'watched') loadWatched();
            else loadWatchLater();
          }}
        />
      )}
    </div>
  );
}
