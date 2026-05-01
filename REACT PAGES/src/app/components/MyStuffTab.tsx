import { useState, useEffect, useRef } from 'react';
import { Star, Bookmark, BarChart2, ArrowUpDown, Check } from 'lucide-react';
import { getWatchedMovies, getWatchLater, getMovieDetails, getMovieProvider, getUser, getRouletteHistory } from '../services/api';
import type { WatchedMovie, RouletteSpin } from '../services/api';
import { MovieDetailModal } from './MovieDetailModal';
import { PROVIDER_LOGOS } from '../constants/providers';
import { StatsTab } from './StatsTab';

type Tab      = 'watched' | 'watchlater' | 'stats';
type SortMode = 'rating-desc' | 'rating-asc' | 'franchise' | 'year-desc' | 'year-asc' | 'az';

interface WatchLaterMovie {
  movie_id: string;
  title: string;
  year: string;
  poster: string | null;
  streamingService: string;
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
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [sortMode, setSortMode]               = useState<SortMode>('rating-desc');
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
    ]).then(([m, spins]) => {
      setMovies(m);
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
          return Promise.all([getMovieDetails(strId), getMovieProvider(strId)]).then(([d, svc]) => {
            const entry: WatchLaterMovie = {
              movie_id: strId,
              title:    (d as any)?.title ?? 'Unknown',
              year:     (d as any)?.release_date ? String((d as any).release_date).slice(0, 4) : '',
              poster:   (d as any)?.poster_path ? `https://image.tmdb.org/t/p/w500${(d as any).poster_path}` : null,
              streamingService: svc,
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
    setActiveTab(tab);
  };

  const sortedMovies     = sortWatched(movies, sortMode);
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
    <div className="-mx-6 -mt-8">

      {/* ── Subtle cinema header ── */}
      <div className="full-bleed relative overflow-hidden" style={{ marginBottom: 0 }}>
        {/* Film strip — top only (subtle: just one strip) */}
        <div className="absolute top-0 inset-x-0 h-[20px] bg-[#0c0c0c] border-b border-[#181818] flex items-center z-10 overflow-hidden">
          {FILM_HOLES.map((_, i) => (
            <div key={i} className="shrink-0 flex-1 px-[3px]">
              <div className="h-[12px] rounded-[2px] bg-[#050505]" />
            </div>
          ))}
        </div>

        {/* Subtle glow from nav — softer than Roulette/Social */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 70% at 50% 0%, rgba(124,93,189,0.14) 0%, transparent 70%)' }}
        />

        {/* Faint side curtains */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6" style={{ paddingTop: 42, paddingBottom: 32 }}>
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#7C5DBD]/50" />
            <span
              className="text-[10px] font-bold tracking-[0.25em] text-[#7C5DBD] uppercase"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              My Collection
            </span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#7C5DBD]/50" />
          </div>

          <h1
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontWeight: 100,
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
              color: '#fff',
              lineHeight: 1.15,
            }}
          >
            My Stuff
          </h1>

          <div className="flex items-center gap-3 mt-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#7C5DBD]/40" />
            <span className="text-[#7C5DBD]/50 text-xs">✦</span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#7C5DBD]/40" />
          </div>
        </div>
      </div>

      {/* ── Controls row: tabs + sort ── */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">

        {/* Tab pills */}
        <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-full p-1 w-fit">
          <button
            onClick={() => handleTabChange('watched')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'watched' ? 'bg-[#7C5DBD] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" /> Watched
          </button>
          <button
            onClick={() => handleTabChange('watchlater')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'watchlater' ? 'bg-[#7C5DBD] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Watch Later
          </button>
          <button
            onClick={() => handleTabChange('stats')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'stats' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
            style={activeTab === 'stats' ? { backgroundColor: '#f97316' } : {}}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Stats
          </button>
        </div>

        {/* Sort button — hidden on Stats tab */}
        {activeTab !== 'stats' && (
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen(v => !v)}
              className="flex items-center gap-2 text-sm border rounded-full px-3.5 py-2 transition-colors bg-[#111] border-[#1e1e1e] text-gray-400 hover:text-white hover:border-[#333]"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <span className="sm:hidden">Sort</span>
            </button>

            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#111] border border-[#1e1e1e] rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Tiny "SORT BY" header inside dropdown */}
                <p
                  className="text-[9px] font-bold tracking-[0.2em] text-gray-600 uppercase px-4 pt-2 pb-1.5"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  Sort By
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
      <div className="px-6 pb-12">
        {loading ? (
          <div className="text-gray-500 text-center py-16">Loading…</div>
        ) : activeTab === 'stats' ? (
          <StatsTab movies={movies} recentSpins={recentSpins} onMovieClick={setSelectedMovieId} />
        ) : activeTab === 'watched' ? (
          sortedMovies.length === 0 ? (
            <div className="text-gray-500 text-center py-16">
              You haven't watched any movies yet. Click a movie and hit "Mark as Watched"!
            </div>
          ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {pagedMovies.map(m => (
                <button
                  key={m.movie_id}
                  onClick={() => setSelectedMovieId(m.movie_id)}
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
                      style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 600 }}
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
                      ? { background: '#7C5DBD', borderColor: '#7C5DBD', color: '#fff' }
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {sortedWatchLater.map(m => (
                <button
                  key={m.movie_id}
                  onClick={() => setSelectedMovieId(m.movie_id)}
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
                      style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 600 }}
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
          onClose={() => {
            setSelectedMovieId(null);
            if (activeTab === 'watched') loadWatched();
          }}
        />
      )}
    </div>
  );
}
