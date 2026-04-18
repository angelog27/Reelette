import { useState, useEffect } from 'react';
import { X, Bookmark, BookmarkCheck, Star, Play, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getMovieDetails, getWatchedMovie, addWatchedMovie, updateWatchedMovie,
  getUser, getWatchLater, watchMovieLater, removeFromWatchLater,
} from '../services/api';
import type { WatchedMovie } from '../services/api';

interface Props {
  movieId: string;
  onClose: () => void;
}

export function MovieDetailModal({ movieId, onClose }: Props) {
  const [movie, setMovie]                   = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [watchEntry, setWatchEntry]         = useState<WatchedMovie | null>(null);
  const [showWatchForm, setShowWatchForm]   = useState(false);
  const [ratingInput, setRatingInput]       = useState('');
  const [commentInput, setCommentInput]     = useState('');
  const [saving, setSaving]                 = useState(false);
  const [saveSuccess, setSaveSuccess]       = useState(false);
  const [inWatchLater, setInWatchLater]     = useState(false);
  const [watchLaterLoading, setWatchLaterLoading] = useState(false);
  const [overviewExpanded, setOverviewExpanded]   = useState(false);

  const user = getUser();

  useEffect(() => {
    setLoading(true);
    setWatchEntry(null);
    setShowWatchForm(false);
    setSaveSuccess(false);
    setInWatchLater(false);
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
      getWatchLater(user.user_id).then((ids) => {
        setInWatchLater(ids.includes(String(movieId)));
      });
    }
  }, [movieId]);

  async function handleToggleWatchLater() {
    if (!user) return;
    setWatchLaterLoading(true);
    if (inWatchLater) {
      await removeFromWatchLater(user.user_id, movieId);
      setInWatchLater(false);
    } else {
      await watchMovieLater(user.user_id, movieId);
      setInWatchLater(true);
    }
    setWatchLaterLoading(false);
  }

  async function handleSaveWatch() {
    if (!user || !movie) return;
    const rating = parseFloat(ratingInput);
    if (isNaN(rating) || rating < 0 || rating > 10) return;

    const director   = movie.credits?.crew?.find((c: any) => c.job === 'Director');
    const actors     = (movie.credits?.cast ?? []).slice(0, 6).map((c: any) => c.name);
    const genres: { id: number; name: string }[] = movie.genres ?? [];
    const providers: any[] = movie['watch/providers']?.results?.US?.flatrate ?? [];
    const year       = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0;
    const posterUrl  = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';

    setSaving(true);
    let result;
    if (watchEntry) {
      result = await updateWatchedMovie(user.user_id, movieId, rating, commentInput);
    } else {
      result = await addWatchedMovie(
        user.user_id,
        {
          movie_id: String(movie.id),
          title: movie.title,
          year,
          rating: movie.vote_average ?? 0,
          overview: movie.overview ?? '',
          poster: posterUrl,
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

  // ── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!movie || movie.error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Could not load movie details.</p>
          <button onClick={onClose} className="text-[#C0392B] hover:text-[#E74C3C]">Close</button>
        </div>
      </div>
    );
  }

  const genres: { id: number; name: string }[] = movie.genres ?? [];
  const primaryGenre = genres[0]?.name ?? 'MOVIE';
  const providers: any[] = movie['watch/providers']?.results?.US?.flatrate ?? [];
  const similar: any[]   = movie.similar?.results ?? movie.recommendations?.results ?? [];

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const year    = movie.release_date ? movie.release_date.slice(0, 4) : '';
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${String(movie.runtime % 60).padStart(2, '0')}m`
    : null;

  const overviewText  = movie.overview ?? '';
  const isLongOverview = overviewText.length > 180;
  const displayOverview = (!overviewExpanded && isLongOverview)
    ? overviewText.slice(0, 180).trimEnd() + '…'
    : overviewText;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">

      {/* ── Background ───────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover blur-sm scale-105"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-[#0A0A0A]" />
        )}

        {/* left-to-right gradient so content is readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
        {/* bottom fade for the strip */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
      </div>

      {/* ── Close button ─────────────────────────────────────────── */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-20 bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white p-2.5 rounded-full transition-colors border border-white/10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="relative z-10 h-full flex flex-col justify-end">

        {/* Info block — anchored to the bottom-left */}
        <div className="px-10 md:px-16 pb-6 max-w-2xl">

          {/* Genre badge */}
          <span className="inline-block bg-[#C0392B] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded mb-4">
            {primaryGenre}
          </span>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3 drop-shadow-lg">
            {movie.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
            {movie.vote_average > 0 && (
              <div className="flex items-center gap-1 bg-yellow-400 text-black font-bold px-2 py-0.5 rounded text-xs">
                <Star className="w-3 h-3 fill-black" />
                {movie.vote_average.toFixed(1)}
              </div>
            )}
            {year     && <span className="text-gray-300 font-medium">{year}</span>}
            {runtime  && <span className="text-gray-300">{runtime}</span>}
            {genres.slice(0, 3).map((g) => (
              <span key={g.id} className="text-gray-400">{g.name}</span>
            ))}
          </div>

          {/* Overview */}
          {overviewText && (
            <div className="mb-5">
              <p className="text-gray-300 text-sm leading-relaxed">
                {displayOverview}
                {isLongOverview && (
                  <button
                    onClick={() => setOverviewExpanded(!overviewExpanded)}
                    className="text-[#C0392B] hover:text-[#E74C3C] ml-1 inline-flex items-center gap-0.5 text-xs font-medium"
                  >
                    {overviewExpanded ? (
                      <><ChevronUp className="w-3 h-3" /> Less</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" /> See more</>
                    )}
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Watch Later + Mark as Watched / rating display */}
          {!showWatchForm ? (
            <div className="flex flex-wrap items-center gap-3">
              {/* Watch Later */}
              {user && (
                <button
                  onClick={handleToggleWatchLater}
                  disabled={watchLaterLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/30 bg-white/5 hover:bg-white/15 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {inWatchLater
                    ? <BookmarkCheck className="w-4 h-4 text-[#C0392B]" />
                    : <Bookmark className="w-4 h-4" />}
                  {inWatchLater ? 'Saved' : 'Watch Later'}
                </button>
              )}

              {/* Mark as Watched / your rating */}
              {user && (
                watchEntry && !saveSuccess ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-4 py-2">
                      <Star className="w-4 h-4 fill-[#C0392B] text-[#C0392B]" />
                      <span className="text-white text-sm font-semibold">{watchEntry.user_rating}/10</span>
                    </div>
                    <button
                      onClick={() => setShowWatchForm(true)}
                      className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-2"
                    >
                      Update
                    </button>
                  </div>
                ) : saveSuccess && watchEntry ? (
                  <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-4 py-2">
                    <Star className="w-4 h-4 fill-[#C0392B] text-[#C0392B]" />
                    <span className="text-white text-sm font-semibold">{watchEntry.user_rating}/10</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowWatchForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C0392B] hover:bg-[#E74C3C] text-white text-sm font-medium transition-colors shadow-lg shadow-[#C0392B]/30"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Mark as Watched
                  </button>
                )
              )}

              {/* Streaming badges (compact) */}
              {providers.slice(0, 3).map((p: any) => (
                p.logo_path && (
                  <img
                    key={p.provider_id}
                    src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                    alt={p.provider_name}
                    title={p.provider_name}
                    className="w-7 h-7 rounded-lg opacity-80 hover:opacity-100 transition-opacity"
                  />
                )
              ))}
            </div>
          ) : (
            /* Rating form */
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 max-w-sm">
              <p className="text-white font-medium mb-4 text-sm">
                {watchEntry ? 'Update your rating' : 'Rate this movie'}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1">Rating (0–10)</label>
                  <input
                    type="number" min="0" max="10" step="0.5"
                    value={ratingInput}
                    onChange={(e) => setRatingInput(e.target.value)}
                    placeholder="e.g. 8.5"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C0392B] placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1">Comment (optional)</label>
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="What did you think?"
                    rows={2}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C0392B] resize-none placeholder-gray-600"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveWatch}
                    disabled={saving || ratingInput === ''}
                    className="flex-1 py-2 rounded-full bg-[#C0392B] hover:bg-[#E74C3C] disabled:opacity-50 text-white font-medium text-sm transition-colors"
                  >
                    {saving ? 'Saving…' : watchEntry ? 'Update' : 'Save'}
                  </button>
                  <button
                    onClick={() => setShowWatchForm(false)}
                    className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Similar movies strip ─────────────────────────────── */}
        {similar.length > 0 && (
          <div className="border-t border-white/10 bg-black/50 backdrop-blur-sm px-10 md:px-16 py-4">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
              {similar.slice(0, 10).map((m: any) => (
                m.poster_path && (
                  <div
                    key={m.id}
                    className="flex-shrink-0 w-16 md:w-20 cursor-pointer hover:scale-105 transition-transform rounded-lg overflow-hidden ring-1 ring-white/10 hover:ring-[#C0392B]/60"
                    title={m.title}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w200${m.poster_path}`}
                      alt={m.title}
                      className="w-full aspect-[2/3] object-cover"
                      loading="lazy"
                    />
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
