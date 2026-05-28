import { useState, useEffect, useRef } from 'react';
import { X, Bookmark, BookmarkCheck, Star, Play, ChevronDown, ChevronUp, User, Heart, MessageCircle } from 'lucide-react';
import {
  getMovieDetails, getShowDetails, getWatchedMovie, addWatchedMovie, updateWatchedMovie,
  getUser, getWatchLater, watchMovieLater, removeFromWatchLater,
  getFriends, getMovieLogo, getFeed, timeAgo,
} from '../services/api';
import type { WatchedMovie, FeedPost } from '../services/api';

interface FriendReview {
  username: string;
  avatarUrl?: string;
  rating: number;
  message: string;
}

interface Props {
  movieId: string;
  type?: 'movie' | 'show';
  knownTitle?: string;
  onClose: () => void;
  onWatchedChange?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────
function dicebear(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-3">
      {children}
    </p>
  );
}

export function MovieDetailModal({ movieId, type = 'movie', knownTitle, onClose, onWatchedChange }: Props) {
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
  const [friendReviews, setFriendReviews]       = useState<FriendReview[]>([]);
  const [seasonRatings, setSeasonRatings]       = useState<Record<string, number>>({});
  const [showSeasonRatings, setShowSeasonRatings] = useState(false);
  const [trailerOpen, setTrailerOpen]           = useState(false);
  const [logoUrl, setLogoUrl]                   = useState<string | null>(null);
  const [socialPosts, setSocialPosts]           = useState<FeedPost[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const user = getUser();

  // Friend reviews
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
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
      if (!cancelled) setFriendReviews(entries.filter(e => e !== null) as FriendReview[]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [movieId]);

  // Season ratings
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

  // Movie details + logo + social posts
  useEffect(() => {
    setLoading(true);
    setWatchEntry(null);
    setShowWatchForm(false);
    setSaveSuccess(false);
    setInWatchLater(false);
    setOverviewExpanded(false);
    setTrailerOpen(false);
    setLogoUrl(null);
    setSocialPosts([]);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const fetchMedia = type === 'show'
      ? getShowDetails(movieId)
      : getMovieDetails(movieId).then(async (d: any) => {
          const isError = !d || d.success === false || d.error || !d.title;
          const titleMismatch = knownTitle && d?.title &&
            d.title.toLowerCase() !== knownTitle.toLowerCase();
          if (isError || titleMismatch) return getShowDetails(movieId);
          return d;
        });

    fetchMedia.then((data) => {
      setMovie(data);
      setLoading(false);
    });

    // Logo
    const logoType = type === 'show' ? 'show' : 'movie';
    getMovieLogo(movieId, logoType).then(url => setLogoUrl(url));

    // Social posts about this movie
    getFeed(80).then(posts => {
      setSocialPosts(posts.filter(p => p.movie_id === movieId));
    }).catch(() => {});

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
  }, [movieId, type]);

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

  // ── Loading / error ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--reel-accent-hex)', borderTopColor: 'transparent' }} />
          <p className="text-zinc-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!movie || movie.error) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Could not load details.</p>
          <button onClick={onClose} className="text-sm font-medium" style={{ color: 'var(--reel-accent-hex)' }}>Close</button>
        </div>
      </div>
    );
  }

  // Push into related movie view
  if (relatedMovieId) {
    return (
      <MovieDetailModal
        movieId={relatedMovieId}
        type={relatedItemType}
        onClose={() => setRelatedMovieId(null)}
      />
    );
  }

  // ── Derived data ──────────────────────────────────────────────────
  const isShow = type === 'show' || movie.media_type === 'tv';
  const genres: { id: number; name: string }[] = movie.genres ?? [];
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
  const director: string = !isShow
    ? (movie.credits?.crew as any[])?.find((c: any) => c.job === 'Director')?.name ?? ''
    : '';
  const cast: any[] = (movie.aggregate_credits?.cast ?? movie.credits?.cast ?? []) as any[];

  const overviewText   = movie.overview ?? '';
  const isLongOverview = overviewText.length > 200;
  const displayOverview = (!overviewExpanded && isLongOverview)
    ? overviewText.slice(0, 200).trimEnd() + '…'
    : overviewText;

  const videos: any[] = movie.videos?.results ?? [];
  const trailer = videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer')
    ?? videos.find((v) => v.site === 'YouTube' && v.type === 'Teaser')
    ?? null;

  const justwatchUrl: string | null = movie['watch/providers']?.results?.US?.link ?? null;
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
    return PROVIDER_SEARCH[p.provider_id as number] ?? `https://www.justwatch.com/us/search?q=${searchTitle}`;
  }
  const playNowUrl: string =
    justwatchUrl
    ?? (providers.length > 0 ? providerUrl(providers[0]) : null)
    ?? `https://www.justwatch.com/us/search?q=${searchTitle}`;

  const allCommunityItems = [
    ...socialPosts.map(p => ({ kind: 'social' as const, post: p })),
    ...friendReviews.map(r => ({ kind: 'friend' as const, review: r })),
  ];

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-50 bg-[#0A0A0A] overflow-y-auto overscroll-contain"
      style={{ scrollBehavior: 'smooth' }}
    >

      {/* ── Close button ─────────────────────────────────────── */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] flex items-center justify-center w-9 h-9 rounded-full transition-colors active:scale-[0.97]"
        style={{ background: 'rgba(10,10,10,0.7)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
      >
        <X className="w-4 h-4 text-white" />
      </button>

      {/* ── Hero ─────────────────────────────────────────────────
           Mobile: portrait poster, full width, scrolls naturally
           Desktop: widescreen backdrop, fixed viewport height     */}

      {/* MOBILE hero — portrait poster */}
      <div className="relative w-full md:hidden" style={{ aspectRatio: '2/3', maxHeight: '80vh', overflow: 'hidden' }}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={displayTitle as string}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center top' }}
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        {/* Top fade */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, transparent 18%)' }} />
        {/* Bottom fade into page bg */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 45%, rgba(10,10,10,0.65) 72%, rgba(10,10,10,0.92) 88%, #0A0A0A 100%)' }} />
        {/* Logo at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex items-end">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayTitle as string}
              className="w-auto object-contain"
              style={{
                maxHeight: 72,
                maxWidth: '80%',
                filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.95))',
              }}
            />
          ) : (
            <h1 className="text-3xl font-black text-white leading-tight"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}>
              {displayTitle}
            </h1>
          )}
        </div>
      </div>

      {/* DESKTOP hero — widescreen backdrop */}
      <div className="relative w-full hidden md:block" style={{ height: 'clamp(300px, 52vw, 640px)' }}>
        {(backdropUrl ?? posterUrl) ? (
          <img
            src={backdropUrl ?? posterUrl!}
            alt={displayTitle as string}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 20%' }}
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        {/* Top vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.45) 0%, transparent 22%)' }} />
        {/* Bottom fade */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(10,10,10,0.55) 60%, rgba(10,10,10,0.88) 78%, #0A0A0A 100%)' }} />
        {/* Side vignette — left edge so text sits on darker bg */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.32) 0%, transparent 45%)' }} />
        {/* Logo */}
        <div className="absolute bottom-0 left-0 px-14 pb-8 max-w-[55%]">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayTitle as string}
              className="w-auto object-contain"
              style={{
                maxHeight: 'clamp(56px, 9vw, 140px)',
                maxWidth: '100%',
                filter: 'drop-shadow(0 2px 24px rgba(0,0,0,0.95)) drop-shadow(0 0 8px rgba(0,0,0,0.7))',
              }}
            />
          ) : (
            <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>
              {displayTitle}
            </h1>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="px-5 md:px-14 pb-16 space-y-8">

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2.5 text-sm -mt-1">
          {(movie.vote_average as number) > 0 && (
            <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2.5 py-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-xs">{(movie.vote_average as number).toFixed(1)}</span>
            </div>
          )}
          {year    && <span className="text-zinc-300 font-medium text-xs">{year}</span>}
          {runtime && <span className="text-zinc-400 text-xs">{runtime}</span>}
          {genres.slice(0, 3).map((g) => (
            <span key={g.id} className="text-zinc-500 text-xs">{g.name}</span>
          ))}
          {(movie.number_of_episodes as number) > 0 && isShow && (
            <span className="text-zinc-500 text-xs">{movie.number_of_episodes as number} eps</span>
          )}
        </div>

        {/* Overview */}
        {overviewText && (
          <div>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {displayOverview}
              {isLongOverview && (
                <button
                  onClick={() => setOverviewExpanded(!overviewExpanded)}
                  className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium"
                  style={{ color: 'var(--reel-accent-hex)' }}
                >
                  {overviewExpanded
                    ? <><ChevronUp className="w-3 h-3" /> Less</>
                    : <><ChevronDown className="w-3 h-3" /> More</>}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Director / creators line */}
        {(director || creators.length > 0) && (
          <p className="text-zinc-500 text-xs -mt-4">
            {isShow ? 'Created by' : 'Directed by'}{' '}
            <span className="text-zinc-300">
              {isShow ? creators.map((c: any) => c.name).join(', ') : director}
            </span>
          </p>
        )}

        {/* ── Action buttons ───────────────────────────────────── */}
        {!showWatchForm ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Play Now */}
              <a
                href={playNowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.97] shadow-lg"
              >
                <Play className="w-4 h-4 fill-black" />
                Play Now
              </a>

              {trailer && (
                <button
                  onClick={() => setTrailerOpen(v => !v)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-white text-sm font-medium transition-colors active:scale-[0.97]"
                  style={trailerOpen
                    ? { borderColor: 'color-mix(in srgb, var(--reel-accent-hex) 60%, transparent)', background: 'color-mix(in srgb, var(--reel-accent-hex) 12%, transparent)' }
                    : { borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}
                >
                  <Play className="w-4 h-4" />
                  {trailerOpen ? 'Hide Trailer' : 'Trailer'}
                </button>
              )}

              {user && (
                <button
                  onClick={handleToggleWatchLater}
                  disabled={watchLaterLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-white text-sm font-medium transition-colors active:scale-[0.97] disabled:opacity-50"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}
                >
                  {inWatchLater
                    ? <BookmarkCheck className="w-4 h-4" style={{ color: 'var(--reel-accent-hex)' }} />
                    : <Bookmark className="w-4 h-4" />}
                  {inWatchLater ? 'Saved' : 'Watch Later'}
                </button>
              )}

              {user && (
                (watchEntry && !saveSuccess) || (saveSuccess && watchEntry) ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 border border-white/10 rounded-full px-4 py-2">
                      <Star className="w-3.5 h-3.5" style={{ fill: 'var(--reel-accent-hex)', color: 'var(--reel-accent-hex)' }} />
                      <span className="text-white text-sm font-semibold">{watchEntry.user_rating}/10</span>
                    </div>
                    {!saveSuccess && (
                      <button onClick={() => setShowWatchForm(true)}
                        className="text-xs text-zinc-500 hover:text-white transition-colors underline underline-offset-2">
                        Update
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowWatchForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-colors active:scale-[0.97] shadow-lg"
                    style={{ background: 'var(--reel-accent-hex)', boxShadow: '0 4px 20px color-mix(in srgb, var(--reel-accent-hex) 35%, transparent)' }}
                  >
                    <Star className="w-4 h-4" />
                    {isShow ? 'Mark as Seen' : 'Mark as Watched'}
                  </button>
                )
              )}
            </div>

            {/* Streaming providers */}
            {providers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {providers.map((p: any) => (
                  <a
                    key={p.provider_id}
                    href={justwatchUrl ?? providerUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 transition-colors active:scale-[0.97]"
                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                    title={`Watch on ${p.provider_name}`}
                  >
                    {p.logo_path && (
                      <img src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                        alt={p.provider_name} className="w-6 h-6 rounded-full" />
                    )}
                    <span className="text-white text-xs font-medium">{p.provider_name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Rating form */
          <div className="rounded-2xl p-5 max-w-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white font-medium mb-4 text-sm">
              {watchEntry ? 'Update your rating' : `Rate this ${isShow ? 'show' : 'movie'}`}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-zinc-500 text-xs uppercase tracking-widest block mb-1">Rating (0–10)</label>
                <input
                  type="number" min="0" max="10" step="0.5"
                  value={ratingInput}
                  onChange={(e) => setRatingInput(e.target.value)}
                  placeholder="e.g. 8.5"
                  className="w-full rounded-lg px-3 py-2 text-white text-sm focus:outline-none placeholder-zinc-600"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
              </div>
              <div>
                <label className="text-zinc-500 text-xs uppercase tracking-widest block mb-1">Comment (optional)</label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="What did you think?"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none placeholder-zinc-600"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
              </div>

              {/* Season ratings — shows only */}
              {isShow && (movie.number_of_seasons ?? 0) > 0 && (
                <div>
                  <button
                    onClick={() => setShowSeasonRatings(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSeasonRatings ? 'rotate-180' : ''}`} />
                    Rate individual seasons
                  </button>
                  {showSeasonRatings && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {Array.from({ length: movie.number_of_seasons as number }, (_, i) => i + 1).map(n => (
                        <div key={n} className="flex items-center gap-3">
                          <span className="text-zinc-500 text-xs w-16 shrink-0">Season {n}</span>
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
                            className="flex-1 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none placeholder-zinc-600"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
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
                  className="flex-1 py-2 rounded-full text-white font-medium text-sm transition-colors disabled:opacity-50"
                  style={{ background: 'var(--reel-accent-hex)' }}>
                  {saving ? 'Saving…' : watchEntry ? 'Update' : 'Save'}
                </button>
                <button
                  onClick={() => setShowWatchForm(false)}
                  className="px-5 py-2 rounded-full text-white text-sm transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trailer inline */}
        {trailerOpen && trailer && (
          <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={`${displayTitle} Trailer`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        )}

        {/* ── Cast ─────────────────────────────────────────────── */}
        {cast.length > 0 && (
          <div>
            <SectionLabel>Cast</SectionLabel>
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
              {cast.slice(0, 12).map((c: any) => (
                <div key={c.id} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px]">
                  <div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-white/10 bg-zinc-800">
                    {c.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-6 h-6 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <span className="text-white text-[10px] font-medium text-center leading-tight line-clamp-2">{c.name}</span>
                  {c.character && (
                    <span className="text-zinc-600 text-[9px] text-center leading-tight line-clamp-1">{c.character}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Season ratings (read mode) ────────────────────── */}
        {isShow && Object.keys(seasonRatings).length > 0 && !showWatchForm && (
          <div>
            <SectionLabel>Your Season Ratings</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {Object.entries(seasonRatings).sort((a, b) => Number(a[0]) - Number(b[0])).map(([s, r]) => (
                <div key={s} className="flex items-center gap-1.5 border border-white/10 rounded-full px-3 py-1">
                  <span className="text-zinc-400 text-xs">S{s}</span>
                  <Star className="w-3 h-3" style={{ fill: 'var(--reel-accent-hex)', color: 'var(--reel-accent-hex)' }} />
                  <span className="text-white text-xs font-semibold">{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Community ────────────────────────────────────────── */}
        {allCommunityItems.length > 0 && (
          <div>
            <SectionLabel>Community</SectionLabel>
            <div className="space-y-3">
              {allCommunityItems.slice(0, 10).map((item, i) => {
                if (item.kind === 'social') {
                  const p = item.post;
                  return (
                    <div key={`s-${p.post_id}`}
                      className="flex items-start gap-3 p-3.5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <img
                        src={p.avatarUrl ?? dicebear(p.username)}
                        alt={p.username}
                        className="w-8 h-8 rounded-full shrink-0 bg-zinc-800 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white text-xs font-semibold">{(p as any).displayName || p.username}</span>
                          <span className="text-zinc-600 text-[10px]">@{p.username} · {timeAgo(p.created_at)}</span>
                          {p.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 font-semibold ml-auto">
                              <Star className="w-2.5 h-2.5 fill-yellow-400" />
                              {p.rating}/10
                            </span>
                          )}
                        </div>
                        {p.message && (
                          <p className="text-zinc-300 text-xs leading-relaxed line-clamp-4">{p.message}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                            <Heart className="w-3 h-3" /> {p.likes ?? 0}
                          </span>
                          {p.reply_count != null && p.reply_count > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                              <MessageCircle className="w-3 h-3" /> {p.reply_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const r = item.review;
                  return (
                    <div key={`f-${i}`}
                      className="flex items-start gap-3 p-3.5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <img
                        src={r.avatarUrl ?? dicebear(r.username)}
                        alt={r.username}
                        className="w-8 h-8 rounded-full shrink-0 bg-zinc-800 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white text-xs font-semibold">{r.username}</span>
                          <span className="text-zinc-500 text-[10px]">friend · rated</span>
                          <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 font-semibold ml-auto">
                            <Star className="w-2.5 h-2.5 fill-yellow-400" />
                            {r.rating}/10
                          </span>
                        </div>
                        {r.message && (
                          <p className="text-zinc-300 text-xs leading-relaxed line-clamp-3 italic">"{r.message}"</p>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}

        {/* ── Similar ─────────────────────────────────────────── */}
        {similar.length > 0 && (
          <div>
            <SectionLabel>{isShow ? 'Similar Shows' : 'More Like This'}</SectionLabel>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
              {similar.slice(0, 12).filter((m: any) => m.poster_path).map((m: any) => (
                <div
                  key={m.id}
                  onClick={() => { setRelatedMovieId(String(m.id)); setRelatedItemType(isShow ? 'show' : 'movie'); }}
                  className="shrink-0 w-24 md:w-28 cursor-pointer rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-white/25 transition-all active:scale-[0.97]"
                  title={m.title ?? m.name}
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w200${m.poster_path}`}
                    alt={m.title ?? m.name}
                    className="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
