import React, { useState, useEffect, useRef } from 'react';
import { Star, Bookmark, BarChart2, ArrowUpDown, Check, Trophy } from 'lucide-react';
import { getWatchedMovies, getWatchLater, getMovieDetails, getShowDetails, getMovieProvider, getUser, getRouletteHistory } from '../services/api';
import type { WatchedMovie, RouletteSpin } from '../services/api';
import { MovieDetailModal } from './MovieDetailModal';
import { PROVIDER_LOGOS } from '../constants/providers';
import { StatsTab } from './StatsTab';
import { RankingsView } from './RankingsView';

type Tab         = 'watched' | 'watchlater' | 'stats' | 'rankings';
type SortMode    = 'rating-desc' | 'rating-asc' | 'franchise' | 'year-desc' | 'year-asc' | 'az';
type MediaFilter = 'all' | 'movie' | 'show';

interface WatchLaterMovie {
  movie_id: string;
  title: string;
  year: string;
  poster: string | null;
  streamingService: string;
  media_type: 'movie' | 'show';
}

const SORT_OPTIONS: { value: SortMode; label: string; watchedOnly?: boolean }[] = [
  { value: 'rating-desc', label: 'Rating: High → Low',   watchedOnly: true  },
  { value: 'rating-asc',  label: 'Rating: Low → High',   watchedOnly: true  },
  { value: 'franchise',   label: 'By Franchise',                             },
  { value: 'year-desc',   label: 'Published: Newest',                        },
  { value: 'year-asc',    label: 'Published: Oldest',                        },
  { value: 'az',          label: 'A → Z',                                    },
];

// Strip leading articles and everything after colon/dash/sequel keywords to group by series
function franchiseKey(title: string): string {
  let t = title.replace(/^(The|A|An)\s+/i, '');
  t = t.split(/[:–—]|(\s+(Part|Vol\.?|Chapter|Episode|Season)\b)/i)[0].trim();
  t = t.replace(/\s+\d+$/, '').trim();
  return t.toLowerCase();
}

function sortWatched(list: WatchedMovie[], mode: SortMode): WatchedMovie[] {
  return [...list].sort((a, b) => {
    switch (mode) {
      case 'rating-desc': return (b.user_rating ?? 0) - (a.user_rating ?? 0);
      case 'rating-asc':  return (a.user_rating ?? 0) - (b.user_rating ?? 0);
      case 'franchise':   return franchiseKey(a.title).localeCompare(franchiseKey(b.title)) || a.title.localeCompare(b.title);
      case 'year-desc':   return (b.year ?? 0) - (a.year ?? 0);
      case 'year-asc':    return (a.year ?? 0) - (b.year ?? 0);
      case 'az':          return a.title.localeCompare(b.title);
    }
  });
}

function sortWatchLater(list: WatchLaterMovie[], mode: SortMode): WatchLaterMovie[] {
  return [...list].sort((a, b) => {
    switch (mode) {
      case 'franchise': return franchiseKey(a.title).localeCompare(franchiseKey(b.title)) || a.title.localeCompare(b.title);
      case 'year-desc': return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      case 'year-asc':  return (parseInt(a.year) || 0) - (parseInt(b.year) || 0);
      case 'az':        return a.title.localeCompare(b.title);
      default:          return 0;
    }
  });
}

// Film strip holes — 48 slots, same as Roulette / Social
const FILM_HOLES = Array.from({ length: 48 });

