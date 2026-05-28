import type { Movie } from '../services/api';
import { PROVIDER_LOGOS } from '../constants/providers';
import { ReasonTag } from './ReasonTag';

export const PLATFORM_COLORS: Record<string, string> = {
  'Netflix':      '#e50914',
  'Disney+':      '#113ccf',
  'Max':          '#002be7',
  'Hulu':         '#1ce783',
  'Prime Video':  '#00a8e0',
  'Paramount+':   '#0064ff',
  'Apple TV+':    '#8e8e93',
  'Peacock':      '#f5c518',
};

interface SmallCardProps {
  movie: Movie;
  reason?: string;
  onClick: () => void;
}

export function SmallCard({ movie, reason, onClick }: SmallCardProps) {
  const platformColor = PLATFORM_COLORS[movie.streamingService] ?? '#6b7280';
  const logo = PROVIDER_LOGOS[movie.streamingService];

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer flex-shrink-0 active:scale-[0.97] transition-transform duration-150"
      style={{
        width: 130,
        height: 195,
        boxShadow: `0 12px 32px -6px ${platformColor}44`,
      }}
      onClick={onClick}
    >
      {movie.poster ? (
        <img src={movie.poster} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
          <span className="text-zinc-600 text-xs text-center px-2">{movie.title}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

      {logo && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-sm overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <img src={logo} alt={movie.streamingService} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p className="text-white font-bold text-xs leading-tight line-clamp-2">{movie.title}</p>
        {reason && <ReasonTag reason={reason} />}
      </div>
    </div>
  );
}
