import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import type { Movie } from '../services/api';
import { getServices, discoverMovies, searchMovies } from '../services/api';
// TMDB company / keyword IDs used for curated rows
// 420 = Marvel Studios, 3 = Pixar, 2 = Walt Disney Pictures
// 9993|128064 = DC Films|DC Entertainment, 4981 = Mission Impossible keyword
// 161176 = "star wars" keyword
import { useDiscover } from '../contexts/DiscoverContext';
import { FeaturedCard } from './FeaturedCard';
import { SectionRow } from './SectionRow';
import { LandscapeCard } from './LandscapeCard';
import { PortraitCard } from './PortraitCard';
import { PLATFORM_COLORS } from './SmallCard';
import { PROVIDER_LOGOS } from '../constants/providers';

// Mobile landscape cards are slightly narrower to peek the next card
const MOBILE_LANDSCAPE_W = 'min(310px, 82vw)';

const PROVIDER_FOR_YOU: Record<string, {
  serviceKey: string;
  popularLabel: string;
  subRows: Array<{ label: string; fetch: () => Promise<Movie[]> }>;
}> = {
  'Netflix': {
    serviceKey: 'netflix', popularLabel: 'Popular on Netflix',
    subRows: [
      { label: 'Action on Netflix',   fetch: () => discoverMovies({ genre_id: '28', services_filter: { netflix: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Comedy on Netflix',   fetch: () => discoverMovies({ genre_id: '35', services_filter: { netflix: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Thriller on Netflix', fetch: () => discoverMovies({ genre_id: '53', services_filter: { netflix: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Disney+': {
    serviceKey: 'disneyPlus', popularLabel: 'Popular on Disney+',
    subRows: [
      { label: 'Marvel',          fetch: () => discoverMovies({ with_companies: '420', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      { label: 'Star Wars',       fetch: () => discoverMovies({ with_keywords: '161176', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      { label: 'Pixar',           fetch: () => discoverMovies({ with_companies: '3', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      { label: 'Disney Classics', fetch: () => discoverMovies({ with_companies: '2', year_to: '2000', sort_by: 'vote_average.desc', min_rating: 6 } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
    ],
  },
  'Hulu': {
    serviceKey: 'hulu', popularLabel: 'Popular on Hulu',
    subRows: [
      { label: 'Horror on Hulu', fetch: () => discoverMovies({ genre_id: '27', services_filter: { hulu: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Comedy on Hulu', fetch: () => discoverMovies({ genre_id: '35', services_filter: { hulu: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Sci-Fi on Hulu', fetch: () => discoverMovies({ genre_id: '878', services_filter: { hulu: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Max': {
    serviceKey: 'hboMax', popularLabel: 'Popular on Max',
    subRows: [
      { label: 'DC Universe',      fetch: () => discoverMovies({ with_companies: '9993|128064', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      { label: 'Drama on Max',     fetch: () => discoverMovies({ genre_id: '18', services_filter: { hboMax: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Top Picks on Max', fetch: () => discoverMovies({ min_rating: 8, services_filter: { hboMax: true }, sort_by: 'vote_average.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Prime Video': {
    serviceKey: 'amazonPrime', popularLabel: 'Popular on Prime Video',
    subRows: [
      { label: 'Action on Prime', fetch: () => discoverMovies({ genre_id: '28', services_filter: { amazonPrime: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Drama on Prime',  fetch: () => discoverMovies({ genre_id: '18', services_filter: { amazonPrime: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'International',   fetch: () => discoverMovies({ sort_by: 'popularity.desc', services_filter: { amazonPrime: true } }).then(r => r.slice(0, 14)) },
    ],
  },
  'Paramount+': {
    serviceKey: 'paramount', popularLabel: 'Popular on Paramount+',
    subRows: [
      { label: 'Mission: Impossible', fetch: () => discoverMovies({ with_keywords: '4981', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      { label: 'Action on Paramount', fetch: () => discoverMovies({ genre_id: '28', services_filter: { paramount: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Drama on Paramount',  fetch: () => discoverMovies({ genre_id: '18', services_filter: { paramount: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Apple TV+': {
    serviceKey: 'appleTV', popularLabel: 'Popular on Apple TV+',
    subRows: [
      { label: 'Drama on Apple TV+',    fetch: () => discoverMovies({ genre_id: '18', services_filter: { appleTV: true }, sort_by: 'vote_average.desc', min_rating: 7 }).then(r => r.slice(0, 14)) },
      { label: 'Sci-Fi on Apple TV+',   fetch: () => discoverMovies({ genre_id: '878', services_filter: { appleTV: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Thriller on Apple TV+', fetch: () => discoverMovies({ genre_id: '53', services_filter: { appleTV: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Peacock': {
    serviceKey: 'peacock', popularLabel: 'Popular on Peacock',
    subRows: [
      { label: 'Comedy on Peacock', fetch: () => discoverMovies({ genre_id: '35', services_filter: { peacock: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Horror on Peacock', fetch: () => discoverMovies({ genre_id: '27', services_filter: { peacock: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Action on Peacock', fetch: () => discoverMovies({ genre_id: '28', services_filter: { peacock: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
};

const MOBILE_GENRE_ROWS = [
  { label: 'Trending on Your Services', filters: { sort_by: 'popularity.desc' } },
  { label: 'New Arrivals',              filters: { sort_by: 'release_date.desc', min_rating: 5 } },
  { label: 'Drama',                     filters: { genre_id: '18', sort_by: 'vote_average.desc', min_rating: 7 } },
  { label: 'Horror',                    filters: { genre_id: '27', sort_by: 'popularity.desc' } },
  { label: 'Thriller',                  filters: { genre_id: '53', sort_by: 'popularity.desc' } },
  { label: 'Romance',                   filters: { genre_id: '10749', sort_by: 'popularity.desc' } },
] as const;

type MobileTab = 'foryou' | 'all';

interface Props {
  heroMovie: Movie | null;
  heroReason: string;
  watchlistIds: string[];
  hasUser: boolean;
  onToggleWatchlist: (movie: Movie) => void;
  onOpenModal: (id: string, type?: 'movie' | 'show', title?: string) => void;
}

const ALL_PROVIDER_NAMES = ['Netflix', 'Disney+', 'Hulu', 'Max', 'Prime Video', 'Paramount+', 'Apple TV+', 'Peacock'];

function dedup(movies: Movie[]): Movie[] {
  const seen = new Set<string>();
  return movies.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
}

// ── Helper: mobile horizontal scroll row ──────────────────────────────────────
function MHScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex overflow-x-auto gap-3" style={{ scrollbarWidth: 'none', paddingLeft: 16, paddingRight: 16, paddingBottom: 2 }}>
      {children}
    </div>
  );
}

function MRowHeader({ label }: { label: string }) {
  return <p className="text-white font-bold text-sm px-4 mb-3 mt-5">{label}</p>;
}

function MLandscapeSkeleton() {
  return (
    <div className="flex-shrink-0 rounded-2xl bg-zinc-900 animate-pulse" style={{ width: MOBILE_LANDSCAPE_W, aspectRatio: '16/9' }} />
  );
}

function MPortraitSkeleton({ count = 4 }: { count?: number }) {
  return (
    <MHScroll>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex-shrink-0" style={{ width: 130 }}>
          <div className="rounded-xl bg-zinc-900 animate-pulse" style={{ height: 195 }} />
          <div className="mt-2 h-3 bg-zinc-800 animate-pulse rounded-full w-4/5" />
        </div>
      ))}
    </MHScroll>
  );
}

// ── Mobile For You content (provider sections + genre rows) ────────────────────
function MobileForYouContent({ onOpenModal }: { onOpenModal: (id: string, type?: 'movie' | 'show', title?: string) => void }) {
  const { recommended } = useDiscover();
  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);
  const [providerData, setProviderData] = useState<Record<string, { popular: Movie[] | null; subRows: (Movie[] | null)[] }>>({});
  const [genreRows, setGenreRows] = useState<{ label: string; movies: Movie[] | null }[]>(
    () => MOBILE_GENRE_ROWS.map(r => ({ label: r.label, movies: null }))
  );

  useEffect(() => {
    const services = getServices();
    const enabled = Object.fromEntries(Object.entries(services).filter(([, v]) => v));
    const names = Object.keys(PROVIDER_FOR_YOU).filter(name => enabled[PROVIDER_FOR_YOU[name].serviceKey]);
    setEnabledProviders(names);

    // Init provider data structure
    const initial: Record<string, { popular: Movie[] | null; subRows: (Movie[] | null)[] }> = {};
    names.forEach(name => { initial[name] = { popular: null, subRows: PROVIDER_FOR_YOU[name].subRows.map(() => null) }; });
    setProviderData(initial);

    names.forEach(name => {
      const config = PROVIDER_FOR_YOU[name];
      discoverMovies({ services_filter: { [config.serviceKey]: true }, sort_by: 'popularity.desc' })
        .then(r => setProviderData(prev => ({ ...prev, [name]: { ...prev[name], popular: r.slice(0, 14) } })))
        .catch(() => setProviderData(prev => ({ ...prev, [name]: { ...prev[name], popular: [] } })));

      config.subRows.forEach((row, i) => {
        row.fetch()
          .then(movies => setProviderData(prev => {
            const pd = prev[name] ?? { popular: null, subRows: [] };
            const next = [...pd.subRows];
            next[i] = movies;
            return { ...prev, [name]: { ...pd, subRows: next } };
          }))
          .catch(() => setProviderData(prev => {
            const pd = prev[name] ?? { popular: null, subRows: [] };
            const next = [...pd.subRows];
            next[i] = [];
            return { ...prev, [name]: { ...pd, subRows: next } };
          }));
      });
    });

    if (!Object.keys(enabled).length) return;
    MOBILE_GENRE_ROWS.forEach(({ label, filters }, i) => {
      discoverMovies({ ...filters, services_filter: enabled, watch_region: 'US' } as Parameters<typeof discoverMovies>[0])
        .then(movies => setGenreRows(prev => { const next = [...prev]; next[i] = { label, movies: movies.slice(0, 14) }; return next; }))
        .catch(() => setGenreRows(prev => { const next = [...prev]; next[i] = { label, movies: [] }; return next; }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Recommended across services */}
      {(recommended?.length ?? 0) > 0 && (
        <>
          <MRowHeader label="Recommended For You" />
          <MHScroll>
            {(recommended ?? []).map(m => (
              <LandscapeCard key={m.id} movie={m} width={MOBILE_LANDSCAPE_W} onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)} />
            ))}
          </MHScroll>
        </>
      )}

      {/* Per-provider sections */}
      {enabledProviders.map(name => {
        const config = PROVIDER_FOR_YOU[name];
        const pd = providerData[name];
        const logo = PROVIDER_LOGOS[name];
        return (
          <section key={name} className="mt-2">
            {/* Provider banner */}
            <div className="mx-4 rounded-2xl flex items-center gap-3 px-3.5 py-2.5 mb-3 mt-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {logo && <img src={logo} alt={name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />}
              <div>
                <p className="text-white font-bold text-sm leading-none">{name}</p>
                <p className="text-zinc-500 text-xs mt-0.5">What's on right now</p>
              </div>
            </div>

            <MRowHeader label={config.popularLabel} />
            {!pd || pd.popular === null ? (
              <MHScroll><MLandscapeSkeleton /><MLandscapeSkeleton /></MHScroll>
            ) : pd.popular.length > 0 ? (
              <MHScroll>
                {pd.popular.map(m => (
                  <LandscapeCard key={m.id} movie={m} width={MOBILE_LANDSCAPE_W} onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)} />
                ))}
              </MHScroll>
            ) : null}

            {config.subRows.map((row, i) => (
              <div key={row.label}>
                <MRowHeader label={row.label} />
                {!pd || pd.subRows[i] === null ? (
                  <MPortraitSkeleton count={4} />
                ) : (pd.subRows[i]?.length ?? 0) > 0 ? (
                  <MHScroll>
                    {(pd.subRows[i] ?? []).map(m => (
                      <PortraitCard key={m.id} movie={m} width={130} onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)} />
                    ))}
                  </MHScroll>
                ) : null}
              </div>
            ))}
          </section>
        );
      })}

      {/* Cross-service genre rows */}
      {genreRows.map(({ label, movies }) => (
        <div key={label}>
          <MRowHeader label={label} />
          {movies === null ? (
            <MPortraitSkeleton count={4} />
          ) : movies.length > 0 ? (
            <MHScroll>
              {movies.map(m => (
                <PortraitCard key={m.id} movie={m} width={130} onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)} />
              ))}
            </MHScroll>
          ) : null}
        </div>
      ))}
    </>
  );
}

export function MobileDiscoverView({ heroMovie, heroReason, watchlistIds, hasUser, onToggleWatchlist, onOpenModal }: Props) {
  const {
    trendingMovies, newReleases, topRated, classics,
    actionMovies, comedyMovies, horrorMovies, scifiMovies, acclaimed,
    recommended,
  } = useDiscover();

  const navigate = useNavigate();
  const [tab, setTab] = useState<MobileTab>('foryou');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [allProvider, setAllProvider] = useState('All');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToFullSearch = useCallback(() => {
    if (!query.trim()) return;
    setSearchFocused(false);
    navigate(`/home/search?q=${encodeURIComponent(query.trim())}`);
  }, [query, navigate]);

  // Swipeable hero state
  const heroMovies = dedup([
    ...(recommended ?? []).slice(0, 3),
    ...(trendingMovies ?? []).slice(0, 4),
  ]).filter(Boolean).slice(0, 5);
  const [heroIdx, setHeroIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const handleHeroTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || heroMovies.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setHeroIdx(i => (i + 1) % heroMovies.length);
      else setHeroIdx(i => (i - 1 + heroMovies.length) % heroMovies.length);
    }
    touchStartX.current = null;
  };

  const activeHero = heroMovies[heroIdx] ?? heroMovie;

  // Debounced real API search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(() => {
      searchMovies(query.trim()).then(r => setSearchResults(r.slice(0, 8))).catch(() => setSearchResults([]));
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);


  // Pool for Browse tab provider filter
  const allMovies = dedup([
    ...(trendingMovies ?? []),
    ...(newReleases ?? []),
    ...(topRated ?? []),
    ...(recommended ?? []),
    ...(actionMovies ?? []),
    ...(comedyMovies ?? []),
    ...(horrorMovies ?? []),
    ...(scifiMovies ?? []),
    ...(acclaimed ?? []),
    ...(classics ?? []),
  ]);

  // All tab: when a provider is selected show filtered grid, otherwise show sections
  const providerFiltered = allProvider === 'All'
    ? []
    : allMovies.filter(m => m.streamingService === allProvider);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="pb-6">
      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-20 px-4 pb-3 pt-2"
        style={{ background: 'linear-gradient(to bottom, #0A0A0A 82%, transparent)', backdropFilter: 'blur(12px)' }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black tracking-tight text-white">Discover</h1>
        </div>

        {/* Search bar */}
        <div className="relative">
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all"
            style={{
              background: searchFocused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)',
              border: searchFocused ? '1px solid color-mix(in srgb, var(--reel-accent-hex) 60%, transparent)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: searchFocused ? '0 0 0 3px color-mix(in srgb, var(--reel-accent-hex) 14%, transparent)' : 'none',
            }}
          >
            <Search
              className="w-4 h-4 flex-shrink-0 transition-colors"
              style={{ color: searchFocused ? 'var(--reel-accent-hex)' : 'rgba(255,255,255,0.3)' }}
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter') goToFullSearch(); }}
              placeholder="Search movies, shows, genres…"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
            />
            {query.length > 0 && (
              <button
                onClick={clearSearch}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform duration-100"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {searchFocused && query.length > 1 && (
            <div
              className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' }}
            >
              <div className="px-4 pt-3 pb-2">
                <span className="text-xs text-white/30">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </span>
              </div>
              {searchResults.length > 0 ? searchResults.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-white/[0.04]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => { setQuery(''); setSearchFocused(false); onOpenModal(m.id, m.type ?? 'movie', m.title); }}
                >
                  <div className="relative rounded-xl overflow-hidden flex-shrink-0" style={{ width: 44, height: 66 }}>
                    {m.poster
                      ? <img src={m.poster} alt={m.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-zinc-800" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{m.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{m.year} · {m.genres[0] ?? ''}</p>
                    {m.streamingService && (
                      <span
                        className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1"
                        style={{
                          background: (PLATFORM_COLORS[m.streamingService] ?? '#6b7280') + '33',
                          color: PLATFORM_COLORS[m.streamingService] ?? '#9ca3af',
                          border: `1px solid ${(PLATFORM_COLORS[m.streamingService] ?? '#6b7280')}55`,
                        }}
                      >
                        {m.streamingService}
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-white/30 text-sm">No results for "{query}"</p>
                </div>
              )}
              {/* See all results row */}
              {query.trim().length > 1 && (
                <button
                  onMouseDown={goToFullSearch}
                  className="w-full flex items-center justify-between px-4 py-3 border-t active:bg-white/[0.04] transition-colors"
                  style={{ borderTopColor: 'rgba(255,255,255,0.06)' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--reel-accent-hex)' }}>
                    See all results for "{query.trim()}"
                  </span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--reel-accent-hex)' }} />
                </button>
              )}
              <div className="h-1" />
            </div>
          )}
        </div>

        {/* For You / All tab toggle */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(['foryou', 'all'] as MobileTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
              style={{
                background: tab === t ? 'white' : 'rgba(255,255,255,0.07)',
                color: tab === t ? '#0A0A0A' : 'rgba(255,255,255,0.5)',
                border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {t === 'foryou' ? 'For You' : 'Browse'}
            </button>
          ))}

          {/* Provider filter pills — only on All/Browse tab */}
          {tab === 'all' && (
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {['All', ...ALL_PROVIDER_NAMES.filter(p => PROVIDER_LOGOS[p])].map(p => {
                const color = PLATFORM_COLORS[p] ?? 'var(--reel-accent-hex)';
                const isActive = allProvider === p;
                return (
                  <button
                    key={p}
                    onClick={() => setAllProvider(p)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                    style={{
                      background: isActive ? (p === 'All' ? 'white' : color + '33') : 'rgba(255,255,255,0.07)',
                      color: isActive ? (p === 'All' ? '#0A0A0A' : color) : 'rgba(255,255,255,0.5)',
                      border: isActive && p !== 'All' ? `1px solid ${color}55` : isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {p !== 'All' && PROVIDER_LOGOS[p] && (
                      <img src={PROVIDER_LOGOS[p]} alt={p} className="w-3.5 h-3.5 rounded-sm flex-shrink-0 object-cover" />
                    )}
                    {p}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── FOR YOU TAB ── */}
      {tab === 'foryou' && (
        <div className="pb-8">
          {/* Swipeable hero carousel */}
          {activeHero && (
            <div className="mb-2">
              <div onTouchStart={handleHeroTouchStart} onTouchEnd={handleHeroTouchEnd}>
                <FeaturedCard
                  movie={activeHero}
                  reason={heroReason}
                  isInWatchlist={watchlistIds.includes(activeHero.id)}
                  hasUser={hasUser}
                  onToggleWatchlist={() => onToggleWatchlist(activeHero)}
                  onOpenModal={() => onOpenModal(activeHero.id, activeHero.type ?? 'movie', activeHero.title)}
                />
              </div>
              {/* Dot indicators */}
              {heroMovies.length > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-3">
                  {heroMovies.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIdx(i)}
                      className="flex items-center justify-center py-3 -my-3 px-1 -mx-1"
                      aria-label={`Go to slide ${i + 1}`}
                    >
                      <span
                        className="block rounded-full transition-all duration-300"
                        style={{
                          width: i === heroIdx ? 20 : 6,
                          height: 3,
                          background: i === heroIdx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <MobileForYouContent onOpenModal={onOpenModal} />
        </div>
      )}

      {/* ── BROWSE TAB ── */}
      {tab === 'all' && (
        <div className="pb-8">
          {allProvider === 'All' ? (
            /* No provider selected — show categorized sections */
            <>
              <SectionRow
                label="Trending Now"
                movies={trendingMovies}
                getReasonText={() => 'Trending this week'}
                onMovieClick={onOpenModal}
              />
              <SectionRow
                label="New Releases"
                movies={newReleases}
                getReasonText={m => `New on ${m.streamingService || 'streaming'}`}
                onMovieClick={onOpenModal}
              />
              <SectionRow
                label="Top Rated"
                movies={topRated}
                getReasonText={() => 'Highest rated'}
                onMovieClick={onOpenModal}
              />
              <SectionRow
                label="Action"
                movies={actionMovies}
                getReasonText={() => 'High-octane picks'}
                onMovieClick={onOpenModal}
              />
              <SectionRow
                label="Comedy"
                movies={comedyMovies}
                getReasonText={() => 'Because you like to laugh'}
                onMovieClick={onOpenModal}
              />
              <SectionRow
                label="Sci-Fi & Fantasy"
                movies={scifiMovies}
                getReasonText={() => 'Top sci-fi picks'}
                onMovieClick={onOpenModal}
              />
              <SectionRow
                label="Horror"
                movies={horrorMovies}
                getReasonText={() => 'If you dare'}
                onMovieClick={onOpenModal}
              />
              <SectionRow
                label="Critically Acclaimed"
                movies={acclaimed}
                getReasonText={() => 'Award-winning films'}
                onMovieClick={onOpenModal}
              />
              <SectionRow
                label="Timeless Classics"
                movies={classics}
                getReasonText={() => 'A timeless pick'}
                onMovieClick={onOpenModal}
              />
            </>
          ) : (
            /* Provider selected — show filtered grid */
            <div className="px-4 mt-4 grid grid-cols-2 gap-3">
              {providerFiltered.map(m => (
                <div
                  key={m.id}
                  className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-150"
                  style={{ height: 220 }}
                  onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)}
                >
                  {m.poster ? (
                    <img src={m.poster} alt={m.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                  {PROVIDER_LOGOS[m.streamingService] && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-sm overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <img src={PROVIDER_LOGOS[m.streamingService]} alt={m.streamingService} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white font-bold text-xs leading-tight line-clamp-2">{m.title}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{m.year} · {m.genres[0] ?? ''}</p>
                  </div>
                </div>
              ))}
              {providerFiltered.length === 0 && (
                <div className="col-span-2 py-16 text-center text-zinc-600 text-sm">No titles found.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
