import { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  BookmarkCheck,
  Star,
  Play,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getMovieDetails,
  getWatchedMovie,
  addWatchedMovie,
  updateWatchedMovie,
  getUser,
  getWatchLater,
  watchMovieLater,
  removeFromWatchLater,
} from '../services/api';
import type { WatchedMovie } from '../services/api';

interface Props {
  movieId: string;
  onClose: () => void;
  onWatchedChange?: () => void;
}

const overlayButtonClass =
  'flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50';

const primaryRedButtonClass =
  'flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-600/30 transition-colors hover:bg-red-700 disabled:opacity-50';

const formInputClass =
  'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-red-600 focus:outline-none';

const labelClass =
  'mb-1 block text-xs uppercase tracking-widest text-white/60';

export function MovieDetailModal({ movieId, onClose, onWatchedChange }: Props) {
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [watchEntry, setWatchEntry] = useState<WatchedMovie | null>(null);
  const [showWatchForm, setShowWatchForm] = useState(false);
  const [ratingInput, setRatingInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [inWatchLater, setInWatchLater] = useState(false);
  const [watchLaterLoading, setWatchLaterLoading] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [relatedMovieId, setRelatedMovieId] = useState<string | null>(null);

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

    const director = movie.credits?.crew?.find(
      (c: any) => c.job === 'Director'
    );

    const actors = (movie.credits?.cast ?? [])
      .slice(0, 6)
      .map((c: any) => c.name);

    const genres: { id: number; name: string }[] = movie.genres ?? [];

    const providers: any[] =
      movie['watch/providers']?.results?.US?.flatrate ?? [];

    const year = movie.release_date
      ? parseInt(movie.release_date.slice(0, 4))
      : 0;

    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : '';

    setSaving(true);

    let result;

    if (watchEntry) {
      result = await updateWatchedMovie(
        user.user_id,
        movieId,
        rating,
        commentInput
      );
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
          services: providers.map((p: any) => {
            const ID_TO_NAME: Record<number, string> = {
              8: 'Netflix',
              15: 'Hulu',
              337: 'Disney+',
              1899: 'Max',
              9: 'Prime Video',
              350: 'Apple TV+',
              531: 'Paramount+',
              386: 'Peacock',
            };

            return ID_TO_NAME[p.provider_id] ?? p.provider_name;
          }),
        },
        rating,
        commentInput
      );
    }

    setSaving(false);

    if (result?.success) {
      setWatchEntry({
        ...watchEntry,
        user_rating: rating,
        comment: commentInput,
      } as WatchedMovie);

      setShowWatchForm(false);
      setSaveSuccess(true);
      onWatchedChange?.();
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!movie || movie.error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">
            Could not load movie details.
          </p>
          <button
            onClick={onClose}
            className="text-red-600 transition-colors hover:text-red-700 dark:hover:text-red-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const genres: { id: number; name: string }[] = movie.genres ?? [];
  const primaryGenre = genres[0]?.name ?? 'MOVIE';

  const providers: any[] =
    movie['watch/providers']?.results?.US?.flatrate ?? [];

  const similar: any[] =
    movie.similar?.results ?? movie.recommendations?.results ?? [];

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const year = movie.release_date ? movie.release_date.slice(0, 4) : '';

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${String(movie.runtime % 60).padStart(
        2,
        '0'
      )}m`
    : null;

  const overviewText = movie.overview ?? '';

  const isLongOverview = overviewText.length > 180;

  const displayOverview =
    !overviewExpanded && isLongOverview
      ? overviewText.slice(0, 180).trimEnd() + '…'
      : overviewText;

  const videos: any[] = movie.videos?.results ?? [];

  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
    videos.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ??
    null;

  const trailerUrl = trailer
    ? `https://www.youtube.com/watch?v=${trailer.key}`
    : null;

  const justwatchUrl: string | null =
    movie['watch/providers']?.results?.US?.link ?? null;

  const PROVIDER_SEARCH: Record<number, string> = {
    8: `https://www.netflix.com/search?q=${encodeURIComponent(movie.title)}`,
    15: `https://www.hulu.com/search?q=${encodeURIComponent(movie.title)}`,
    337: `https://www.disneyplus.com/search?q=${encodeURIComponent(
      movie.title
    )}`,
    384: `https://www.max.com/search?q=${encodeURIComponent(movie.title)}`,
    9: `https://www.amazon.com/s?k=${encodeURIComponent(
      movie.title
    )}&i=instant-video`,
    350: `https://tv.apple.com/search?term=${encodeURIComponent(movie.title)}`,
    531: `https://www.paramountplus.com/search/?q=${encodeURIComponent(
      movie.title
    )}`,
    386: `https://www.peacocktv.com/search?q=${encodeURIComponent(
      movie.title
    )}`,
  };

  function providerUrl(p: any): string {
    return (
      PROVIDER_SEARCH[p.provider_id as number] ??
      `https://www.justwatch.com/us/search?q=${encodeURIComponent(movie.title)}`
    );
  }

  const playNowUrl: string =
    justwatchUrl ??
    (providers.length > 0 ? providerUrl(providers[0]) : null) ??
    `https://www.justwatch.com/us/search?q=${encodeURIComponent(movie.title)}`;

  if (relatedMovieId) {
    return (
      <MovieDetailModal
        movieId={relatedMovieId}
        onClose={() => setRelatedMovieId(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={movie.title}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="h-full w-full scale-105 object-cover blur-sm"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-black" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-20 rounded-full border border-white/15 bg-black/50 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        aria-label="Close movie details"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex-1" />

        {/* Info block */}
        <div className="max-w-2xl px-10 pb-8 md:px-16">
          {/* Genre badge */}
          <span className="mb-4 inline-block rounded bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            {primaryGenre}
          </span>

          {/* Title */}
          <h1 className="mb-3 text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-6xl">
            {movie.title}
          </h1>

          {/* Meta row */}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            {movie.vote_average > 0 && (
              <div className="flex items-center gap-1 rounded bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">
                <Star className="h-3 w-3 fill-black" />
                {movie.vote_average.toFixed(1)}
              </div>
            )}

            {year && <span className="font-medium text-white/80">{year}</span>}

            {runtime && <span className="text-white/75">{runtime}</span>}

            {genres.slice(0, 3).map((g) => (
              <span key={g.id} className="text-white/65">
                {g.name}
              </span>
            ))}
          </div>

          {/* Overview */}
          {overviewText && (
            <div className="mb-5">
              <p className="text-base leading-relaxed text-white/80">
                {displayOverview}

                {isLongOverview && (
                  <button
                    onClick={() => setOverviewExpanded(!overviewExpanded)}
                    className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium text-red-400 transition-colors hover:text-red-300"
                  >
                    {overviewExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        See more
                      </>
                    )}
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Cast and director */}
          <div className="mb-5 space-y-1">
            {movie.credits?.crew && (
              <p className="text-sm text-white/60">
                Directed by{' '}
                <span className="text-white">
                  {
                    movie.credits.crew.find(
                      (c: any) => c.job === 'Director'
                    )?.name
                  }
                </span>
              </p>
            )}

            {movie.credits?.cast && (
              <p className="text-sm text-white/60">
                Starring{' '}
                <span className="text-white">
                  {movie.credits.cast
                    .slice(0, 6)
                    .map((c: any) => c.name)
                    .join(', ')}
                </span>
              </p>
            )}
          </div>

          {/* Actions */}
          {!showWatchForm ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Play Now */}
                <a
                  href={playNowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4 fill-black" />
                  Play Now
                </a>

                {/* Watch Trailer */}
                {trailerUrl && (
                  <a
                    href={trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={overlayButtonClass}
                  >
                    <Play className="h-4 w-4" />
                    Watch Trailer
                  </a>
                )}

                {/* Watch Later */}
                {user && (
                  <button
                    onClick={handleToggleWatchLater}
                    disabled={watchLaterLoading}
                    className={overlayButtonClass}
                  >
                    {inWatchLater ? (
                      <BookmarkCheck className="h-4 w-4 text-red-400" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {inWatchLater ? 'Saved' : 'Watch Later'}
                  </button>
                )}

                {/* User rating / Mark as Watched */}
                {user &&
                  ((watchEntry && !saveSuccess) ||
                  (saveSuccess && watchEntry) ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-4 py-2 backdrop-blur-sm">
                        <Star className="h-4 w-4 fill-red-500 text-red-500" />
                        <span className="text-sm font-semibold text-white">
                          {watchEntry.user_rating}/10
                        </span>
                      </div>

                      {!saveSuccess && (
                        <button
                          onClick={() => setShowWatchForm(true)}
                          className="text-xs text-white/60 underline underline-offset-2 transition-colors hover:text-white"
                        >
                          Update
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowWatchForm(true)}
                      className={primaryRedButtonClass}
                    >
                      <Star className="h-4 w-4" />
                      Mark as Watched
                    </button>
                  ))}
              </div>

              {/* Streaming services */}
              {providers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {providers.map((p: any) => (
                    <a
                      key={p.provider_id}
                      href={justwatchUrl ?? providerUrl(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-3 transition-colors hover:bg-white/20"
                      title={`Watch on ${p.provider_name}`}
                    >
                      {p.logo_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                          alt={p.provider_name}
                          className="h-6 w-6 rounded-full"
                        />
                      )}

                      <span className="text-xs font-medium text-white">
                        {p.provider_name}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Rating form */
            <div className="max-w-sm rounded-2xl border border-white/15 bg-black/60 p-5 text-white shadow-xl backdrop-blur-md">
              <p className="mb-4 text-sm font-medium text-white">
                {watchEntry ? 'Update your rating' : 'Rate this movie'}
              </p>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Rating (0–10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={ratingInput}
                    onChange={(e) => setRatingInput(e.target.value)}
                    placeholder="e.g. 8.5"
                    className={formInputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Comment (optional)</label>
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="What did you think?"
                    rows={2}
                    className={`${formInputClass} resize-none`}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveWatch}
                    disabled={saving || ratingInput === ''}
                    className="flex-1 rounded-full bg-red-600 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : watchEntry ? 'Update' : 'Save'}
                  </button>

                  <button
                    onClick={() => setShowWatchForm(false)}
                    className="rounded-full bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Similar movies strip */}
        {similar.length > 0 && (
          <div className="border-t border-white/10 bg-black/55 px-10 py-4 backdrop-blur-sm md:px-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
              Related Movies
            </p>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {similar.slice(0, 10).map(
                (m: any) =>
                  m.poster_path && (
                    <div
                      key={m.id}
                      onClick={() => setRelatedMovieId(String(m.id))}
                      className="w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/15 transition-transform hover:scale-105 hover:ring-red-500/70 md:w-20"
                      title={m.title}
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w200${m.poster_path}`}
                        alt={m.title}
                        className="aspect-[2/3] w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}