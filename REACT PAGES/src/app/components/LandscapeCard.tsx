import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import type { Movie } from '../services/api';
import { getMovieLogo, getMovieBackdrops } from '../services/api';

interface Props {
  movie: Movie;
  /** CSS width value — defaults to 'min(360px, 85vw)' so it's huge on desktop, full-ish on mobile */
  width?: string;
  onClick: () => void;
}

export function LandscapeCard({ movie, width = 'min(360px, 85vw)', onClick }: Props) {
  const [logo,     setLogo]     = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<string | null>(movie.backdrop ?? null);

  useEffect(() => {
    getMovieLogo(movie.id, movie.type ?? 'movie').then(setLogo).catch(() => {});
  }, [movie.id, movie.type]);

  useEffect(() => {
    if (movie.backdrop) return;
    getMovieBackdrops(movie.id, movie.type ?? 'movie')
      .then(bds => { if (bds.length) setBackdrop(bds[0]); })
      .catch(() => {});
  }, [movie.id, movie.backdrop, movie.type]);

  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 rounded-2xl overflow-hidden"
      style={{
        width,
        aspectRatio: '16/9',
        transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1)',
      }}
      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={e => (e.currentTarget.style.transform = '')}
      onMouseLeave={e => (e.currentTarget.style.transform = '')}
      onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
      onTouchEnd={e => (e.currentTarget.style.transform = '')}
    >
      {/* Backdrop / poster fallback */}
      {backdrop ? (
        <img src={backdrop} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : movie.poster ? (
        <img
          src={movie.poster}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center top', transform: 'scale(1.18)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-900" />
      )}

      {/* Primary left-to-right dark gradient — the "left fade" */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(5,5,5,0.96) 0%, rgba(5,5,5,0.82) 28%, rgba(5,5,5,0.4) 52%, transparent 75%)',
        }}
      />
      {/* Bottom vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }}
      />

      {/* Left content — logo + rating */}
      <div
        className="absolute left-0 top-0 bottom-0 flex flex-col justify-end px-5 pb-4"
        style={{ width: '60%' }}
      >
        {logo ? (
          <img
            src={logo}
            alt={movie.title}
            className="max-h-12 max-w-full object-contain object-left-bottom"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }}
          />
        ) : (
          <p
            className="text-white font-black leading-tight line-clamp-2"
            style={{ fontSize: 'clamp(13px,3.5vw,17px)', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
          >
            {movie.title}
          </p>
        )}
        {movie.rating > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
            <span className="text-white/75 text-[11px] font-bold">{movie.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  );
}