export function MyStuffTab() {
  const PAGE_SIZE = 20;

  const [activeTab, setActiveTab]             = useState<Tab>('watched');
  const [movies, setMovies]                   = useState<WatchedMovie[]>([]);
  const [watchLater, setWatchLater]           = useState<WatchLaterMovie[]>([]);
  const [recentSpins, setRecentSpins]         = useState<RouletteSpin[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [page, setPage]                       = useState(1);
  const [selectedMovieId, setSelectedMovieId]   = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'movie' | 'show'>('movie');
  const [selectedItemTitle, setSelectedItemTitle] = useState<string | undefined>(undefined);
  const [mediaFilter, setMediaFilter]           = useState<MediaFilter>('all');
  const [sortMode, setSortMode]                 = useState<SortMode>('rating-desc');
  const [sortOpen, setSortOpen]               = useState(false);
  const sortRef                               = useRef<HTMLDivElement>(null);

  const movieDetailsCacheRef = useRef<Map<string, WatchLaterMovie>>(new Map());
  const user = getUser();

  // Close sort dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Always load the full library so sorting works across all pages
  function loadWatched() {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      getWatchedMovies(user.user_id, 500),
      getRouletteHistory(user.user_id, 20),
    ]).then(async ([m, spins]) => {
      // For old entries missing media_type, detect by checking if the movie endpoint
      // returns an error or a title mismatch (same logic as MovieDetailModal's knownTitle).
      const resolved = await Promise.all(m.map(async (entry) => {
        if (entry.media_type) return entry;
        try {
          const d = await getMovieDetails(entry.movie_id) as any;
          const isError = !d || d.success === false || d.error || !d.title;
          const titleMismatch = d?.title && d.title.toLowerCase() !== entry.title.toLowerCase();
          if (isError || titleMismatch) return { ...entry, media_type: 'show' as const };
        } catch {}
        return { ...entry, media_type: 'movie' as const };
      }));
      setMovies(resolved);
      setRecentSpins(spins);
      setPage(1);
      setLoading(false);
    });
  }

  function loadWatchLater() {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    getWatchLater(user.user_id).then(async (ids) => {
      const cache = movieDetailsCacheRef.current;
      const details = await Promise.all(
        ids.map((id) => {
          const strId = String(id);
          if (cache.has(strId)) return Promise.resolve(cache.get(strId)!);
          return Promise.all([getMovieDetails(strId), getMovieProvider(strId)]).then(async ([d, svc]) => {
            let details = d as any;
            let mediaType: 'movie' | 'show' = 'movie';
            if (!details?.title && (details?.name || details?.first_air_date)) {
              details = await getShowDetails(strId).catch(() => d) as any;
              mediaType = 'show';
            }
            const entry: WatchLaterMovie = {
              movie_id: strId,
              title:    details?.title ?? details?.name ?? 'Unknown',
              year:     details?.release_date ? String(details.release_date).slice(0, 4)
                        : details?.first_air_date ? String(details.first_air_date).slice(0, 4) : '',
              poster:   details?.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
              streamingService: svc,
              media_type: mediaType,
            };
            cache.set(strId, entry);
            return entry;
          });
        })
      );
      setWatchLater(details);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (activeTab === 'watched') loadWatched();
    else if (activeTab === 'stats') loadWatched();
    else loadWatchLater();
  }, [activeTab]);

  // Reset to a valid sort when switching tabs (rating sorts only make sense for watched)
  const handleTabChange = (tab: Tab) => {
    if (tab === 'watchlater' && (sortMode === 'rating-desc' || sortMode === 'rating-asc')) {
      setSortMode('year-desc');
    }
    if (tab !== 'watched') setMediaFilter('all');
    setActiveTab(tab);
  };

  const filteredMovies   = movies.filter(m =>
    mediaFilter === 'all' ? true : mediaFilter === 'show' ? m.media_type === 'show' : m.media_type !== 'show'
  );
  const sortedMovies     = sortWatched(filteredMovies, sortMode);
  const totalPages       = Math.max(1, Math.ceil(sortedMovies.length / PAGE_SIZE));
  const pagedMovies      = sortedMovies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sortedWatchLater = sortWatchLater(watchLater, sortMode);

  const visibleSorts = activeTab === 'watched'
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter(o => !o.watchedOnly);

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortMode)?.label ?? 'Sort';

  if (!user) {
    return (
      <div className="text-gray-500 text-center py-16">
        Please log in to view your stuff.
      </div>
    );
  }

  return (
    <div className="-mx-3 sm:-mx-6 -mt-8">

      {/* ── Controls row: tabs + sort ── */}
      <div className="px-3 sm:px-6 pt-10 pb-4 flex items-center gap-4 flex-wrap">

        {/* Tab pills — sliding indicator (GPU-accelerated translateX) */}
        {(() => {
          const TAB_ORDER: Tab[] = ['watched', 'watchlater', 'stats', 'rankings'];
          const tabIdx = TAB_ORDER.indexOf(activeTab);
          const indicatorColor = 'var(--reel-accent-hex)';
          return (
            <div className="relative flex rounded-full p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
              <div style={{
                position: 'absolute', top: 4, bottom: 4, left: 4,
                width: 'calc((100% - 8px) / 4)',
                background: indicatorColor,
                borderRadius: 9999,
                transform: `translateX(${tabIdx * 100}%)`,
                transition: 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1), background-color 150ms cubic-bezier(0.23, 1, 0.32, 1)',
                pointerEvents: 'none',
              }} />
              {([
                { id: 'watched',   Icon: Star,     label: 'Watched'      },
                { id: 'watchlater', Icon: Bookmark, label: 'Watch Later'  },
                { id: 'stats',     Icon: BarChart2, label: 'Stats'        },
                { id: 'rankings',  Icon: Trophy,    label: 'Rankings'     },
              ] as { id: Tab; Icon: React.ElementType; label: string }[]).map(t => (
                <button key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className="relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium active:scale-[0.97]"
                  style={{ color: activeTab === t.id ? '#fff' : '#9ca3af', transition: 'color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
                  <t.Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Media filter — only on Watched tab, sliding indicator */}
        {activeTab === 'watched' && (() => {
          const FILTERS: MediaFilter[] = ['all', 'movie', 'show'];
          const filterIdx = FILTERS.indexOf(mediaFilter);
          return (
            <div className="relative flex rounded-full p-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
              <div style={{
                position: 'absolute', top: 4, bottom: 4, left: 4,
                width: 'calc((100% - 8px) / 3)',
                background: 'var(--reel-accent-hex)',
                borderRadius: 9999,
                transform: `translateX(calc(${filterIdx} * 100%))`,
                transition: 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1)',
                pointerEvents: 'none',
              }} />
              {FILTERS.map(f => (
                <button key={f}
                  onClick={() => { setMediaFilter(f); setPage(1); }}
                  className="relative z-10 flex-1 px-3 py-1.5 rounded-full text-xs font-medium active:scale-[0.97]"
                  style={{ color: mediaFilter === f ? '#fff' : '#9ca3af', transition: 'color 150ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
                  {f === 'all' ? 'All' : f === 'movie' ? 'Movies' : 'Shows'}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Sort button — hidden on Stats and Rankings tabs, pushed to the far right */}
        {activeTab !== 'stats' && activeTab !== 'rankings' && (
          <div className="relative ml-auto" ref={sortRef}>
            <button
              onClick={() => setSortOpen(v => !v)}
              className="flex items-center gap-2 text-sm rounded-full px-3.5 py-2 transition-colors text-zinc-400 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <span className="sm:hidden">Sort</span>
            </button>

            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150" style={{ background: 'rgba(18,18,22,0.92)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>
                {/* Tiny "SORT BY" header inside dropdown */}
                <p className="text-[10px] font-medium text-gray-600 px-4 pt-2 pb-1.5">
                  Sort by
                </p>
                {visibleSorts.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortMode(opt.value); setPage(1); setSortOpen(false); }}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.04] text-left"
                  >
                    <span className={sortMode === opt.value ? 'text-white font-semibold' : 'text-gray-400'}>
                      {opt.label}
                    </span>
                    {sortMode === opt.value && <Check className="w-3.5 h-3.5 text-[#7C5DBD] shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-3 sm:px-6 pb-12">
        {activeTab === 'rankings' ? (
          <RankingsView userId={user.user_id} />
        ) : loading ? (
          <div className="text-gray-500 text-center py-16">Loading…</div>
        ) : activeTab === 'stats' ? (
          <StatsTab
            movies={movies}
            recentSpins={recentSpins}
            onMovieClick={(id, t) => { setSelectedMovieId(id); setSelectedItemType(t ?? 'movie'); }}
          />
        ) : activeTab === 'watched' ? (
          sortedMovies.length === 0 ? (
            <div className="text-gray-500 text-center py-16">
              You haven't watched any movies yet. Click a movie and hit "Mark as Watched"!
            </div>
          ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {pagedMovies.map(m => (
                <button
                  key={m.movie_id}
                  onClick={() => { setSelectedMovieId(m.movie_id); setSelectedItemType(m.media_type === 'show' ? 'show' : 'movie'); setSelectedItemTitle(m.title); }}
                  className="text-left group focus:outline-none"
                >
                  <div className="relative rounded-xl overflow-hidden bg-[#111] border border-[#1e1e1e] group-hover:border-[#7C5DBD]/50 transition-colors">
                    {m.poster ? (
                      <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-[#1a1a1a] flex items-center justify-center">
                        <span className="text-gray-600 text-xs text-center px-2">{m.title}</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/75 rounded-full px-2 py-0.5">
                      <Star className="w-3 h-3 fill-[#7C5DBD] text-[#7C5DBD]" />
                      <span className="text-white text-xs font-semibold">{m.user_rating}</span>
                    </div>
                    {m.services[0] && PROVIDER_LOGOS[m.services[0]] && (
                      <div className="absolute top-2 right-2 w-8 h-8 rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10">
                        <img src={PROVIDER_LOGOS[m.services[0]]} alt={m.services[0]} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 px-0.5">
                    <p
                      className="text-white text-sm leading-snug line-clamp-1"
                      style={{ fontFamily: "SanFran, system-ui, sans-serif", fontWeight: 600 }}
                    >
                      {m.title}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{m.year}</p>
                    {m.comment && (
                      <p className="text-gray-400 text-xs mt-1 italic line-clamp-2">"{m.comment}"</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-8 flex-wrap">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm border border-[#2A2A2A] bg-[#111] text-gray-400 hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
                    style={p === page
                      ? { background: 'var(--reel-accent-hex)', borderColor: 'var(--reel-accent-hex)', color: '#fff' }
                      : { background: '#111', borderColor: '#2A2A2A', color: '#9ca3af' }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm border border-[#2A2A2A] bg-[#111] text-gray-400 hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            )}
            </>
          )
        ) : (
          sortedWatchLater.length === 0 ? (
            <div className="text-gray-500 text-center py-16">
              No movies saved yet. Hit the bookmark icon on any movie to save it!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {sortedWatchLater.map(m => (
                <button
                  key={m.movie_id}
                  onClick={() => { setSelectedMovieId(m.movie_id); setSelectedItemType(m.media_type ?? 'movie'); setSelectedItemTitle(m.title); }}
                  className="text-left group focus:outline-none"
                >
                  <div className="relative rounded-xl overflow-hidden bg-[#111] border border-[#1e1e1e] group-hover:border-[#7C5DBD]/50 transition-colors">
                    {m.poster ? (
                      <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-[#1a1a1a] flex items-center justify-center">
                        <span className="text-gray-600 text-xs text-center px-2">{m.title}</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/75 rounded-full p-1">
                      <Bookmark className="w-3 h-3 fill-white text-white" />
                    </div>
                    {m.streamingService && PROVIDER_LOGOS[m.streamingService] && (
                      <div className="absolute top-2 right-2 w-8 h-8 rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10">
                        <img src={PROVIDER_LOGOS[m.streamingService]} alt={m.streamingService} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 px-0.5">
                    <p
                      className="text-white text-sm leading-snug line-clamp-1"
                      style={{ fontFamily: "SanFran, system-ui, sans-serif", fontWeight: 600 }}
                    >
                      {m.title}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{m.year}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>


      {selectedMovieId && (
        <MovieDetailModal
          movieId={selectedMovieId}
          type={selectedItemType}
          knownTitle={selectedItemTitle}
          onClose={() => {
            setSelectedMovieId(null);
            if (activeTab === 'watched') loadWatched();
          }}
        />
      )}
    </div>
  );
}
