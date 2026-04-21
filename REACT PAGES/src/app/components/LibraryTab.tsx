import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { getWatchedMovies, getUser } from '../services/api';
import type { WatchedMovie } from '../services/api';
import { MovieDetailModal } from './MovieDetailModal';

export function LibraryTab() {
  const [movies, setMovies] = useState<WatchedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const hasChangedRef = useRef(false);

  const user = getUser();

  function loadLibrary() {
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

  useEffect(() => {
    loadLibrary();
  }, []);

  if (!user) {
    return (
      <div className="text-gray-500 text-center py-16">
        Please log in to view your library.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-2xl font-bold text-white">My Library</div>

      {loading ? (
        <div className="text-gray-500 text-center py-16">Loading your library...</div>
      ) : movies.length === 0 ? (
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
                  <img
                    src={m.poster}
                    alt={m.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-[#2A2A2A] flex items-center justify-center">
                    <span className="text-gray-600 text-xs text-center px-2">{m.title}</span>
                  </div>
                )}
                {/* Rating badge */}
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
      )}

      {selectedMovieId && (
        <MovieDetailModal
          movieId={selectedMovieId}
          onWatchedChange={() => { hasChangedRef.current = true; }}
          onClose={() => {
            setSelectedMovieId(null);
            if (hasChangedRef.current) {
              hasChangedRef.current = false;
              loadLibrary();
            }
          }}
        />
      )}
    </div>
  );
}
