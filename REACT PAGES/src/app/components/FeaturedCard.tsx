import { Bookmark, BookmarkCheck, Star } from 'lucide-react';
import type { Movie } from '../services/api';
import { PROVIDER_LOGOS } from '../constants/providers';
import { ReasonTag } from './ReasonTag';
import { PLATFORM_COLORS } from './SmallCard';

interface FeaturedCardProps {
  movie: Movie;
  reason?: string;
  isInWatchlist: boolean;
  hasUser: boolean;
  onToggleWatchlist: () => void;
  onOpenModal: () => void;
}

export function FeaturedCard({ movie, reason, isInWatchlist, hasUser, onToggleWatchlist, onOpenModal }: FeaturedCardProps) {
  const accent = PLATFORM_COLORS[movie.streamingService] ?? '#7c3aed';
  const logo = PROVIDER_LOGOS[movie.streamingService];

  return (
    <div
      className="relative mx-4 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
      style={{
        height: 'clamp(320px, 52vh, 440px)',
        boxShadow: `0 32px 80px -12px ${accent}55, 0 0 0 1px rgba(255,255,255,0.06)`,
      }}
      onClick={onOpenModal}
    >
      {movie.poster ? (
        <img src={movie.poster} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-zinc-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

      {/* Top row: platform logo + bookmark */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {logo ? (
          <div className="w-7 h-7 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <img src={logo} alt={movie.streamingService} className="w-full h-full object-cover" />
          </div>
        ) : <div />}
        {hasUser && (
          <button
            onClick={e => { e.stopPropagation(); onToggleWatchlist(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.97]"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {isInWatchlist
              ? <BookmarkCheck className="w-4 h-4" style={{ color: 'var(--reel-accent-hex)' }} />
              : <Bookmark className="w-4 h-4 text-white" />
            }
          </button>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-2 mb-1.5">
          {movie.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-white/70 text-xs font-medium">{movie.rating.toFixed(1)}</span>
            </span>
          )}
          {movie.year > 0 && <span className="text-white/40 text-xs">{movie.year}</span>}
          {movie.genres[0] && <span className="text-white/40 text-xs">{movie.genres[0]}</span>}
        </div>
        <h2 className="text-3xl font-black text-white leading-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          {movie.title}
        </h2>
        {reason && <ReasonTag reason={reason} />}
        <button
          onClick={e => { e.stopPropagation(); onOpenModal(); }}
          className="mt-4 w-full py-3 rounded-2xl font-bold text-sm text-white"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
            boxShadow: `0 8px 24px ${accent}55`,
          }}
        >
          More Info
        </button>
      </div>
    </div>
  );
}
