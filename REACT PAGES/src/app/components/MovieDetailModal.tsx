import { useState, useEffect } from 'react';
import { X, Star, Clock, Tv } from 'lucide-react';
import { getMovieDetails } from '../services/api';

interface Props {
  movieId: string;
  onClose: () => void;
}

export function MovieDetailModal({ movieId, onClose }: Props) {
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMovieDetails(movieId).then((data) => {
      setMovie(data);
      setLoading(false);
    });
  }, [movieId]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <p className="text-gray-400 text-lg">Loading...</p>
      </div>
    );
  }

  if (!movie || movie.error) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Could not load movie details.</p>
          <button onClick={onClose} className="text-red-500 hover:text-red-400">Close</button>
        </div>
      </div>
    );
  }

  const director = movie.credits?.crew?.find((c: any) => c.job === 'Director');
  const actors = (movie.credits?.cast ?? []).slice(0, 6).map((c: any) => c.name);
  const genres: { id: number; name: string }[] = movie.genres ?? [];
  const primaryGenre = genres[0]?.name ?? '';
  const subGenres = genres.slice(1).map((g) => g.name);
  const providers: any[] = movie['watch/providers']?.results?.US?.flatrate ?? [];

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : null;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const year = movie.release_date ? movie.release_date.slice(0, 4) : '';

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] max-w-3xl w-full my-8 overflow-hidden shadow-2xl">

        {/* Backdrop */}
        {backdropUrl && (
          <div className="relative h-56 md:h-72 overflow-hidden">
            <img
              src={backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-6">
          <div className="flex gap-5">
            {/* Poster */}
            {posterUrl && (
              <div className="flex-shrink-0 -mt-16 relative z-10">
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-28 md:w-36 rounded-xl border-2 border-[#2A2A2A] shadow-xl"
                />
              </div>
            )}

            {/* Header info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between">
                <h2 className="text-xl md:text-2xl text-white font-bold leading-tight">
                  {movie.title}
                </h2>
                {!backdropUrl && (
                  <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-4 flex-shrink-0">
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-400 text-sm">
                {year && <span>{year}</span>}
                {movie.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {movie.runtime}m
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  <span className="text-white font-medium">{movie.vote_average?.toFixed(1)}</span>
                  <span>/10</span>
                </span>
              </div>
            </div>
          </div>

          {/* Genre & Subgenre */}
          {genres.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {primaryGenre && (
                <span className="text-xs bg-[#C0392B]/20 text-[#C0392B] border border-[#C0392B]/40 px-3 py-1 rounded-full font-medium">
                  {primaryGenre}
                </span>
              )}
              {subGenres.map((g) => (
                <span
                  key={g}
                  className="text-xs bg-[#2A2A2A] text-gray-400 border border-[#333] px-3 py-1 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          {movie.overview && (
            <p className="mt-5 text-gray-300 text-sm leading-relaxed">
              {movie.overview}
            </p>
          )}

          {/* Details grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-[#2A2A2A] pt-5">
            <div>
              <h4 className="text-gray-500 text-xs uppercase tracking-widest mb-2">Director</h4>
              <p className="text-white text-sm">{director?.name ?? 'Unknown'}</p>
            </div>
            <div>
              <h4 className="text-gray-500 text-xs uppercase tracking-widest mb-2">Cast</h4>
              <p className="text-white text-sm leading-relaxed">
                {actors.length > 0 ? actors.join(', ') : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Streaming providers */}
          {providers.length > 0 && (
            <div className="mt-5 border-t border-[#2A2A2A] pt-5">
              <h4 className="text-gray-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <Tv className="w-3.5 h-3.5" />
                Available On
              </h4>
              <div className="flex flex-wrap gap-3">
                {providers.map((p: any) => (
                  <div
                    key={p.provider_id}
                    className="flex items-center gap-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-3 py-2"
                  >
                    {p.logo_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                        alt={p.provider_name}
                        className="w-6 h-6 rounded"
                      />
                    )}
                    <span className="text-white text-sm">{p.provider_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
