import type { Movie } from '../services/api';
import { SmallCard } from './SmallCard';

interface SectionRowProps {
  label: string;
  movies: Movie[] | null;
  getReasonText?: (movie: Movie) => string;
  onMovieClick: (id: string, type?: 'movie' | 'show', title?: string) => void;
}

export function SectionRow({ label, movies, getReasonText, onMovieClick }: SectionRowProps) {
  if (!movies || movies.length === 0) return null;

  return (
    <div className="mt-7">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight text-white">{label}</h2>
        <button className="text-xs font-semibold" style={{ color: 'var(--reel-accent-hex)' }}>See all</button>
      </div>
      <div
        className="flex gap-3 px-4 pb-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {movies.slice(0, 14).map(movie => (
          <SmallCard
            key={movie.id}
            movie={movie}
            reason={getReasonText?.(movie)}
            onClick={() => onMovieClick(movie.id, movie.type ?? 'movie', movie.title)}
          />
        ))}
      </div>
    </div>
  );
}
