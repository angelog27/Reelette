import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Clock, Play, Tv, Check } from 'lucide-react';
import {
  getMovieDetails, getWatchedMovie, addWatchedMovie, updateWatchedMovie, getUser,
} from '../services/api';
import type { WatchedMovie } from '../services/api';

interface Props {
  movieId: string;
  onClose: () => void;
}

export function MovieHeroPage({ movieId, onClose }: Props) {
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [watchEntry, setWatchEntry] = useState<WatchedMovie | null>(null);
  const [showWatchForm, setShowWatchForm] = useState(false);
  const [ratingInput, setRatingInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const user = getUser();

  useEffect(() => {
    setLoading(true);
    setMovie(null);
    setWatchEntry(null);
    setShowWatchForm(false);
    setSaveSuccess(false);
    setOverviewExpanded(false);

    getMovieDetails(movieId).then((data) => {
      setMovie(data);
      setLoading(false);
    });

    if (user) {
      getWatchedMovie(user.user_id, movieId).then((entry) => {
        if (entry) {
          setWatchEntry(entry);
          setRatingInput(String(entry.user_rating));
          setCommentInput(entry.comment ?? '');
        }
      });
    }
  }, [movieId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSaveWatch(movieData: any, posterUrl: string | null) {
    if (!user) return;
    const rating = parseFloat(ratingInput);
    if (isNaN(rating) || rating < 0 || rating > 10) return;

    const director = movieData.credits?.crew?.find((c: any) => c.job === 'Director');
    const actors = (movieData.credits?.cast ?? []).slice(0, 6).map((c: any) => c.name);
    const genres: { id: number; name: string }[] = movieData.genres ?? [];
    const providers: any[] = movieData['watch/providers']?.results?.US?.flatrate ?? [];
    const year = movieData.release_date ? parseInt(movieData.release_date.slice(0, 4)) : 0;

    setSaving(true);
    let result;
    if (watchEntry) {
      result = await updateWatchedMovie(user.user_id, movieId, rating, commentInput);
    } else {
      result = await addWatchedMovie(
        user.user_id,
        {
          movie_id: String(movieData.id),
          title: movieData.title,
          year,
          rating: movieData.vote_average ?? 0,
          overview: movieData.overview ?? '',
          poster: posterUrl ?? '',
          director: director?.name ?? '',
          actors,
          genres: genres.map((g) => g.name),
          services: providers.map((p: any) => p.provider_name),
        },
        rating,
        commentInput
      );
    }
    setSaving(false);
    if (result?.success) {
      setWatchEntry({ ...watchEntry, user_rating: rating, comment: commentInput } as WatchedMovie);
      setShowWatchForm(false);
      setSaveSuccess(true);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#7C5DBD] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!movie || movie.error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Could not load movie details.</p>
          <button onClick={onClose} className="text-[#7C5DBD] hover:text-[#9B7BD7]">Go Back</button>
        </div>
      </div>
    );
  }

  const director = movie.credits?.crew?.find((c: any) => c.job === 'Director');
  const actors = (movie.credits?.cast ?? []).slice(0, 5).map((c: any) => c.name);
  const genres: { id: number; name: string }[] = movie.genres ?? [];
  const providers: any[] = movie['watch/providers']?.results?.US?.flatrate ?? [];

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
  const overview = movie.overview ?? '';
  const isLongOverview = overview.length > 200;
  const displayedOverview = isLongOverview && !overviewExpanded
    ? overview.slice(0, 200) + '…'
    : overview;

  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' official trailer')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">

      {/* ── Full-screen backdrop ── */}
      {backdropUrl && (
        <div className="absolute inset-0">
          <img
            src={backdropUrl}
            alt={movie.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/50" />
        </div>
      )}
      {!backdropUrl && <div className="absolute inset-0 bg-[#0A0A0A]" />}

      {/* ── Content ── */}
      <div className="relative z-10 h-full overflow-y-auto flex flex-col">

        {/* Back button */}
        <div className="p-6 md:p-10 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Main info — vertically centered in remaining space */}
        <div className="flex-1 flex items-center">
          <div className="px-6 md:px-14 lg:px-20 pb-10 w-full max-w-2xl">

            {/* Rating badge + meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {movie.vote_average != null && (
                <div className="flex items-center gap-1.5 bg-yellow-500 text-black px-2.5 py-1 rounded-md font-bold text-sm">
                  <Star className="w-3.5 h-3.5 fill-black" />
                  {movie.vote_average.toFixed(1)}
                </div>
              )}
              {year && <span className="text-gray-300 text-sm">{year}</span>}
              {movie.runtime && (
                <span className="flex items-center gap-1 text-gray-300 text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              )}
              {genres.slice(0, 3).map((g) => (
                <span
                  key={g.id}
                  className="text-xs text-gray-400 border border-gray-600 px-2.5 py-0.5 rounded-full"
                >
                  {g.name}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 drop-shadow-lg">
              {movie.title}
            </h1>

            {/* Overview */}
            {overview && (
              <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
                {displayedOverview}
                {isLongOverview && (
                  <button
                    onClick={() => setOverviewExpanded(!overviewExpanded)}
                    className="ml-1 text-[#9B7BD7] hover:text-[#7C5DBD] font-medium text-sm"
                  >
                    {overviewExpanded ? 'See less' : 'See more'}
                  </button>
                )}
              </p>
            )}

            {/* Watch Trailer button */}
            <div className="flex flex-wrap gap-3 mb-6">
              <a
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition-colors font-medium text-sm"
              >
                <Play className="w-4 h-4" />
                Watch Trailer
              </a>
            </div>

            {/* Streaming providers — always visible */}
            {providers.length > 0 && (
              <div className="mb-6">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Tv className="w-3.5 h-3.5" /> Available On
                </p>
                <div className="flex flex-wrap gap-2">
                  {providers.map((p: any) => (
                    <div
                      key={p.provider_id}
                      className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2"
                    >
                      {p.logo_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                          alt={p.provider_name}
                          className="w-5 h-5 rounded"
                        />
                      )}
                      <span className="text-white text-sm">{p.provider_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Director + Cast */}
            <div className="flex flex-col gap-1.5 mb-6 text-sm">
              {director && (
                <p>
                  <span className="text-gray-600 uppercase tracking-widest text-xs mr-2">Director</span>
                  <span className="text-gray-200">{director.name}</span>
                </p>
              )}
              {actors.length > 0 && (
                <p>
                  <span className="text-gray-600 uppercase tracking-widest text-xs mr-2">Cast</span>
                  <span className="text-gray-200">{actors.join(', ')}</span>
                </p>
              )}
            </div>

            {/* Mark as Watched */}
            {user && (
              <div className="p-4 bg-black/50 backdrop-blur-sm rounded-2xl border border-white/10 max-w-sm">
                {saveSuccess && !showWatchForm && (
                  <p className="text-green-400 text-sm mb-2 flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    {watchEntry ? 'Rating updated!' : 'Added to your stuff!'}
                  </p>
                )}

                {watchEntry && !showWatchForm ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Your Rating</p>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-[#7C5DBD] text-[#7C5DBD]" />
                        <span className="text-white font-semibold">{watchEntry.user_rating}/10</span>
                      </div>
                      {watchEntry.comment && (
                        <p className="text-gray-400 text-sm mt-1 italic">"{watchEntry.comment}"</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowWatchForm(true)}
                      className="text-sm text-[#7C5DBD] hover:text-[#9B7BD7] transition-colors flex-shrink-0"
                    >
                      Update
                    </button>
                  </div>
                ) : !showWatchForm ? (
                  <button
                    onClick={() => setShowWatchForm(true)}
                    className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors text-sm border border-white/20"
                  >
                    Mark as Watched
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-300 text-sm font-medium">
                      {watchEntry ? 'Update your rating' : 'Rate this movie'}
                    </p>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-widest block mb-1">Rating (0–10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={ratingInput}
                        onChange={(e) => setRatingInput(e.target.value)}
                        placeholder="e.g. 8.5"
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C5DBD]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-widest block mb-1">Comment (optional)</label>
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="What did you think?"
                        rows={2}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C5DBD] resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveWatch(movie, posterUrl)}
                        disabled={saving || ratingInput === ''}
                        className="flex-1 py-2 rounded-full bg-[#7C5DBD] hover:bg-[#9B7BD7] disabled:opacity-50 text-white font-medium transition-colors text-sm"
                      >
                        {saving ? 'Saving...' : watchEntry ? 'Update' : 'Save'}
                      </button>
                      <button
                        onClick={() => setShowWatchForm(false)}
                        className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
