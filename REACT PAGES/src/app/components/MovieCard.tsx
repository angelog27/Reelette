import { Star } from 'lucide-react';
import { Movie } from '../types/movie';

interface MovieCardProps {
  movie: Movie;
  onClick?: (movie: Movie) => void;
}

// Official provider logos via TMDB CDN
const PROVIDER_LOGOS: Record<string, string> = {
  'Netflix':      'https://image.tmdb.org/t/p/original/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg',
  'Max':          'https://image.tmdb.org/t/p/original/aS2zvJWn9mwiU7M3tuiubDufoM.jpg',
  'Hulu':         'https://image.tmdb.org/t/p/original/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg',
  'Paramount+':   'https://image.tmdb.org/t/p/original/h5DcR0J2EESLitnhR8xLG1QymTE.jpg',
  'Disney+':      'https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg',
  'Prime Video':  'https://image.tmdb.org/t/p/original/emthp39XA2YScoYL1p0sdbMH2fh.jpg',
  'Apple TV+':    'https://image.tmdb.org/t/p/original/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg',
  'Peacock':      'https://image.tmdb.org/t/p/original/8VCV78prwd9QzZnEm0ReO6bERDa.jpg',
};

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

        {/* Streaming Badge — official provider logo */}
        {movie.streamingService && PROVIDER_LOGOS[movie.streamingService] && (
          <div className="absolute top-2 right-2 w-9 h-9 rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10">
            <img
              src={PROVIDER_LOGOS[movie.streamingService]}
              alt={movie.streamingService}
              className="w-full h-full object-cover"
            />
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
