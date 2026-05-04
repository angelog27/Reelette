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
  Netflix: '#E50914',
  Max: '#9933CC',
  'Disney+': '#113CCF',
  'Disney Plus': '#113CCF',
  'Prime Video': '#00A8E1',
  'Amazon Prime Video': '#00A8E1',
  'Apple TV+': '#888888',
  'Apple TV Plus': '#888888',
  'Paramount+': '#0064FF',
  'Paramount Plus': '#0064FF',
  Peacock: '#0057E9',
  Hulu: '#1CE783',
};

const panelClass =
  'rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm';

const statCardClass =
  'rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm';

const sectionTitleClass =
  'mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function deriveTags(topGenres: [string, number][], totalMovies: number): string[] {
  const tags: string[] = [];
  const top = topGenres.slice(0, 4).map((genre) => genre[0]);

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
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.max(pct, 2)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

function PersonCard({
  name,
  count,
  photo,
  rank,
}: {
  name: string;
  count: number;
  photo: string | null | undefined;
  rank: number;
}) {
  const isTopRank = rank === 1;

  return (
    <div className="relative flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 text-center">
      {isTopRank && (
        <span className="absolute right-2 top-2 text-xs font-bold text-orange-500">
          #1
        </span>
      )}

      {photo ? (
        <img
          src={photo}
          alt={name}
          className={`h-24 w-24 rounded-full object-cover object-top ${
            isTopRank ? 'ring-4 ring-orange-500' : 'ring-2 ring-border'
          }`}
          loading="lazy"
        />
      ) : (
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-full bg-background text-2xl font-bold ${
            isTopRank
              ? 'text-orange-500 ring-4 ring-orange-500'
              : 'text-muted-foreground ring-2 ring-border'
          }`}
        >
          {initials(name)}
        </div>
      )}

      <div className="min-w-0 w-full">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count} film{count !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

export function StatsTab({ movies, recentSpins = [], onMovieClick }: Props) {
  const [photoMap, setPhotoMap] = useState<Record<string, string | null>>({});

  const top10 = [...movies]
    .sort((a, b) => b.user_rating - a.user_rating || b.tmdb_rating - a.tmdb_rating)
    .slice(0, 10);

  const actorCounts: Record<string, number> = {};
  movies.forEach((m) => (m.actors ?? []).forEach((a) => { if (a) actorCounts[a] = (actorCounts[a] || 0) + 1; }));
  const topActors = Object.entries(actorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  

  const directorCounts: Record<string, number> = {};
  movies.forEach((movie) => {
    if (movie.director) {
      directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
    }
  });

  const topDirectors = Object.entries(directorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const genreCounts: Record<string, number> = {};
  movies.forEach((movie) =>
    (movie.genres ?? []).forEach((genre) => {
      if (genre) genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    })
  );

  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const maxGenreCount = topGenres[0]?.[1] ?? 1;

  const decadeCounts: Record<string, number> = {};
  movies.forEach((movie) => {
    if (!movie.year) return;

    const decade = `${Math.floor(Number(movie.year) / 10) * 10}s`;
    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
  });

  const decades = Object.entries(decadeCounts).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const maxDecade = Math.max(...decades.map((decade) => decade[1]), 1);

  const platformCounts: Record<string, number> = {};
  movies.forEach((movie) =>
    (movie.services ?? []).forEach((service) => {
      if (service) platformCounts[service] = (platformCounts[service] || 0) + 1;
    })
  );

  const topPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxPlatform = topPlatforms[0]?.[1] ?? 1;

  const avgRating =
    movies.length > 0
      ? (
          movies.reduce((sum, movie) => sum + (movie.user_rating ?? 0), 0) /
          movies.length
        ).toFixed(1)
      : '0.0';

  const topGenreName = topGenres[0]?.[0] ?? '—';
  const tags = deriveTags(topGenres, movies.length);

  const watchedIds = new Set(movies.map((m) => m.movie_id));
  const spinWatchPct = recentSpins.length > 0
    ? Math.round((recentSpins.filter((s) => watchedIds.has(s.movie_id)).length / recentSpins.length) * 100)
    : null;

  // ── Fetch actor/director profile photos ─────────────────────────
  useEffect(() => {
    if (movies.length === 0) return;

    const actorNames = Object.entries(actorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    const directorNames = Object.entries(directorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    const uniqueNames = [...new Set([...actorNames, ...directorNames])];

    Promise.all(
      uniqueNames.map(async (name) => {
        const photo = await getPersonPhoto(name);
        return [name, photo] as [string, string | null];
      })
    ).then((results) => {
      setPhotoMap(Object.fromEntries(results));
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  if (movies.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground shadow-sm">
        Watch some movies to see your stats!
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 text-foreground">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Movies Watched', value: String(movies.length) },
          { label: 'Avg Your Rating', value: avgRating, accent: true },
          { label: 'Top Genre', value: topGenreName },
          {
            label: 'Unique Directors',
            value: String(Object.keys(directorCounts).length),
          },
        ].map((stat) => (
          <div key={stat.label} className={statCardClass}>
            <p className="mb-1 text-xs text-muted-foreground">{stat.label}</p>
            <p
              className={`text-2xl font-bold leading-tight ${
                stat.accent ? 'text-orange-500' : 'text-foreground'
              }`}
            >
              {stat.value}
            </p>
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

      {/* Taste profile */}
      {tags.length > 0 && (
        <div className={panelClass}>
          <p className={sectionTitleClass}>Taste Profile</p>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-orange-500 px-3 py-1 text-sm font-semibold text-white shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top 10 */}
      <div className={panelClass}>
        <p className={sectionTitleClass}>Top 10 Highest Rated</p>

        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
          {top10.map((movie, index) => (
            <button
              key={movie.movie_id}
              onClick={() => onMovieClick?.(movie.movie_id)}
              className="group w-48 shrink-0 text-left focus:outline-none disabled:cursor-default"
              disabled={!onMovieClick}
            >
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted transition-colors group-hover:border-orange-500/60">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="aspect-[2/3] w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted">
                    <span className="px-3 text-center text-sm text-muted-foreground">
                      {movie.title}
                    </span>
                  </div>
                )}

                <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-md">
                  {index + 1}
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2">
                  <span className="font-bold text-white">{movie.user_rating}</span>
                  <span className="text-sm text-white/65">/10</span>
                </div>
              </div>

              <div className="mt-2">
                <p className="line-clamp-1 text-sm font-medium leading-snug text-foreground">
                  {movie.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {movie.year}
                  {movie.genres?.[0] ? ` · ${movie.genres[0]}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Top actors + directors */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {topActors.length > 0 && (
          <div className={panelClass}>
            <p className={sectionTitleClass}>Most Watched Actor</p>

            <div className="grid grid-cols-2 gap-3">
              {topActors.map(([name, count], index) => (
                <PersonCard
                  key={name}
                  name={name}
                  count={count}
                  photo={photoMap[name]}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        )}

        {topDirectors.length > 0 && (
          <div className={panelClass}>
            <p className={sectionTitleClass}>Most Watched Director</p>

            <div className="grid grid-cols-2 gap-3">
              {topDirectors.map(([name, count], index) => (
                <PersonCard
                  key={name}
                  name={name}
                  count={count}
                  photo={photoMap[name]}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Genre breakdown */}
      {topGenres.length > 0 && (
        <div className={panelClass}>
          <p className={sectionTitleClass}>Genre Breakdown</p>

          <div className="space-y-3">
            {topGenres.slice(0, 8).map(([genre, count]) => {
              const pct = Math.round((count / movies.length) * 100);
              const barPct = Math.round((count / maxGenreCount) * 100);

              return (
                <div key={genre}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-foreground">{genre}</span>
                    <span className="text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>

                  <Bar pct={barPct} color={ACCENT} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decade + Platform */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {decades.length > 0 && (
          <div className={panelClass}>
            <p className={sectionTitleClass}>By Decade</p>

            <div className="space-y-3">
              {decades.map(([decade, count]) => (
                <div key={decade}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-foreground">{decade}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>

                  <Bar
                    pct={Math.round((count / maxDecade) * 100)}
                    color="#60a5fa"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {topPlatforms.length > 0 && (
          <div className={panelClass}>
            <p className={sectionTitleClass}>Most Watched On</p>

            <div className="space-y-3">
              {topPlatforms.map(([platform, count]) => {
                const barPct = Math.round((count / maxPlatform) * 100);
                const color = PLATFORM_COLORS[platform] ?? ACCENT;

                return (
                  <div key={platform}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {PROVIDER_LOGOS[platform] && (
                          <img
                            src={PROVIDER_LOGOS[platform]}
                            alt={platform}
                            className="h-4 w-4 rounded object-cover"
                          />
                        )}

                        <span className="text-foreground">{platform}</span>
                      </div>

                      <span className="text-muted-foreground">{count}</span>
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