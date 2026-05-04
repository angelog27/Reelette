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
  const [activeMovieId, setActiveMovieId] = useState(movieId);

  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [watchEntry, setWatchEntry] = useState<WatchedMovie | null>(null);
  const [showWatchForm, setShowWatchForm] = useState(false);
  const [ratingInput, setRatingInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [inWatchLater, setInWatchLater] = useState(false);
  const [watchLaterLoading, setWatchLaterLoading] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = getUser();

  useEffect(() => {
    setActiveMovieId(movieId);
  }, [movieId]);

  useEffect(() => {
    setLoading(true);
    setMovie(null);
    setWatchEntry(null);
    setShowWatchForm(false);
    setRatingInput('');
    setCommentInput('');
    setRatingError(null);
    setSaveSuccess(false);
    setInWatchLater(false);
    setOverviewExpanded(false);
    setError(null);

    getMovieDetails(activeMovieId)
      .then((data) => {
        setMovie(data);
      })
      .catch((error) => {
        console.error('Failed to load movie details:', error);
        setMovie(null);
        setError(
          error instanceof Error
            ? error.message
            : 'Could not load movie details.'
        );
      })
      .finally(() => {
        setLoading(false);
      });

    if (user) {
      getWatchedMovie(user.user_id, activeMovieId)
        .then((entry) => {
          if (entry) {
            setWatchEntry(entry);
            setRatingInput(String(entry.user_rating));
            setCommentInput(entry.comment ?? '');
          }
        })
        .catch((error) => {
          console.error('Failed to load watched movie status:', error);
        });

      getWatchLater(user.user_id)
        .then((ids) => {
          setInWatchLater(ids.includes(String(activeMovieId)));
        })
        .catch((error) => {
          console.error('Failed to load watch later status:', error);
        });
    }
  }, [activeMovieId, user?.user_id]);

  async function handleToggleWatchLater() {
    if (!user) return;

    setWatchLaterLoading(true);

    try {
      if (inWatchLater) {
        await removeFromWatchLater(user.user_id, activeMovieId);
        setInWatchLater(false);
      } else {
        await watchMovieLater(user.user_id, activeMovieId);
        setInWatchLater(true);
      }
    } catch (error) {
      console.error('Failed to update watch later:', error);
    } finally {
      setWatchLaterLoading(false);
    }
  }

  async function handleSaveWatch() {
    if (!user || !movie) return;

    const rating = parseFloat(ratingInput);

    if (ratingInput.trim() === '') {
      setRatingError('Please enter a rating.');
      return;
    }

    if (isNaN(rating) || rating < 0 || rating > 10) {
      setRatingError('Enter a rating between 0 and 10.');
      return;
    }

    setRatingError(null);

    const director = movie.credits?.crew?.find(
      (crewMember: any) => crewMember.job === 'Director'
    );

    const actors = (movie.credits?.cast ?? [])
      .slice(0, 6)
      .map((castMember: any) => castMember.name);

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

    try {
      let result;

      if (watchEntry) {
        result = await updateWatchedMovie(
          user.user_id,
          activeMovieId,
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
            genres: genres.map((genre) => genre.name),
            services: providers.map((provider: any) => {
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

              return ID_TO_NAME[provider.provider_id] ?? provider.provider_name;
            }),
          },
          rating,
          commentInput
        );
      }

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
    } catch (error) {
      console.error('Failed to save watched movie:', error);
      setRatingError('Could not save your rating. Please try again.');
    } finally {
      setSaving(false);
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

  if (error || !movie || movie.error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">
            {error ?? 'Could not load movie details.'}
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
    videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer') ??
    videos.find((video) => video.site === 'YouTube' && video.type === 'Teaser') ??
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

  function providerUrl(provider: any): string {
    return (
      PROVIDER_SEARCH[provider.provider_id as number] ??
      `https://www.justwatch.com/us/search?q=${encodeURIComponent(movie.title)}`
    );
  }

  const playNowUrl: string =
    justwatchUrl ??
    (providers.length > 0 ? providerUrl(providers[0]) : null) ??
    `https://www.justwatch.com/us/search?q=${encodeURIComponent(movie.title)}`;

  const directorName = movie.credits?.crew?.find(
    (crewMember: any) => crewMember.job === 'Director'
  )?.name;

  const castNames = movie.credits?.cast
    ?.slice(0, 6)
    .map((castMember: any) => castMember.name)
    .join(', ');

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
          <span className="mb-4 inline-block rounded bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            {primaryGenre}
          </span>

          <h1 className="mb-3 text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-6xl">
            {movie.title}
          </h1>

          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            {movie.vote_average > 0 && (
              <div className="flex items-center gap-1 rounded bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">
                <Star className="h-3 w-3 fill-black" />
                {movie.vote_average.toFixed(1)}
              </div>
            )}

            {year && <span className="font-medium text-white/80">{year}</span>}
            {runtime && <span className="text-white/75">{runtime}</span>}

            {genres.slice(0, 3).map((genre) => (
              <span key={genre.id} className="text-white/65">
                {genre.name}
              </span>
            ))}
          </div>

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

          <div className="mb-5 space-y-1">
            {directorName && (
              <p className="text-sm text-white/60">
                Directed by <span className="text-white">{directorName}</span>
              </p>
            )}

            {castNames && (
              <p className="text-sm text-white/60">
                Starring <span className="text-white">{castNames}</span>
              </p>
            )}
          </div>

          {!showWatchForm ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={playNowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4 fill-black" />
                  Play Now
                </a>

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

              {providers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {providers.map((provider: any) => (
                    <a
                      key={provider.provider_id}
                      href={justwatchUrl ?? providerUrl(provider)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-3 transition-colors hover:bg-white/20"
                      title={`Watch on ${provider.provider_name}`}
                    >
                      {provider.logo_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                          alt={provider.provider_name}
                          className="h-6 w-6 rounded-full"
                        />
                      )}

                      <span className="text-xs font-medium text-white">
                        {provider.provider_name}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
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
                    onChange={(event) => {
                      setRatingInput(event.target.value);
                      setRatingError(null);
                    }}
                    placeholder="e.g. 8.5"
                    className={formInputClass}
                  />

                  {ratingError && (
                    <p className="mt-1 text-xs text-red-400">
                      {ratingError}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Comment (optional)</label>
                  <textarea
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
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
                    onClick={() => {
                      setShowWatchForm(false);
                      setRatingError(null);
                    }}
                    className="rounded-full bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {similar.length > 0 && (
          <div className="border-t border-white/10 bg-black/55 px-10 py-4 backdrop-blur-sm md:px-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
              Related Movies
            </p>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {similar.slice(0, 10).map(
                (relatedMovie: any) =>
                  relatedMovie.poster_path && (
                    <button
                      key={relatedMovie.id}
                      onClick={() => setActiveMovieId(String(relatedMovie.id))}
                      className="w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/15 transition-transform hover:scale-105 hover:ring-red-500/70 md:w-20"
                      title={relatedMovie.title}
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w200${relatedMovie.poster_path}`}
                        alt={relatedMovie.title}
                        className="aspect-[2/3] w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}