import { useEffect, useState } from 'react';
import type { Movie } from '../services/api';
import { getServices, discoverMovies } from '../services/api';
import { useDiscover } from '../contexts/DiscoverContext';
import { SectionRow } from './SectionRow';
import { LandscapeCard } from './LandscapeCard';
import { PortraitCard } from './PortraitCard';
import { PROVIDER_LOGOS } from '../constants/providers';

// ── Per-provider curated row definitions ──────────────────────────────────────
const PROVIDER_FOR_YOU: Record<string, {
  serviceKey: string;
  popularLabel: string;
  subRows: Array<{ label: string; fetch: () => Promise<Movie[]> }>;
}> = {
  'Netflix': {
    serviceKey: 'netflix',
    popularLabel: 'Popular on Netflix',
    subRows: [
      { label: 'Action on Netflix',   fetch: () => discoverMovies({ genre_id: '28', services_filter: { netflix: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Comedy on Netflix',   fetch: () => discoverMovies({ genre_id: '35', services_filter: { netflix: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Thriller on Netflix', fetch: () => discoverMovies({ genre_id: '53', services_filter: { netflix: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Disney+': {
    serviceKey: 'disneyPlus',
    popularLabel: 'Popular on Disney+',
    subRows: [
      // with_companies: 420 = Marvel Studios; with_keywords: 180547 = "marvel cinematic universe"
      { label: 'Marvel',          fetch: () => discoverMovies({ with_companies: '420', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      // with_keywords: 161176 = "star wars" — more precise than Lucasfilm company (which includes Indiana Jones)
      { label: 'Star Wars',       fetch: () => discoverMovies({ with_keywords: '161176', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      // with_companies: 3 = Pixar Animation Studios
      { label: 'Pixar',           fetch: () => discoverMovies({ with_companies: '3', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      // with_companies: 2 = Walt Disney Pictures, older classics
      { label: 'Disney Classics', fetch: () => discoverMovies({ with_companies: '2', year_to: '2000', sort_by: 'vote_average.desc', min_rating: 6 } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
    ],
  },
  'Hulu': {
    serviceKey: 'hulu',
    popularLabel: 'Popular on Hulu',
    subRows: [
      { label: 'Horror on Hulu',  fetch: () => discoverMovies({ genre_id: '27', services_filter: { hulu: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Comedy on Hulu',  fetch: () => discoverMovies({ genre_id: '35', services_filter: { hulu: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Sci-Fi on Hulu',  fetch: () => discoverMovies({ genre_id: '878', services_filter: { hulu: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Max': {
    serviceKey: 'hboMax',
    popularLabel: 'Popular on Max',
    subRows: [
      // with_companies: 9993 = DC Films, 128064 = DC Entertainment
      { label: 'DC Universe',        fetch: () => discoverMovies({ with_companies: '9993|128064', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      { label: 'Drama on Max',       fetch: () => discoverMovies({ genre_id: '18', services_filter: { hboMax: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Top Picks on Max',   fetch: () => discoverMovies({ min_rating: 8, services_filter: { hboMax: true }, sort_by: 'vote_average.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Prime Video': {
    serviceKey: 'amazonPrime',
    popularLabel: 'Popular on Prime Video',
    subRows: [
      { label: 'Action on Prime',    fetch: () => discoverMovies({ genre_id: '28', services_filter: { amazonPrime: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Drama on Prime',     fetch: () => discoverMovies({ genre_id: '18', services_filter: { amazonPrime: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'International',      fetch: () => discoverMovies({ sort_by: 'popularity.desc', services_filter: { amazonPrime: true } }).then(r => r.slice(0, 14)) },
    ],
  },
  'Paramount+': {
    serviceKey: 'paramount',
    popularLabel: 'Popular on Paramount+',
    subRows: [
      // with_keywords: 4981 = "mission impossible"
      { label: 'Mission: Impossible', fetch: () => discoverMovies({ with_keywords: '4981', sort_by: 'popularity.desc' } as Parameters<typeof discoverMovies>[0]).then(r => r.slice(0, 14)) },
      { label: 'Action on Paramount', fetch: () => discoverMovies({ genre_id: '28', services_filter: { paramount: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Drama on Paramount',  fetch: () => discoverMovies({ genre_id: '18', services_filter: { paramount: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Apple TV+': {
    serviceKey: 'appleTV',
    popularLabel: 'Popular on Apple TV+',
    subRows: [
      { label: 'Drama on Apple TV+',    fetch: () => discoverMovies({ genre_id: '18', services_filter: { appleTV: true }, sort_by: 'vote_average.desc', min_rating: 7 }).then(r => r.slice(0, 14)) },
      { label: 'Sci-Fi on Apple TV+',   fetch: () => discoverMovies({ genre_id: '878', services_filter: { appleTV: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Thriller on Apple TV+', fetch: () => discoverMovies({ genre_id: '53', services_filter: { appleTV: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
  'Peacock': {
    serviceKey: 'peacock',
    popularLabel: 'Popular on Peacock',
    subRows: [
      { label: 'Comedy on Peacock', fetch: () => discoverMovies({ genre_id: '35', services_filter: { peacock: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Horror on Peacock', fetch: () => discoverMovies({ genre_id: '27', services_filter: { peacock: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
      { label: 'Action on Peacock', fetch: () => discoverMovies({ genre_id: '28', services_filter: { peacock: true }, sort_by: 'popularity.desc' }).then(r => r.slice(0, 14)) },
    ],
  },
};

// ── Cross-service genre rows ───────────────────────────────────────────────────
const GENRE_ROWS = [
  { label: 'Trending on Your Services', filters: { sort_by: 'popularity.desc' } },
  { label: 'New Arrivals',              filters: { sort_by: 'release_date.desc', min_rating: 5 } },
  { label: 'Drama',                     filters: { genre_id: '18', sort_by: 'vote_average.desc', min_rating: 7 } },
  { label: 'Horror',                    filters: { genre_id: '27', sort_by: 'popularity.desc' } },
  { label: 'Thriller',                  filters: { genre_id: '53', sort_by: 'popularity.desc' } },
  { label: 'Romance',                   filters: { genre_id: '10749', sort_by: 'popularity.desc' } },
] as const;

// ── Helper: horizontal scroll row ─────────────────────────────────────────────
function HScroll({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div
      className="flex overflow-x-auto"
      style={{ gap, scrollbarWidth: 'none', paddingLeft: 20, paddingRight: 20, paddingBottom: 2 }}
    >
      {children}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function RowHeader({ label, providerName }: { label: string; providerName?: string }) {
  const logo = providerName ? PROVIDER_LOGOS[providerName] : null;
  return (
    <div className="flex items-center justify-between px-5 mb-3 mt-5">
      <div className="flex items-center gap-2">
        {logo && <img src={logo} alt={providerName} className="w-5 h-5 rounded-md object-cover flex-shrink-0" />}
        <span className="text-white font-bold text-sm">{label}</span>
      </div>
    </div>
  );
}

// ── Skeleton placeholders ──────────────────────────────────────────────────────
function LandscapeSkeletons({ count = 3 }: { count?: number }) {
  return (
    <HScroll>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 rounded-2xl bg-zinc-900 animate-pulse"
          style={{ width: 'min(360px, 85vw)', aspectRatio: '16/9' }}
        />
      ))}
    </HScroll>
  );
}

function PortraitSkeletons({ count = 5 }: { count?: number }) {
  return (
    <HScroll>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex-shrink-0" style={{ width: 148 }}>
          <div className="rounded-2xl bg-zinc-900 animate-pulse" style={{ height: 222 }} />
          <div className="mt-2.5 h-3 bg-zinc-800 animate-pulse rounded-full w-4/5" />
        </div>
      ))}
    </HScroll>
  );
}

// ── Per-provider section ───────────────────────────────────────────────────────
function ProviderSection({
  providerName,
  onOpenModal,
}: {
  providerName: string;
  onOpenModal: (id: string, type?: 'movie' | 'show', title?: string) => void;
}) {
  const config = PROVIDER_FOR_YOU[providerName];
  const [popular, setPopular] = useState<Movie[] | null>(null);
  const [subMovies, setSubMovies] = useState<(Movie[] | null)[]>(() => config.subRows.map(() => null));

  useEffect(() => {
    discoverMovies({ services_filter: { [config.serviceKey]: true }, sort_by: 'popularity.desc' })
      .then(r => setPopular(r.slice(0, 14)))
      .catch(() => setPopular([]));

    config.subRows.forEach((row, i) => {
      row.fetch()
        .then(movies => setSubMovies(prev => { const next = [...prev]; next[i] = movies; return next; }))
        .catch(() => setSubMovies(prev => { const next = [...prev]; next[i] = []; return next; }));
    });
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const logo = PROVIDER_LOGOS[providerName];

  return (
    <section className="mt-2">
      {/* Provider banner */}
      <div
        className="mx-5 rounded-2xl flex items-center gap-3 px-4 py-3 mb-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {logo && <img src={logo} alt={providerName} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />}
        <div>
          <p className="text-white font-bold text-sm leading-none">{providerName}</p>
          <p className="text-zinc-500 text-xs mt-0.5">What's on right now</p>
        </div>
      </div>

      {/* Popular — landscape cards */}
      <RowHeader label={config.popularLabel} providerName={providerName} />
      {popular === null ? (
        <LandscapeSkeletons count={3} />
      ) : popular.length > 0 ? (
        <HScroll>
          {popular.map(m => (
            <LandscapeCard key={m.id} movie={m} onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)} />
          ))}
        </HScroll>
      ) : null}

      {/* Sub-category rows — portrait cards */}
      {config.subRows.map((row, i) => (
        <div key={row.label}>
          <RowHeader label={row.label} />
          {subMovies[i] === null ? (
            <PortraitSkeletons count={5} />
          ) : (subMovies[i]?.length ?? 0) > 0 ? (
            <HScroll>
              {(subMovies[i] ?? []).map(m => (
                <PortraitCard key={m.id} movie={m} onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)} />
              ))}
            </HScroll>
          ) : null}
        </div>
      ))}
    </section>
  );
}

// ── Main ForYouView ────────────────────────────────────────────────────────────
interface Props {
  onOpenModal: (id: string, type?: 'movie' | 'show', title?: string) => void;
}

export function ForYouView({ onOpenModal }: Props) {
  const { recommended, trendingMovies, newReleases, classics, topRated } = useDiscover();
  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);
  const [genreRows, setGenreRows] = useState<{ label: string; movies: Movie[] | null }[]>(
    () => GENRE_ROWS.map(r => ({ label: r.label, movies: null }))
  );

  useEffect(() => {
    const services = getServices();
    const enabled = Object.fromEntries(Object.entries(services).filter(([, v]) => v));
    const names = Object.keys(PROVIDER_FOR_YOU).filter(name => {
      const key = PROVIDER_FOR_YOU[name].serviceKey;
      return enabled[key];
    });
    setEnabledProviders(names);

    if (!Object.keys(enabled).length) return;

    GENRE_ROWS.forEach(({ label, filters }, i) => {
      discoverMovies({ ...filters, services_filter: enabled, watch_region: 'US' } as Parameters<typeof discoverMovies>[0])
        .then(movies => setGenreRows(prev => {
          const next = [...prev];
          next[i] = { label, movies: movies.slice(0, 14) };
          return next;
        }))
        .catch(() => setGenreRows(prev => { const next = [...prev]; next[i] = { label, movies: [] }; return next; }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // No services saved — show general catalogue rows
  if (enabledProviders.length === 0) {
    return (
      <div className="pb-8 mt-2">
        <SectionRow label="Recommended For You" movies={recommended ?? []} getReasonText={() => 'Based on your watch history'} onMovieClick={onOpenModal} />
        <SectionRow label="Trending Now"         movies={trendingMovies}    getReasonText={() => 'Trending this week'}          onMovieClick={onOpenModal} />
        <SectionRow label="New Releases"         movies={newReleases}       getReasonText={m => `New on ${m.streamingService || 'streaming'}`} onMovieClick={onOpenModal} />
        <SectionRow label="Top Rated"            movies={topRated}          getReasonText={() => 'Highest rated'}               onMovieClick={onOpenModal} />
        <SectionRow label="Timeless Classics"    movies={classics}          getReasonText={() => 'A timeless pick'}             onMovieClick={onOpenModal} />
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Recommended across all services */}
      {(recommended?.length ?? 0) > 0 && (
        <div className="mt-4">
          <RowHeader label="Recommended For You" />
          <HScroll>
            {(recommended ?? []).map(m => (
              <LandscapeCard key={m.id} movie={m} onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)} />
            ))}
          </HScroll>
        </div>
      )}

      {/* Per-provider curated sections */}
      {enabledProviders.map(name => (
        <ProviderSection key={name} providerName={name} onOpenModal={onOpenModal} />
      ))}

      {/* Cross-service genre rows */}
      <div className="mt-6">
        <div className="px-5 mb-1">
          <p className="text-sm font-semibold text-white/50">Across your services</p>
        </div>
        {genreRows.map(({ label, movies }) => (
          <div key={label}>
            <RowHeader label={label} />
            {movies === null ? (
              <PortraitSkeletons count={5} />
            ) : movies.length > 0 ? (
              <HScroll>
                {movies.map(m => (
                  <PortraitCard key={m.id} movie={m} onClick={() => onOpenModal(m.id, m.type ?? 'movie', m.title)} />
                ))}
              </HScroll>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
