import { useState, useEffect } from 'react';
import type { WatchedMovie, RouletteSpin } from '../services/api';
import { getPersonPhoto } from '../services/api';
import { PROVIDER_LOGOS } from '../constants/providers';

interface Props {
  movies: WatchedMovie[];
  recentSpins?: RouletteSpin[];
  onMovieClick?: (movieId: string) => void;
}

const ACCENT = '#f97316';

const PLATFORM_COLORS: Record<string, string> = {
  'Netflix':            '#E50914',
  'Max':                '#9933CC',
  'Disney+':            '#113CCF',
  'Disney Plus':        '#113CCF',
  'Prime Video':        '#00A8E1',
  'Amazon Prime Video': '#00A8E1',
  'Apple TV+':          '#888888',
  'Apple TV Plus':      '#888888',
  'Paramount+':         '#0064FF',
  'Paramount Plus':     '#0064FF',
  'Peacock':            '#0057E9',
  'Hulu':               '#1CE783',
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function deriveTags(topGenres: [string, number][], totalMovies: number): string[] {
  const tags: string[] = [];
  const top = topGenres.slice(0, 4).map((g) => g[0]);
  if (top.includes('Action') && top.includes('Adventure')) tags.push('Blockbuster Fan');
  else if (top.includes('Action')) tags.push('Action Lover');
  if (top.includes('Horror')) tags.push('Thrill Seeker');
  if (top.includes('Drama')) tags.push('Story-Driven');
  if (top.includes('Comedy')) tags.push('Light-Hearted');
  if (top.includes('Science Fiction') || top.includes('Fantasy')) tags.push('Sci-Fi Explorer');
  if (top.includes('Animation')) tags.push('Animation Lover');
  if (top.includes('Documentary')) tags.push('Knowledge Seeker');
  if (top.includes('Romance')) tags.push('Hopeless Romantic');
  if (top.includes('Thriller') || top.includes('Mystery')) tags.push('Suspense Junkie');
  if (top.includes('Crime')) tags.push('Crime Aficionado');
  if (top.includes('History') || top.includes('War')) tags.push('History Buff');
  if (totalMovies >= 50) tags.push('Cinephile');
  else if (totalMovies >= 20) tags.push('Movie Buff');
  else if (totalMovies >= 10) tags.push('Film Fan');
  return tags.slice(0, 5);
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full" style={{ backgroundColor: '#1f1f1f' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }} />
    </div>
  );
}

