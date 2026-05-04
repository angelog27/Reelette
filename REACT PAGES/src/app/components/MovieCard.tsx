import { Star } from 'lucide-react';
import { Movie } from '../types/movie';
import { PROVIDER_LOGOS } from '../constants/providers';

interface MovieCardProps {
  movie: Movie;
  onClick?: (movie: Movie) => void;
}

export function MovieCard({ movie, onClick }: MovieCardProps) {
  return (
    <div
      onClick={() => onClick?.(movie)}
      className={`group overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:scale-105 hover:border-red-600/50 hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            {movie.title}
          </div>
        )}

        {/* Streaming Badge — official provider logo */}
        {movie.streamingService && PROVIDER_LOGOS[movie.streamingService] && (
          <div className="absolute right-2 top-2 h-9 w-9 overflow-hidden rounded-lg bg-background shadow-lg ring-1 ring-border">
            <img
              src={PROVIDER_LOGOS[movie.streamingService]}
              alt={movie.streamingService}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="mb-1 line-clamp-1 font-semibold text-foreground">
          {movie.title}
        </h3>

        <p className="mb-3 text-sm text-muted-foreground">{movie.year}</p>

        {/* Genres */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {movie.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          <span className="font-medium text-foreground">
            {movie.rating.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/10</span>
        </div>
      </div>
    </div>
  );
}