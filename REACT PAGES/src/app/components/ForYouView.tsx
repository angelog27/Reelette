import { useEffect, useState } from 'react';
import type { Movie } from '../services/api';
import { getServices, discoverMovies } from '../services/api';
import { useDiscover } from '../contexts/DiscoverContext';
import { SectionRow } from './SectionRow';

const SERVICE_CATEGORIES = [
  { label: 'Trending on Your Services',  filters: { sort_by: 'popularity.desc' } },
  { label: 'New Arrivals',               filters: { sort_by: 'release_date.desc', min_rating: 5 } },
  { label: 'Action & Adventure',         filters: { genre_id: '28|12', sort_by: 'popularity.desc' } },
  { label: 'Comedy',                     filters: { genre_id: '35', sort_by: 'popularity.desc' } },
  { label: 'Horror',                     filters: { genre_id: '27', sort_by: 'popularity.desc' } },
  { label: 'Sci-Fi & Fantasy',           filters: { genre_id: '878|14', sort_by: 'popularity.desc' } },
  { label: 'Drama',                      filters: { genre_id: '18', sort_by: 'vote_average.desc', min_rating: 7 } },
  { label: 'Thriller',                   filters: { genre_id: '53', sort_by: 'popularity.desc' } },
  { label: 'Romance',                    filters: { genre_id: '10749', sort_by: 'popularity.desc' } },
  { label: 'Animation',                  filters: { genre_id: '16', sort_by: 'popularity.desc' } },
] as const;

interface Props {
  onOpenModal: (id: string, type?: 'movie' | 'show', title?: string) => void;
}

export function ForYouView({ onOpenModal }: Props) {
  const { recommended, trendingMovies, newReleases, classics, topRated } = useDiscover();
  const [serviceRows, setServiceRows] = useState<{ label: string; movies: Movie[] }[]>([]);
  const [hasServices, setHasServices] = useState(false);

  useEffect(() => {
    const services = getServices();
    const enabled = Object.fromEntries(Object.entries(services).filter(([, v]) => v));
    if (!Object.keys(enabled).length) return;
    setHasServices(true);

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

  // User has saved services → show service-filtered rows
  if (hasServices) {
    return (
      <div className="pb-8 mt-2">
        <SectionRow
          label="Recommended For You"
          movies={recommended ?? []}
          getReasonText={() => 'Filtered to your services'}
          onMovieClick={onOpenModal}
        />
        {serviceRows.map(row => (
          <SectionRow
            key={row.label}
            label={row.label}
            movies={row.movies}
            getReasonText={m => m.streamingService ? `On ${m.streamingService}` : 'On your services'}
            onMovieClick={onOpenModal}
          />
        ))}
      </div>
    );
  }

  // No services saved → show general catalogue rows
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