function PersonCard({ name, count, photo, rank }: { name: string; count: number; photo: string | null | undefined; rank: number }) {
  return (
    <div className="relative flex flex-col items-center text-center gap-3 rounded-xl p-4 border border-[#1f1f1f]" style={{ backgroundColor: '#0d0d0d' }}>
      <span
        className="absolute top-2 right-2 text-xs font-bold"
        style={{ color: rank === 1 ? ACCENT : '#6b7280' }}
      >
        #{rank}
      </span>
      {photo ? (
        <img
          src={photo}
          alt={name}
          className="w-24 h-24 rounded-full object-cover object-top"
          style={{ border: `3px solid ${rank === 1 ? ACCENT : '#2a2a2a'}` }}
          loading="lazy"
        />
      ) : (
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold"
          style={{
            backgroundColor: '#1a1a1a',
            border: `3px solid ${rank === 1 ? ACCENT : '#2a2a2a'}`,
            color: rank === 1 ? ACCENT : '#6b7280',
          }}
        >
          {initials(name)}
        </div>
      )}
      <div className="min-w-0 w-full">
        <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{name}</p>
        <p className="text-gray-500 text-xs mt-0.5">{count} film{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}

export function StatsTab({ movies, recentSpins = [], onMovieClick }: Props) {
  const [photoMap, setPhotoMap] = useState<Record<string, string | null>>({});

  // ── Derived stats ───────────────────────────────────────────────
  const top10 = [...movies]
    .sort((a, b) => b.user_rating - a.user_rating || b.tmdb_rating - a.tmdb_rating)
    .slice(0, 10);

  const actorCounts: Record<string, number> = {};
  movies.forEach((m) => (m.actors ?? []).forEach((a) => { if (a) actorCounts[a] = (actorCounts[a] || 0) + 1; }));
  const topActors = Object.entries(actorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  

  const directorCounts: Record<string, number> = {};
  movies.forEach((m) => { if (m.director) directorCounts[m.director] = (directorCounts[m.director] || 0) + 1; });
  const topDirectors = Object.entries(directorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const genreCounts: Record<string, number> = {};
  movies.forEach((m) => (m.genres ?? []).forEach((g) => { if (g) genreCounts[g] = (genreCounts[g] || 0) + 1; }));
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const maxGenreCount = topGenres[0]?.[1] ?? 1;

  const decadeCounts: Record<string, number> = {};
  movies.forEach((m) => {
    if (!m.year) return;
    const decade = `${Math.floor(Number(m.year) / 10) * 10}s`;
    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
  });
  const decades = Object.entries(decadeCounts).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDecade = Math.max(...decades.map((d) => d[1]), 1);

  const platformCounts: Record<string, number> = {};
  movies.forEach((m) => (m.services ?? []).forEach((s) => { if (s) platformCounts[s] = (platformCounts[s] || 0) + 1; }));
  const topPlatforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxPlatform = topPlatforms[0]?.[1] ?? 1;

  const avgRating = (movies.reduce((s, m) => s + (m.user_rating ?? 0), 0) / movies.length).toFixed(1);
  const topGenreName = topGenres[0]?.[0] ?? '—';
  const tags = deriveTags(topGenres, movies.length);

  const watchedIds = new Set(movies.map((m) => m.movie_id));
  const spinWatchPct = recentSpins.length > 0
    ? Math.round((recentSpins.filter((s) => watchedIds.has(s.movie_id)).length / recentSpins.length) * 100)
    : null;

  // ── Fetch actor/director profile photos ─────────────────────────
  useEffect(() => {
    if (movies.length === 0) return;
    const actorNames = Object.entries(actorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
    const directorNames = Object.entries(directorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
    const unique = [...new Set([...actorNames, ...directorNames])];
    Promise.all(
      unique.map(async (name) => [name, await getPersonPhoto(name)] as [string, string | null])
    ).then((results) => setPhotoMap(Object.fromEntries(results)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  if (movies.length === 0) {
    return <div className="text-gray-500 text-center py-16">Watch some movies to see your stats!</div>;
  }

  return (
    <div className="space-y-5 pb-8">

      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Movies Watched', value: String(movies.length) },
          { label: 'Avg Your Rating', value: avgRating, accent: true },
          { label: 'Top Genre', value: topGenreName },
          { label: 'Unique Directors', value: String(Object.keys(directorCounts).length) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4 border border-[#1f1f1f]" style={{ backgroundColor: '#111' }}>
            <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
            <p className="text-2xl font-bold leading-tight" style={{ color: stat.accent ? ACCENT : 'white' }}>{stat.value}</p>
          </div>
        ))}
        {spinWatchPct !== null && (
          <div className="rounded-xl p-4 border border-[#1f1f1f] col-span-2 md:col-span-4" style={{ backgroundColor: '#111' }}>
            <p className="text-gray-500 text-xs mb-1">Watched from Last {recentSpins.length} Spins</p>
            <div className="flex items-end gap-3">
              <p className="text-2xl font-bold leading-tight" style={{ color: ACCENT }}>{spinWatchPct}%</p>
              <p className="text-gray-500 text-sm mb-0.5">{recentSpins.filter((s) => watchedIds.has(s.movie_id)).length} of {recentSpins.length} actually watched</p>
            </div>
            <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: '#1f1f1f' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(spinWatchPct, 2)}%`, backgroundColor: ACCENT }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Taste profile ──────────────────────────────────────── */}
      {tags.length > 0 && (
        <div className="rounded-xl p-5 border border-[#1f1f1f]" style={{ backgroundColor: '#111' }}>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Taste Profile</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-sm font-semibold text-black" style={{ backgroundColor: ACCENT }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Top 10 — horizontal poster scroll ──────────────────── */}
      <div className="rounded-xl p-5 border border-[#1f1f1f]" style={{ backgroundColor: '#111' }}>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Top 10 Highest Rated</p>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {top10.map((m, i) => (
            <button
              key={m.movie_id}
              onClick={() => onMovieClick?.(m.movie_id)}
              className="shrink-0 w-48 text-left group focus:outline-none"
              disabled={!onMovieClick}
            >
              <div className="relative rounded-xl overflow-hidden bg-[#1A1A1A] border border-[#2A2A2A] group-hover:border-[#f97316]/50 transition-colors">
                {m.poster ? (
                  <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full aspect-[2/3] flex items-center justify-center" style={{ backgroundColor: '#1f1f1f' }}>
                    <span className="text-gray-600 text-sm text-center px-3">{m.title}</span>
                  </div>
                )}
                <div
                  className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-black"
                  style={{ backgroundColor: ACCENT }}
                >
                  {i + 1}
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/90 to-transparent">
                  <span className="text-white font-bold">{m.user_rating}</span>
                  <span className="text-gray-400 text-sm">/10</span>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-white text-sm font-medium leading-snug line-clamp-1">{m.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{m.year}{m.genres?.[0] ? ` · ${m.genres[0]}` : ''}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Top actors + directors — 2×2 grid cards ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topActors.length > 0 && (
          <div className="rounded-xl p-5 border border-[#1f1f1f]" style={{ backgroundColor: '#111' }}>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Most Watched Actor</p>
            <div className="grid grid-cols-2 gap-3">
              {topActors.map(([name, count], idx) => (
                <PersonCard key={name} name={name} count={count} photo={photoMap[name]} rank={idx + 1} />
              ))}
            </div>
          </div>
        )}

        {topDirectors.length > 0 && (
          <div className="rounded-xl p-5 border border-[#1f1f1f]" style={{ backgroundColor: '#111' }}>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Most Watched Director</p>
            <div className="grid grid-cols-2 gap-3">
              {topDirectors.map(([name, count], idx) => (
                <PersonCard key={name} name={name} count={count} photo={photoMap[name]} rank={idx + 1} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Genre breakdown ────────────────────────────────────── */}
      {topGenres.length > 0 && (
        <div className="rounded-xl p-5 border border-[#1f1f1f]" style={{ backgroundColor: '#111' }}>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Genre Breakdown</p>
          <div className="space-y-3">
            {topGenres.slice(0, 8).map(([genre, count]) => {
              const pct = Math.round((count / movies.length) * 100);
              const barPct = Math.round((count / maxGenreCount) * 100);
              return (
                <div key={genre}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-200">{genre}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <Bar pct={barPct} color={ACCENT} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Decade + Platform ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decades.length > 0 && (
          <div className="rounded-xl p-5 border border-[#1f1f1f]" style={{ backgroundColor: '#111' }}>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">By Decade</p>
            <div className="space-y-3">
              {decades.map(([decade, count]) => (
                <div key={decade}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-200">{decade}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <Bar pct={Math.round((count / maxDecade) * 100)} color="#60a5fa" />
                </div>
              ))}
            </div>
          </div>
        )}

        {topPlatforms.length > 0 && (
          <div className="rounded-xl p-5 border border-[#1f1f1f]" style={{ backgroundColor: '#111' }}>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Most Watched On</p>
            <div className="space-y-3">
              {topPlatforms.map(([platform, count]) => {
                const barPct = Math.round((count / maxPlatform) * 100);
                const color = PLATFORM_COLORS[platform] ?? ACCENT;
                return (
                  <div key={platform}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        {PROVIDER_LOGOS[platform] && (
                          <img src={PROVIDER_LOGOS[platform]} alt={platform} className="w-4 h-4 rounded object-cover" />
                        )}
                        <span className="text-gray-200">{platform}</span>
                      </div>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <Bar pct={barPct} color={color} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
