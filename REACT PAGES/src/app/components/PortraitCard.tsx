import { Film, Star } from 'lucide-react';
import type { Movie } from '../services/api';

interface Props {
  movie: Movie;
  width?: number;
  onClick: () => void;
}

export function PortraitCard({ movie, width = 148, onClick }: Props) {
  const height = Math.round(width * 1.5);

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 text-left"
      style={{ width }}
    >
      {/* Poster */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          height,
          transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1)',
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={e => (e.currentTarget.style.transform = '')}
        onMouseLeave={e => (e.currentTarget.style.transform = '')}
        onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
        onTouchEnd={e => (e.currentTarget.style.transform = '')}
      >
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <Film className="w-7 h-7 text-zinc-700" />
          </div>
        )}

        {/* Subtle bottom vignette — keeps it clean, not overlaid */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.28), transparent)' }}
        />

        {/* Rating badge */}
        {movie.rating > 0 && (
          <div
            className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          >
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-white text-[10px] font-bold leading-none">{movie.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Text below — totally clean, no overlay */}
      <div className="mt-2.5 px-0.5">
        <p className="text-white text-xs font-bold truncate leading-snug">{movie.title}</p>
        {movie.year > 0 && (
          <p className="text-zinc-500 text-[11px] mt-0.5 leading-none">{movie.year}</p>
        )}
      </div>
    </button>
  );
}
