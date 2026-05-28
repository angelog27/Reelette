import type { Movie } from '../services/api';
import { useDiscover } from '../contexts/DiscoverContext';
import { SectionRow } from './SectionRow';

interface Props {
  onOpenModal: (id: string, type?: 'movie' | 'show', title?: string) => void;
}

export function ForYouView({ onOpenModal }: Props) {
  const {
    trendingMovies, newReleases, topRated, classics,
    actionMovies, comedyMovies, horrorMovies, scifiMovies, acclaimed,
    recommended,
  } = useDiscover();

  return (
    <div className="pb-8 mt-2">
      <SectionRow
        label="⭐ Recommended For You"
        movies={recommended ?? []}
        getReasonText={() => 'Based on your watch history'}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="🔥 Hot Right Now"
        movies={trendingMovies}
        getReasonText={() => 'Trending this week'}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="🆕 New Releases"
        movies={newReleases}
        getReasonText={(m: Movie) => `New on ${m.streamingService || 'streaming'}`}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="🚀 Sci-Fi & Fantasy"
        movies={scifiMovies}
        getReasonText={() => 'Top sci-fi picks'}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="😂 Comedy"
        movies={comedyMovies}
        getReasonText={() => 'Because you like to laugh'}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="🎬 Action"
        movies={actionMovies}
        getReasonText={() => 'High-octane picks'}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="😱 Horror"
        movies={horrorMovies}
        getReasonText={() => 'If you dare'}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="🏆 Critically Acclaimed"
        movies={acclaimed}
        getReasonText={() => 'Award-winning films'}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="📽️ Timeless Classics"
        movies={classics}
        getReasonText={() => 'A timeless pick'}
        onMovieClick={onOpenModal}
      />
      <SectionRow
        label="⭐ Top Rated"
        movies={topRated}
        getReasonText={() => 'Highest rated'}
        onMovieClick={onOpenModal}
      />
    </div>
  );
}
