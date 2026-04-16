import { Star, Tv } from 'lucide-react';
import { Movie } from '../types/movie';

interface MovieCardProps {
  movie: Movie;
  onClick?: (movie: Movie) => void;
}
//comment
export function MovieCard({ movie, onClick }: MovieCardProps) {
  const streamingColors: Record<string, string> = {
    Netflix:      'bg-[#E50914]',
    'Max':        'bg-[#6B2FF1]',
    Hulu:         'bg-[#1CE783] text-black',
    'Paramount+': 'bg-[#0064FF]',
    'Disney+':    'bg-[#113CCF]',
    'Prime Video':'bg-[#00A8E1]',
    'Apple TV+':  'bg-[#555555]',
    Peacock:      'bg-[#FF6E30]',
  };

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
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs px-2 text-center">
            {movie.title}
          </div>
        )}

        {/* Streaming Badge — only shown when a service is known */}
        {movie.streamingService && (
          <div
            className={`absolute top-2 right-2 ${
              streamingColors[movie.streamingService] || 'bg-gray-700'
            } px-2.5 py-1 rounded-md text-xs text-white font-medium flex items-center gap-1`}
          >
            <Tv className="w-3 h-3" />
            {movie.streamingService}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-semibold mb-1 line-clamp-1">{movie.title}</h3>
        <p className="text-gray-500 text-sm mb-3">{movie.year}</p>

        {/* Genres */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {movie.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="text-xs bg-[#2A2A2A] text-gray-400 px-2.5 py-1 rounded-full"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
          <span className="text-white font-medium">{movie.rating.toFixed(1)}</span>
          <span className="text-gray-600 text-sm">/10</span>
        </div>
      </div>
    </div>
  );
}
