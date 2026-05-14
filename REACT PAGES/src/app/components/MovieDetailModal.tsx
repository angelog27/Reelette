import { useState, useEffect } from 'react';
import { X, Bookmark, BookmarkCheck, Star, Play, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getMovieDetails, getShowDetails, getWatchedMovie, addWatchedMovie, updateWatchedMovie,
  getUser, getWatchLater, watchMovieLater, removeFromWatchLater,
  getFriends,
} from '../services/api';
import type { WatchedMovie } from '../services/api';

interface FriendReview {
  username: string;
  avatarUrl?: string;
  rating: number;
  message: string;
}

interface Props {
  movieId: string;
  type?: 'movie' | 'show';
  onClose: () => void;
  onWatchedChange?: () => void;
}

export function MovieDetailModal({ movieId, type = 'movie', onClose, onWatchedChange }: Props) {
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
  const [relatedMovieId,   setRelatedMovieId]   = useState<string | null>(null);
  const [relatedItemType,  setRelatedItemType]  = useState<'movie' | 'show'>('movie');
  const [friendReviews, setFriendReviews]         = useState<FriendReview[]>([]);
  const [seasonRatings, setSeasonRatings]         = useState<Record<string, number>>({});
  const [showSeasonRatings, setShowSeasonRatings] = useState(false);

  const user = getUser();

  useEffect(() => {
    if (!user) return;
    getFriends(user.user_id).then(async friends => {
      const entries = await Promise.all(
        friends.map(f =>
          getWatchedMovie(f.friend_id, movieId).then(entry =>
            entry && (entry.user_rating ?? 0) > 0
              ? { username: f.friend_username, avatarUrl: f.avatarUrl, rating: entry.user_rating ?? 0, message: entry.comment ?? '' }
              : null
          ).catch(() => null)
        )
      );
      setFriendReviews(entries.filter(e => e !== null) as FriendReview[]);
    }).catch(() => {});
  }, [movieId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`reelette_season_ratings_${movieId}`);
      if (raw) setSeasonRatings(JSON.parse(raw));
      else setSeasonRatings({});
    } catch { setSeasonRatings({}); }
  }, [movieId]);

  function handleSeasonRating(season: number, rating: number) {
    const updated = { ...seasonRatings, [season]: rating };
    setSeasonRatings(updated);
    try { localStorage.setItem(`reelette_season_ratings_${movieId}`, JSON.stringify(updated)); } catch {}
  }

  useEffect(() => {
    setLoading(true);
    setWatchEntry(null);
    setShowWatchForm(false);
    setSaveSuccess(false);
    setInWatchLater(false);
    setOverviewExpanded(false);

    const fetchMedia = type === 'show'
      ? getShowDetails(movieId)
      : getMovieDetails(movieId).then(async (d) => {
          // Auto-detect: if TMDB movie endpoint returned show data (has name, no title)
          if (!d || d.success === false || (!d.title && (d.name || d.first_air_date))) {
            return getShowDetails(movieId);
          }
          return d;
        });

    fetchMedia.then((data) => {
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

    const isShowEntry = type === 'show' || movie.media_type === 'tv';
    const directorEntry = isShowEntry
      ? (movie.created_by as any[])?.[0]?.name ?? ''
      : movie.credits?.crew?.find((c: any) => c.job === 'Director')?.name ?? '';
    const actors     = (movie.credits?.cast ?? (movie.aggregate_credits?.cast ?? [])).slice(0, 6).map((c: any) => c.name);
    const genres: { id: number; name: string }[] = movie.genres ?? [];
    const providers: any[] = movie['watch/providers']?.results?.US?.flatrate ?? [];
    const rawDate    = isShowEntry ? (movie.first_air_date as string) : (movie.release_date as string);
    const year       = rawDate ? parseInt(rawDate.slice(0, 4)) : 0;
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
          title: isShowEntry ? (movie.name ?? movie.title) : movie.title,
          year,
          rating: movie.vote_average ?? 0,
          overview: movie.overview ?? '',
          poster: posterUrl,
          director: directorEntry,
          actors,
          genres: genres.map((g) => g.name),
          services: providers.map((p: any) => {
            const ID_TO_NAME: Record<number, string> = {
              8: 'Netflix', 15: 'Hulu', 337: 'Disney+', 1899: 'Max',
              9: 'Prime Video', 350: 'Apple TV+', 531: 'Paramount+', 386: 'Peacock',
            };
            return ID_TO_NAME[p.provider_id] ?? p.provider_name;
          }),
          media_type: isShowEntry ? 'show' : 'movie',
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
      onWatchedChange?.();
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#7C5DBD] border-t-transparent rounded-full animate-spin" />
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
          <button onClick={onClose} className="text-[#7C5DBD] hover:text-[#9B7BD7]">Close</button>
        </div>
      </div>
    );
  }

  const isShow = type === 'show' || movie.media_type === 'tv';
  const genres: { id: number; name: string }[] = movie.genres ?? [];
  const primaryGenre = genres[0]?.name ?? (isShow ? 'SERIES' : 'MOVIE');
  const providers: any[] = movie['watch/providers']?.results?.US?.flatrate ?? [];
  const similar: any[]   = movie.similar?.results ?? movie.recommendations?.results ?? [];

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const displayTitle = isShow ? (movie.name ?? movie.title) : movie.title;
  const year = isShow
    ? (movie.first_air_date ? (movie.first_air_date as string).slice(0, 4) : '')
    : (movie.release_date ? (movie.release_date as string).slice(0, 4) : '');
  const runtime = isShow
    ? (movie.number_of_seasons
        ? `${movie.number_of_seasons} season${(movie.number_of_seasons as number) !== 1 ? 's' : ''}`
        : null)
    : (movie.runtime
        ? `${Math.floor((movie.runtime as number) / 60)}h ${String((movie.runtime as number) % 60).padStart(2, '0')}m`
        : null);
  const creators: any[] = isShow ? (movie.created_by ?? []) : [];
  const networks: any[] = isShow ? (movie.networks ?? []) : [];

  const overviewText   = movie.overview ?? '';
  const isLongOverview = overviewText.length > 180;
  const displayOverview = (!overviewExpanded && isLongOverview)
    ? overviewText.slice(0, 180).trimEnd() + '…'
    : overviewText;

  // YouTube trailer — prefer an official "Trailer" type, fall back to any Teaser
  const videos: any[] = movie.videos?.results ?? [];
  const trailer = videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer')
    ?? videos.find((v) => v.site === 'YouTube' && v.type === 'Teaser')
    ?? null;
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

  // JustWatch deep-link for this movie (provided by TMDB watch/providers)
  const justwatchUrl: string | null = movie['watch/providers']?.results?.US?.link ?? null;

  // Per-provider search URLs as a best-effort fallback
  const searchTitle = encodeURIComponent(displayTitle as string ?? '');
  const PROVIDER_SEARCH: Record<number, string> = {
    8:   `https://www.netflix.com/search?q=${searchTitle}`,
    15:  `https://www.hulu.com/search?q=${searchTitle}`,
    337: `https://www.disneyplus.com/search?q=${searchTitle}`,
    384: `https://www.max.com/search?q=${searchTitle}`,
    9:   `https://www.amazon.com/s?k=${searchTitle}&i=instant-video`,
    350: `https://tv.apple.com/search?term=${searchTitle}`,
    531: `https://www.paramountplus.com/search/?q=${searchTitle}`,
    386: `https://www.peacocktv.com/search?q=${searchTitle}`,
  };

  function providerUrl(p: any): string {
    return PROVIDER_SEARCH[p.provider_id as number]
      ?? `https://www.justwatch.com/us/search?q=${searchTitle}`;
  }

  const playNowUrl: string =
    justwatchUrl
    ?? (providers.length > 0 ? providerUrl(providers[0]) : null)
    ?? `https://www.justwatch.com/us/search?q=${searchTitle}`;

  if (relatedMovieId) {
    return (
      <MovieDetailModal
        movieId={relatedMovieId}
        type={relatedItemType}
        onClose={() => setRelatedMovieId(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">

      {/* ── Background ───────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <img src={backdropUrl} alt={displayTitle as string} className="w-full h-full object-cover" draggable={false} />
        ) : posterUrl ? (
          <img src={posterUrl} alt={displayTitle as string} className="w-full h-full object-cover blur-sm scale-105" draggable={false} />
        ) : (
          <div className="w-full h-full bg-[#0A0A0A]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      </div>

      {/* ── Close button ─────────────────────────────────────────── */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-20 bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white p-2.5 rounded-full transition-colors border border-white/10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* ── Friends Ratings — absolute top right ─────────────────── */}
      {friendReviews.length > 0 && (
        <div className="absolute top-16 right-8 z-20 w-68 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Friends Ratings
          </p>
          <div className="space-y-2.5">
            {friendReviews.map((fr, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gray-500 text-xs font-mono mt-1 w-4 flex-shrink-0">{i + 1}.</span>
                <div className="bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 flex-1 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-semibold">@{fr.username}</span>
                    <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-0.5">
                      <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-yellow-400 text-xs font-bold">{fr.rating}/10</span>
                    </div>
                  </div>
                  {fr.message && (
                    <p className="text-gray-400 text-xs leading-relaxed italic">"{fr.message}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Layout: content centered vertically, strip pinned to bottom ── */}
      <div className="relative z-10 h-full flex flex-col">

        {/* Flexible top spacer — pushes content into the middle */}
        <div className="flex-1" />

        {/* ── Info block ───────────────────────────────────────── */}
        <div className="px-10 md:px-16 pb-8 max-w-2xl">

          {/* Genre badge */}
          <span className="inline-block bg-[#7C5DBD] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded mb-4">
            {primaryGenre}
          </span>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-3 drop-shadow-lg">
            {displayTitle}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
            {movie.vote_average > 0 && (
              <div className="flex items-center gap-1 bg-yellow-400 text-black font-bold px-2 py-0.5 rounded text-xs">
                <Star className="w-3 h-3 fill-black" />
                {movie.vote_average.toFixed(1)}
              </div>
            )}
            {year    && <span className="text-gray-300 font-medium">{year}</span>}
            {runtime && <span className="text-gray-300">{runtime}</span>}
            {genres.slice(0, 3).map((g) => (
              <span key={g.id} className="text-gray-400">{g.name}</span>
            ))}
          </div>

          {/* Overview */}
          {overviewText && (
            <div className="mb-5">
              <p className="text-gray-300 text-base leading-relaxed">
                {displayOverview}
                {isLongOverview && (
                  <button
                    onClick={() => setOverviewExpanded(!overviewExpanded)}
                    className="text-[#7C5DBD] hover:text-[#9B7BD7] ml-1 inline-flex items-center gap-0.5 text-xs font-medium"
                  >
                    {overviewExpanded
                      ? <><ChevronUp className="w-3 h-3" /> Less</>
                      : <><ChevronDown className="w-3 h-3" /> See more</>}
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Cast / creator / networks */}
          <div className="mb-5">
            {isShow ? (
              <>
                {creators.length > 0 && (
                  <p className="text-gray-400 text-sm mb-1">
                    Created by <span className="text-white">{creators.map((c: any) => c.name).join(', ')}</span>
                  </p>
                )}
                {networks.length > 0 && (
                  <p className="text-gray-400 text-sm mb-1">
                    Network <span className="text-white">{networks.map((n: any) => n.name).join(', ')}</span>
                  </p>
                )}
                {movie.number_of_episodes && (
                  <p className="text-gray-400 text-sm mb-1">
                    <span className="text-white">{movie.number_of_episodes as number}</span> episodes
                  </p>
                )}
                {(movie.aggregate_credits?.cast ?? movie.credits?.cast) && (
                  <p className="text-gray-400 text-sm">
                    Starring <span className="text-white">
                      {((movie.aggregate_credits?.cast ?? movie.credits?.cast) as any[]).slice(0, 6).map((c: any) => c.name).join(', ')}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <>
                {movie.credits?.crew && (
                  <p className="text-gray-400 text-sm mb-1">
                    Directed by <span className="text-white">{(movie.credits.crew as any[]).find((c: any) => c.job === 'Director')?.name}</span>
                  </p>
                )}
                {movie.credits?.cast && (
                  <p className="text-gray-400 text-sm">
                    Starring <span className="text-white">{(movie.credits.cast as any[]).slice(0, 6).map((c: any) => c.name).join(', ')}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* Season ratings display (read mode) */}
          {isShow && Object.keys(seasonRatings).length > 0 && !showWatchForm && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">Your Season Ratings</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(seasonRatings).sort((a, b) => Number(a[0]) - Number(b[0])).map(([s, r]) => (
                  <div key={s} className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-3 py-1">
                    <span className="text-gray-400 text-xs">S{s}</span>
                    <Star className="w-3 h-3 fill-[#7C5DBD] text-[#7C5DBD]" />
                    <span className="text-white text-xs font-semibold">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Action buttons ──────────────────────────────────── */}
          {!showWatchForm ? (
            <div className="space-y-3">

              {/* Primary row: Play Now + Watch Later + Mark as Watched */}
              <div className="flex flex-wrap items-center gap-3">

                {/* Play Now — opens streaming service */}
                <a
                  href={playNowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold transition-opacity hover:opacity-90 shadow-lg"
                >
                  <Play className="w-4 h-4 fill-black" />
                  Play Now
                </a>

                {/* Watch Trailer — opens YouTube */}
                {trailerUrl && (
                  <a
                    href={trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/30 bg-white/5 hover:bg-white/15 text-white text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Watch Trailer
                  </a>
                )}

                {/* Watch Later */}
                {user && (
                  <button
                    onClick={handleToggleWatchLater}
                    disabled={watchLaterLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/30 bg-white/5 hover:bg-white/15 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {inWatchLater
                      ? <BookmarkCheck className="w-4 h-4 text-[#7C5DBD]" />
                      : <Bookmark className="w-4 h-4" />}
                    {inWatchLater ? 'Saved' : 'Watch Later'}
                  </button>
                )}

                {/* Mark as Watched / your rating */}
                {user && (
                  (watchEntry && !saveSuccess) || (saveSuccess && watchEntry) ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-4 py-2">
                        <Star className="w-4 h-4 fill-[#7C5DBD] text-[#7C5DBD]" />
                        <span className="text-white text-sm font-semibold">{watchEntry.user_rating}/10</span>
                      </div>
                      {!saveSuccess && (
                        <button
                          onClick={() => setShowWatchForm(true)}
                          className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-2"
                        >
                          Update
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowWatchForm(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7C5DBD] hover:bg-[#9B7BD7] text-white text-sm font-medium transition-colors shadow-lg shadow-[#7C5DBD]/30"
                    >
                      <Star className="w-4 h-4" />
                      {isShow ? 'Mark as Seen' : 'Mark as Watched'}
                    </button>
                  )
                )}
              </div>

              {/* Streaming services row — logo + name, each links to that service */}
              {providers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {providers.map((p: any) => (
                    <a
                      key={p.provider_id}
                      href={justwatchUrl ?? providerUrl(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full pl-1 pr-3 py-1 transition-colors"
                      title={`Watch on ${p.provider_name}`}
                    >
                      {p.logo_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                          alt={p.provider_name}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-white text-xs font-medium">{p.provider_name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Rating form */
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 max-w-sm">
              <p className="text-white font-medium mb-4 text-sm">
                {watchEntry ? 'Update your rating' : `Rate this ${isShow ? 'show' : 'movie'}`}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1">Overall Rating (0–10)</label>
                  <input
                    type="number" min="0" max="10" step="0.5"
                    value={ratingInput}
                    onChange={(e) => setRatingInput(e.target.value)}
                    placeholder="e.g. 8.5"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C5DBD] placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1">Comment (optional)</label>
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="What did you think?"
                    rows={2}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C5DBD] resize-none placeholder-gray-600"
                  />
                </div>

                {/* Season ratings — only for shows */}
                {isShow && (movie.number_of_seasons ?? 0) > 0 && (
                  <div>
                    <button
                      onClick={() => setShowSeasonRatings(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSeasonRatings ? 'rotate-180' : ''}`} />
                      Rate individual seasons
                    </button>
                    {showSeasonRatings && (
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                        {Array.from({ length: movie.number_of_seasons as number }, (_, i) => i + 1).map(n => (
                          <div key={n} className="flex items-center gap-3">
                            <span className="text-gray-400 text-xs w-16 shrink-0">Season {n}</span>
                            <input
                              type="number" min="0" max="10" step="0.5"
                              value={seasonRatings[n] ?? ''}
                              onChange={e => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v >= 0 && v <= 10) handleSeasonRating(n, v);
                                else if (e.target.value === '') {
                                  const updated = { ...seasonRatings };
                                  delete updated[n];
                                  setSeasonRatings(updated);
                                  try { localStorage.setItem(`reelette_season_ratings_${movieId}`, JSON.stringify(updated)); } catch {}
                                }
                              }}
                              placeholder="—"
                              className="flex-1 bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#7C5DBD] placeholder-gray-600"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveWatch}
                    disabled={saving || ratingInput === ''}
                    className="flex-1 py-2 rounded-full bg-[#7C5DBD] hover:bg-[#9B7BD7] disabled:opacity-50 text-white font-medium text-sm transition-colors"
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

        {/* ── Similar movies strip — pinned to very bottom ─────── */}
        {similar.length > 0 && (
          <div className="border-t border-white/10 bg-black/50 backdrop-blur-sm px-10 md:px-16 py-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
              {isShow ? 'Similar Shows' : 'Related Movies'}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {similar.slice(0, 10).map((m: any) => (
                m.poster_path && (
                  <div
                    key={m.id}
                    onClick={() => { setRelatedMovieId(String(m.id)); setRelatedItemType(isShow ? 'show' : 'movie'); }}
                    className="flex-shrink-0 w-16 md:w-20 cursor-pointer hover:scale-105 transition-transform rounded-lg overflow-hidden ring-1 ring-white/10 hover:ring-[#7C5DBD]/60"
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
