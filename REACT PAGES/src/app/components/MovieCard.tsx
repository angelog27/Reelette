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
      className={`bg-[#1C1C1C] rounded-xl overflow-hidden border border-[#2A2A2A] hover:border-[#C0392B]/50 transition-all duration-300 hover:scale-105 group ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[#141414]">
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs px-2 text-center">
            {movie.title}
          </div>
        )}

        {movie.streamingService && PROVIDER_LOGOS[movie.streamingService] && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-md overflow-hidden shadow-lg ring-1 ring-white/10">
            <img
              src={PROVIDER_LOGOS[movie.streamingService]}
              alt={movie.streamingService}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <h3 className="text-white text-xs font-semibold mb-0.5 line-clamp-1">{movie.title}</h3>

        {movie.year > 0 && (
          <p className="text-gray-500 text-[11px] mb-1.5">{movie.year}</p>
        )}

        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {movie.genres.slice(0, 2).map((genre) => (
              <span key={genre} className="text-[10px] bg-[#2A2A2A] text-gray-400 px-1.5 py-0.5 rounded-full">
                {genre}
              </span>
            ))}
          </div>
        )}

        {movie.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="text-white text-[11px] font-medium">{movie.rating.toFixed(1)}</span>
            <span className="text-gray-600 text-[10px]">/10</span>
          </div>
        )}
      </div>
    </div>
  );
}
