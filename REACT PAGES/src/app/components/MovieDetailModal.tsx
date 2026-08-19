import { useState, useEffect, useRef } from 'react';
import { X, Bookmark, BookmarkCheck, Star, Play, ChevronDown, ChevronUp, ChevronLeft, User, Heart, MessageCircle } from 'lucide-react';
import {
  getMovieDetails, getShowDetails, getWatchedMovie, addWatchedMovie, updateWatchedMovie,
  getUser, getWatchLater, watchMovieLater, removeFromWatchLater,
  getFriends, getMovieLogo, timeAgo, searchMovies, getUserPublicProfile,
  getPersonMovies, getMovieRatingSummary, getMoviePosts, createPost,
  bustMovieCommunityCache, bustFeedCache,
} from '../services/api';
import type { WatchedMovie, FeedPost, Movie, MovieRatingSummary } from '../services/api';

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

function dicebear(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-white/50 mb-3">
      {children}
    </p>
  );
}

const INFO_TABS = ['watch', 'cast', 'extras'] as const;
type InfoTab = typeof INFO_TABS[number];

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
  const [moviePosts, setMoviePosts]             = useState<FeedPost[]>([]);
  const [ratingSummary, setRatingSummary]       = useState<MovieRatingSummary | null>(null);
  const [postInput, setPostInput]               = useState('');
  const [postingBusy, setPostingBusy]           = useState(false);
  const [collectionMovies, setCollectionMovies] = useState<any[]>([]);
  const [avatarMap, setAvatarMap]               = useState<Record<string, string>>({});
  const [activeInfoTab, setActiveInfoTab]       = useState<InfoTab>('watch');
  const [castMember, setCastMember]             = useState<{ id: number; name: string; profile_path?: string } | null>(null);
  const [castMovies, setCastMovies]             = useState<Movie[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch the selected cast member's filmography
  useEffect(() => {
    if (!castMember) { setCastMovies(null); return; }
    let cancelled = false;
    setCastMovies(null);
    getPersonMovies(castMember.id)
      .then(movies => { if (!cancelled) setCastMovies(movies); })
      .catch(() => { if (!cancelled) setCastMovies([]); });
    return () => { cancelled = true; };
  }, [castMember]);

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
    setMoviePosts([]);
    setRatingSummary(null);
    setPostInput('');
    setCollectionMovies([]);
    setAvatarMap({});
    setActiveInfoTab('watch');
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

    fetchMedia.then((data: any) => {
      setMovie(data);
      setLoading(false);

      // Franchise / collection movies
      if (type !== 'show') {
        const collection = data?.belongs_to_collection;
        if (collection?.name) {
          const term = (collection.name as string)
            .replace(/\s+(Collection|Franchise|Series|Films|Universe|Saga|Trilogy|Cinematic Universe)$/i, '')
            .trim();
          searchMovies(term)
            .then(results => setCollectionMovies(results.filter((m: any) => String(m.id) !== movieId)))
            .catch(() => {});
        } else if (data?.title) {
          // Title-based fallback: strip subtitles to get base franchise name
          const baseTitle = (data.title as string)
            .replace(/\s*[:\-].*$/, '')
            .replace(/\s+(and\s+the\b.*)$/i, '')
            .trim();
          if (baseTitle.length > 3) {
            searchMovies(baseTitle)
              .then(results => setCollectionMovies(results.filter((m: any) => String(m.id) !== movieId).slice(0, 10)))
              .catch(() => {});
          }
        }
      }
    });

    // Logo
    const logoType = type === 'show' ? 'show' : 'movie';
    getMovieLogo(movieId, logoType).then(url => setLogoUrl(url));

    // Consensus rating + written reviews across all users
    getMovieRatingSummary(movieId).then(setRatingSummary).catch(() => {});

    // Community posts about this movie + resolve missing avatarUrls
    getMoviePosts(movieId).then(posts => {
      setMoviePosts(posts);
      const needsAvatar = [...new Set(posts.filter(p => !p.avatarUrl).map(p => p.user_id))];
      if (needsAvatar.length > 0) {
        Promise.all(needsAvatar.map(uid =>
          getUserPublicProfile(uid).then(prof => ({ uid, url: prof?.avatarUrl ?? null })).catch(() => ({ uid, url: null }))
        )).then(results => {
          const map: Record<string, string> = {};
          results.forEach(r => { if (r.url) map[r.uid] = r.url; });
          if (Object.keys(map).length > 0) setAvatarMap(map);
        });
      }
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
      // Your rating feeds the consensus — refresh it.
      bustMovieCommunityCache(movieId);
      getMovieRatingSummary(movieId).then(setRatingSummary).catch(() => {});
    }
  }

  async function handleCreatePost() {
    if (!user || !movie) return;
    const message = postInput.trim();
    if (!message || postingBusy) return;
    setPostingBusy(true);
    const isShowEntry = type === 'show' || movie.media_type === 'tv';
    const title = isShowEntry ? (movie.name ?? movie.title) : (movie.title ?? movie.name);
    const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
    try {
      const res = await createPost({
        user_id: user.user_id,
        username: user.username,
        message,
        movie_title: title ?? '',
        movie_id: movieId,
        movie_poster: posterUrl,
        rating: watchEntry?.user_rating ?? 0,
      });
      if (res?.success) {
        const optimistic: FeedPost = {
          post_id: res.post_id ?? `tmp-${Date.now()}`,
          user_id: user.user_id,
          username: user.username,
          avatarUrl: (user as { avatarUrl?: string }).avatarUrl,
          message,
          movie_title: title ?? '',
          movie_id: movieId,
          movie_poster: posterUrl,
          rating: watchEntry?.user_rating ?? 0,
          likes: 0,
          liked_by: [],
          created_at: new Date().toISOString(),
          reply_count: 0,
        };
        setMoviePosts(prev => [optimistic, ...prev]);
        setPostInput('');
        bustMovieCommunityCache(movieId);
        bustFeedCache();
      }
    } finally {
      setPostingBusy(false);
    }
  }

  // ── Loading / error ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-40 bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--reel-accent-hex)', borderTopColor: 'transparent' }} />
          <p className="text-zinc-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!movie || movie.error) {
    return (
      <div className="fixed inset-0 z-40 bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Could not load details.</p>
          <button onClick={onClose} className="text-sm font-medium" style={{ color: 'var(--reel-accent-hex)' }}>Close</button>
        </div>
      </div>
    );
  }

  if (relatedMovieId) {
    return (
      <MovieDetailModal
        movieId={relatedMovieId}
        type={relatedItemType}
        onClose={() => setRelatedMovieId(null)}
      />
    );
  }

  // ── Cast member filmography panel ─────────────────────────────────
  if (castMember) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto" onClick={() => setCastMember(null)}>
        <div
          className="w-full max-w-3xl bg-[#0d0d0d] min-h-screen sm:min-h-0 sm:my-10 sm:rounded-2xl border border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-6 py-4 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-white/10">
            <button
              onClick={() => setCastMember(null)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors shrink-0"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-white/10 bg-zinc-800 shrink-0">
              {castMember.profile_path
                ? <img src={`https://image.tmdb.org/t/p/w185${castMember.profile_path}`} alt={castMember.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-zinc-600" /></div>}
            </div>
            <div className="min-w-0">
              <h2 className="text-white text-lg font-bold truncate leading-tight">{castMember.name}</h2>
              <p className="text-zinc-500 text-xs">Filmography</p>
            </div>
          </div>

          {/* Movie grid */}
          <div className="p-4 sm:p-6">
            {castMovies === null ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-zinc-900 animate-pulse" style={{ aspectRatio: '2/3' }} />
                ))}
              </div>
            ) : castMovies.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-10">No other films found for {castMember.name}.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                {castMovies.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setRelatedItemType('movie'); setRelatedMovieId(String(m.id)); setCastMember(null); }}
                    className="group/film text-left focus:outline-none"
                    title={m.title}
                  >
                    <div className="relative rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-white/5 transition-all duration-200 group-hover/film:ring-white/30 group-hover/film:-translate-y-0.5" style={{ aspectRatio: '2/3' }}>
                      {m.poster
                        ? <img src={m.poster} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] text-center px-2">{m.title}</div>}
                      {m.rating > 0 && (
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm">
                          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-white text-[10px] font-semibold">{m.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-white text-xs font-medium mt-1.5 line-clamp-1">{m.title}</p>
                    {m.year > 0 && <p className="text-zinc-500 text-[11px]">{m.year}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────
  const isShow = type === 'show' || movie.media_type === 'tv';
  const genres: { id: number; name: string }[] = movie.genres ?? [];
  const providers: any[] = movie['watch/providers']?.results?.US?.flatrate ?? [];
  // Combine recommendations + similar, franchise entries first
  const tmdbRelated: any[] = [
    ...(movie.recommendations?.results ?? []),
    ...(movie.similar?.results ?? []),
  ].filter((m, i, arr) => arr.findIndex((x: any) => x.id === m.id) === i);
  const similar: any[] = [
    ...collectionMovies,
    ...tmdbRelated.filter((m: any) => !collectionMovies.some(cm => cm.id === m.id) && String(m.id) !== movieId),
  ];

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
  const isLongOverview = overviewText.length > 280;
  const displayOverview = (!overviewExpanded && isLongOverview)
    ? overviewText.slice(0, 280).trimEnd() + '…'
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

  const primaryProvider = providers[0] ?? null;

  // Personal reviews — every user's rating that included a written comment.
  // Prefer the cross-user consensus reviews; fall back to friend reviews when
  // the summary is empty (e.g. index still building).
  type ReviewCard = { user_id: string; name: string; handle: string; avatarUrl?: string; rating: number; message: string };
  const summaryReviews: ReviewCard[] = (ratingSummary?.reviews ?? []).map(r => ({
    user_id: r.user_id, name: r.displayName || r.username || 'User', handle: r.username, avatarUrl: r.avatarUrl, rating: r.rating, message: r.comment,
  }));
  const reviewsList: ReviewCard[] = (() => {
    const base = summaryReviews.length > 0
      ? [...summaryReviews]
      : friendReviews.map(r => ({ user_id: '', name: r.username, handle: r.username, avatarUrl: r.avatarUrl, rating: r.rating, message: r.message }));
    // Make sure the current user's own review shows even if the summary lags.
    if (user && watchEntry && (watchEntry.user_rating ?? 0) > 0 && (watchEntry.comment ?? '').trim()
        && !base.some(x => x.user_id && x.user_id === user.user_id)) {
      base.unshift({
        user_id: user.user_id,
        name: (user as { displayName?: string; username: string }).displayName || user.username,
        handle: user.username,
        avatarUrl: (user as { avatarUrl?: string }).avatarUrl,
        rating: watchEntry.user_rating ?? 0,
        message: watchEntry.comment ?? '',
      });
    }
    return base;
  })();

  const tabIdx = INFO_TABS.indexOf(activeInfoTab);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-40 bg-[#0A0A0A] overflow-y-auto overscroll-contain"
      style={{ scrollBehavior: 'smooth' }}
    >

      {/* ── MOBILE hero — portrait poster ───────────────────────── */}
      <div className="relative w-full md:hidden" style={{ aspectRatio: '2/3', maxHeight: '78vh', overflow: 'hidden' }}>
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
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.4) 0%, transparent 15%)' }} />
        {/* Bottom fade */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,10,0.6) 68%, rgba(10,10,10,0.92) 86%, #0A0A0A 100%)' }} />

        {/* Close button — below nav bar */}
        <button
          onClick={onClose}
          className="absolute top-[68px] right-4 z-10 flex items-center justify-center w-9 h-9 rounded-full transition-colors active:scale-[0.97]"
          style={{ background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Provider emblem — bottom-right */}
        {primaryProvider?.logo_path && (
          <div className="absolute bottom-5 right-4 z-10">
            <img
              src={`https://image.tmdb.org/t/p/original${primaryProvider.logo_path}`}
              alt={primaryProvider.provider_name}
              className="w-12 h-12 rounded-xl object-cover"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.8)', border: '1.5px solid rgba(255,255,255,0.15)' }}
            />
          </div>
        )}

        {/* Logo — centered at bottom */}
        <div className="absolute bottom-0 inset-x-0 px-5 pb-6 flex justify-center items-end" style={{ paddingRight: primaryProvider ? '5rem' : undefined }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayTitle as string}
              className="w-auto object-contain"
              style={{
                maxHeight: 180,
                maxWidth: '70%',
                filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.95))',
              }}
            />
          ) : (
            <h1 className="text-3xl font-black text-white text-center leading-tight"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}>
              {displayTitle}
            </h1>
          )}
        </div>
      </div>

      {/* ── DESKTOP hero — widescreen backdrop ──────────────────── */}
      <div className="relative w-full hidden md:block" style={{ height: 'clamp(320px, 54vw, 660px)' }}>
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
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.4) 0%, transparent 20%)' }} />
        {/* Bottom fade */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 28%, rgba(10,10,10,0.5) 58%, rgba(10,10,10,0.88) 76%, #0A0A0A 100%)' }} />

        {/* Close button — below nav bar */}
        <button
          onClick={onClose}
          className="absolute top-[68px] right-5 z-10 flex items-center justify-center w-9 h-9 rounded-full transition-colors active:scale-[0.97]"
          style={{ background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Provider emblem — bottom-right */}
        {primaryProvider?.logo_path && (
          <div className="absolute bottom-8 right-8 z-10">
            <img
              src={`https://image.tmdb.org/t/p/original${primaryProvider.logo_path}`}
              alt={primaryProvider.provider_name}
              className="w-16 h-16 rounded-2xl object-cover"
              style={{ boxShadow: '0 6px 28px rgba(0,0,0,0.85)', border: '1.5px solid rgba(255,255,255,0.15)' }}
            />
          </div>
        )}

        {/* Logo — centered at bottom */}
        <div className="absolute bottom-0 inset-x-0 pb-10 flex justify-center items-end" style={{ paddingRight: primaryProvider ? '6rem' : undefined }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayTitle as string}
              className="w-auto object-contain"
              style={{
                maxHeight: 'clamp(144px, 18vw, 280px)',
                maxWidth: '55%',
                filter: 'drop-shadow(0 2px 28px rgba(0,0,0,0.95)) drop-shadow(0 0 12px rgba(0,0,0,0.7))',
              }}
            />
          ) : (
            <h1 className="text-5xl lg:text-6xl font-black text-white text-center leading-tight px-8"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>
              {displayTitle}
            </h1>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="px-5 md:px-14 pb-16 space-y-7 mt-2">

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
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

        {/* Overview — large clean font */}
        {overviewText && (
          <div>
            <p className="text-zinc-200 text-lg leading-relaxed font-light">
              {displayOverview}
              {isLongOverview && (
                <button
                  onClick={() => setOverviewExpanded(!overviewExpanded)}
                  className="ml-1.5 inline-flex items-center gap-0.5 text-sm font-medium"
                  style={{ color: 'var(--reel-accent-hex)' }}
                >
                  {overviewExpanded
                    ? <><ChevronUp className="w-3.5 h-3.5" /> Less</>
                    : <><ChevronDown className="w-3.5 h-3.5" /> More</>}
                </button>
              )}
            </p>
          </div>
        )}

        {/* ── User action buttons ──────────────────────────────── */}
        {!showWatchForm ? (
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
        ) : (
          /* Rating form */
          <div className="rounded-2xl p-5 max-w-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white font-medium mb-4 text-sm">
              {watchEntry ? 'Update your rating' : `Rate this ${isShow ? 'show' : 'movie'}`}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-zinc-500 text-xs font-medium block mb-1">Rating (0–10)</label>
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
                <label className="text-zinc-500 text-xs font-medium block mb-1">Comment (optional)</label>
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

        {/* ── Community: consensus rating · reviews · posts — before tabs */}
        <div className="space-y-8">

          {/* Consensus user rating */}
          {ratingSummary && ratingSummary.count > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex flex-col items-center justify-center px-1">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-white font-bold" style={{ fontSize: 30, fontFamily: 'SanFran, system-ui, sans-serif', lineHeight: 1 }}>
                    {ratingSummary.average.toFixed(1)}
                  </span>
                  <span className="text-zinc-500 text-sm">/10</span>
                </div>
                <span className="text-zinc-500 text-[10px] mt-1">
                  {ratingSummary.count} rating{ratingSummary.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="h-10 w-px shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">Reelette user rating</p>
                <p className="text-zinc-500 text-xs mt-0.5">Combined from everyone who marked this as watched.</p>
              </div>
              {user && (
                <button
                  onClick={() => { setActiveInfoTab('watch'); setShowWatchForm(true); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="shrink-0 text-xs font-medium px-3.5 py-2 rounded-full transition-colors hover:bg-white/[0.1]"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                >
                  {watchEntry ? 'Update review' : 'Write a review'}
                </button>
              )}
            </div>
          )}

          {/* Personal reviews */}
          {reviewsList.length > 0 && (
            <div>
              <SectionLabel>Reviews</SectionLabel>
              <div className="space-y-3">
                {reviewsList.slice(0, 8).map((r, i) => (
                  <div key={`rv-${r.user_id || r.handle}-${i}`}
                    className="flex items-start gap-3 p-3.5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <img
                      src={r.avatarUrl ?? avatarMap[r.user_id] ?? dicebear(r.handle || r.name)}
                      alt={r.name}
                      className="w-8 h-8 rounded-full shrink-0 bg-zinc-800 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white text-xs font-semibold">{r.name}</span>
                        {r.handle && <span className="text-zinc-600 text-[10px]">@{r.handle}</span>}
                        {user && r.user_id === user.user_id && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>You</span>
                        )}
                        <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 font-semibold ml-auto">
                          <Star className="w-2.5 h-2.5 fill-yellow-400" />
                          {r.rating}/10
                        </span>
                      </div>
                      {r.message && (
                        <p className="text-zinc-300 text-xs leading-relaxed line-clamp-4 italic">"{r.message}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community posts */}
          <div>
            <SectionLabel>Community posts</SectionLabel>

            {user && (
              <div className="mb-3 rounded-2xl p-3"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <textarea
                  value={postInput}
                  onChange={(e) => setPostInput(e.target.value)}
                  maxLength={2000}
                  rows={2}
                  placeholder={`Share your thoughts on ${displayTitle}…`}
                  className="w-full bg-transparent text-white text-xs leading-relaxed resize-none focus:outline-none placeholder-zinc-600"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-zinc-600">Your post appears on the Social feed.</span>
                  <button
                    onClick={handleCreatePost}
                    disabled={postingBusy || !postInput.trim()}
                    className="text-xs font-semibold px-4 py-1.5 rounded-full transition-[filter] duration-200 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--reel-red)', color: '#fff' }}
                  >
                    {postingBusy ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            )}

            {moviePosts.length > 0 ? (
              <div className="space-y-3">
                {moviePosts.slice(0, 10).map(p => (
                  <div key={`p-${p.post_id}`}
                    className="flex items-start gap-3 p-3.5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <img
                      src={p.avatarUrl ?? avatarMap[p.user_id] ?? dicebear(p.username)}
                      alt={p.username}
                      className="w-8 h-8 rounded-full shrink-0 bg-zinc-800 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white text-xs font-semibold">{(p as { displayName?: string }).displayName || p.username}</span>
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
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 text-xs">
                {user ? 'Be the first to post about this.' : 'No community posts yet.'}
              </p>
            )}
          </div>
        </div>

        {/* ── Sub-tabs: Watch / Cast / Extras ─────────────────── */}
        <div>
          {/* Underline tab bar — nav-style */}
          <div className="relative flex border-b mb-6" style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            {INFO_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveInfoTab(tab)}
                className="relative pb-3 mr-7 text-sm font-medium transition-colors active:scale-[0.97]"
                style={{ color: activeInfoTab === tab ? '#fff' : 'rgba(255,255,255,0.38)' }}
              >
                {tab === 'watch' ? 'Watch' : tab === 'cast' ? 'Cast' : 'Extras'}
                {activeInfoTab === tab && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: 'var(--reel-accent-hex)' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── Watch tab ────────────────────────────────────── */}
          {activeInfoTab === 'watch' && (
            <div className="space-y-6">
              {/* Providers */}
              {providers.length > 0 ? (
                <div>
                  <SectionLabel>Streaming On</SectionLabel>
                  <div className="flex flex-wrap gap-2.5">
                    {providers.map((p: any) => (
                      <a
                        key={p.provider_id}
                        href={justwatchUrl ?? providerUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 border rounded-xl pl-1.5 pr-4 py-1.5 transition-colors active:scale-[0.97]"
                        style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
                        title={`Watch on ${p.provider_name}`}
                      >
                        {p.logo_path && (
                          <img src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                            alt={p.provider_name} className="w-8 h-8 rounded-lg" />
                        )}
                        <span className="text-white text-sm font-medium">{p.provider_name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-zinc-600 text-sm">No streaming info available.</p>
              )}

              {/* Trailer */}
              {trailer && (
                <div>
                  <SectionLabel>Trailer</SectionLabel>
                  <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`}
                        allow="encrypted-media; picture-in-picture"
                        allowFullScreen
                        title={`${displayTitle} Trailer`}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Cast tab ─────────────────────────────────────── */}
          {activeInfoTab === 'cast' && (
            <div>
              {cast.length > 0 ? (
                <div className="flex gap-4 md:gap-6 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                  {cast.slice(0, 16).map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setCastMember({ id: c.id, name: c.name, profile_path: c.profile_path })}
                      className="flex flex-col items-center gap-1.5 shrink-0 w-[72px] md:w-[96px] group/cast cursor-pointer focus:outline-none"
                      title={`See more of ${c.name}`}
                    >
                      <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden ring-1 ring-white/10 bg-zinc-800 transition-all duration-200 group-hover/cast:ring-2 group-hover/cast:ring-white/40 group-hover/cast:scale-105">
                        {c.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                            alt={c.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 md:w-8 md:h-8 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <span className="text-white text-[10px] md:text-xs font-medium text-center leading-tight line-clamp-2 transition-colors group-hover/cast:text-white">{c.name}</span>
                      {c.character && (
                        <span className="text-zinc-600 text-[9px] md:text-[10px] text-center leading-tight line-clamp-1">{c.character}</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-600 text-sm">No cast information available.</p>
              )}
            </div>
          )}

          {/* ── Extras tab ───────────────────────────────────── */}
          {activeInfoTab === 'extras' && (
            <div className="space-y-7">
              {/* Director / creators */}
              {(director || creators.length > 0) && (
                <div>
                  <SectionLabel>{isShow ? 'Created By' : 'Directed By'}</SectionLabel>
                  <p className="text-zinc-200 text-base font-medium">
                    {isShow ? creators.map((c: any) => c.name).join(', ') : director}
                  </p>
                </div>
              )}

              {/* Season ratings (read mode) */}
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

              {/* More Like This */}
              {similar.length > 0 && (
                <div>
                  <SectionLabel>{isShow ? 'Similar Shows' : 'More Like This'}</SectionLabel>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                    {similar.slice(0, 14).filter((m: any) => m.poster_path).map((m: any) => (
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

              {similar.length === 0 && !director && creators.length === 0 && (
                <p className="text-zinc-600 text-sm">No extras available.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
