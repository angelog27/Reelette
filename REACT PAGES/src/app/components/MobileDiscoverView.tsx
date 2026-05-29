import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { Movie } from '../services/api';
import { getServices, discoverMovies, searchMovies } from '../services/api';
import { useDiscover } from '../contexts/DiscoverContext';
import { FeaturedCard } from './FeaturedCard';
import { SectionRow } from './SectionRow';
import { PLATFORM_COLORS } from './SmallCard';
import { PROVIDER_LOGOS } from '../constants/providers';

const SERVICE_CATEGORIES = [
  { label: 'Trending on Your Services', filters: { sort_by: 'popularity.desc' } },
  { label: 'New Arrivals',              filters: { sort_by: 'release_date.desc', min_rating: 5 } },
  { label: 'Action & Adventure',        filters: { genre_id: '28|12', sort_by: 'popularity.desc' } },
  { label: 'Comedy',                    filters: { genre_id: '35', sort_by: 'popularity.desc' } },
  { label: 'Horror',                    filters: { genre_id: '27', sort_by: 'popularity.desc' } },
  { label: 'Sci-Fi & Fantasy',          filters: { genre_id: '878|14', sort_by: 'popularity.desc' } },
  { label: 'Drama',                     filters: { genre_id: '18', sort_by: 'vote_average.desc', min_rating: 7 } },
  { label: 'Thriller',                  filters: { genre_id: '53', sort_by: 'popularity.desc' } },
  { label: 'Romance',                   filters: { genre_id: '10749', sort_by: 'popularity.desc' } },
  { label: 'Animation',                 filters: { genre_id: '16', sort_by: 'popularity.desc' } },
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

export function MobileDiscoverView({ heroMovie, heroReason, watchlistIds, hasUser, onToggleWatchlist, onOpenModal }: Props) {
  const {
    trendingMovies, newReleases, topRated, classics,
    actionMovies, comedyMovies, horrorMovies, scifiMovies, acclaimed,
    recommended,
  } = useDiscover();

  const [tab, setTab] = useState<MobileTab>('foryou');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [allProvider, setAllProvider] = useState('All');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [serviceRows, setServiceRows] = useState<{ label: string; movies: Movie[] }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load genre rows filtered by the user's combined services for "For You" tab
  useEffect(() => {
    const services = getServices();
    const enabled = Object.fromEntries(Object.entries(services).filter(([, v]) => v));
    if (!Object.keys(enabled).length) return;
    Promise.all(
      SERVICE_CATEGORIES.map(async ({ label, filters }) => {
        const movies = await discoverMovies({
          ...filters,
          services_filter: enabled,
          watch_region: 'US',
        } as Parameters<typeof discoverMovies>[0]).catch(() => [] as Movie[]);
        return { label, movies: movies.slice(0, 14) };
      })
    ).then(rows => setServiceRows(rows.filter(r => r.movies.length > 0)));
  }, []);

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
              border: searchFocused ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: searchFocused ? '0 0 0 3px rgba(167,139,250,0.12)' : 'none',
            }}
          >
            <Search
              className="w-4 h-4 flex-shrink-0 transition-colors"
              style={{ color: searchFocused ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search movies, shows, genres…"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
            />
            {query.length > 0 && (
              <button
                onClick={clearSearch}
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X className="w-3 h-3 text-white" />
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
                <span className="text-[10px] font-semibold tracking-widest uppercase text-white/25">
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
              <div className="h-2" />
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
                <div className="flex justify-center gap-1.5 mt-3">
                  {heroMovies.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIdx(i)}
                      className="h-[3px] rounded-full transition-all duration-300"
                      style={{
                        width: i === heroIdx ? 20 : 6,
                        background: i === heroIdx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Per-service rows — what the user can actually watch */}
          {serviceRows.map(row => (
            <SectionRow
              key={row.label}
              label={row.label}
              movies={row.movies}
              getReasonText={m => `Available on ${m.streamingService || row.label.replace('Popular on ', '')}`}
              onMovieClick={onOpenModal}
            />
          ))}

          <SectionRow
            label="Recommended For You"
            movies={recommended ?? []}
            getReasonText={() => 'Based on your services'}
            onMovieClick={onOpenModal}
          />
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
            label="Sci-Fi & Fantasy"
            movies={scifiMovies}
            getReasonText={() => 'Top sci-fi picks'}
            onMovieClick={onOpenModal}
          />
          <SectionRow
            label="Comedy"
            movies={comedyMovies}
            getReasonText={() => 'Because you like to laugh'}
            onMovieClick={onOpenModal}
          />
          <SectionRow
            label="Action"
            movies={actionMovies}
            getReasonText={() => 'High-octane picks'}
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
