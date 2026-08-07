import { ArrowRight, Film } from 'lucide-react';

export interface PosterRailItem {
  key: string;
  movie_id: string;
  movie_title: string;
  poster_url?: string;
  /** Friend username, only used by the `friend` variant. */
  username?: string;
}

interface Props {
  title: string;
  items: PosterRailItem[];
  onSelect: (item: PosterRailItem) => void;
  loading?: boolean;
  emptyText?: string;
  onSeeAll?: () => void;
  variant?: 'default' | 'friend';
}

/**
 * Full-width horizontal rail of movie posters (2:3), used for "Recently Spun"
 * and "Friends' Spins". Minimal by design — the poster itself is the visual
 * element with the title sitting quietly underneath. Overflow scrolls
 * horizontally with a hidden scrollbar.
 */
export function PosterRail({
  title,
  items,
  onSelect,
  loading = false,
  emptyText,
  onSeeAll,
  variant = 'default',
}: Props) {
  const showEmpty = !loading && items.length === 0;

  return (
    <section className="w-full">
      <div className="mb-4 flex items-baseline justify-between">
        <h2
          className="text-white"
          style={{ fontFamily: 'SanFran, system-ui, sans-serif', fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          {title}
        </h2>
        {onSeeAll && !showEmpty && (
          <button
            onClick={onSeeAll}
            className="group inline-flex items-center gap-1 text-[13px] text-zinc-500 transition-colors hover:text-white"
          >
            See all
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {showEmpty ? (
        emptyText ? <p className="text-sm text-zinc-500">{emptyText}</p> : null
      ) : (
        <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[140px] shrink-0 sm:w-[150px] md:w-[164px]"
                >
                  <div
                    className="w-full animate-pulse rounded-xl"
                    style={{ aspectRatio: '2/3', background: '#111' }}
                  />
                </div>
              ))
            : items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onSelect(item)}
                  className="group w-[140px] shrink-0 text-left sm:w-[150px] md:w-[164px] focus:outline-none"
                >
                  <div
                    className="relative overflow-hidden rounded-xl transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus-visible:ring-2 group-focus-visible:ring-white/60"
                    style={{ aspectRatio: '2/3', background: '#101010', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.movie_title}
                        loading="lazy"
                        className="h-full w-full object-cover brightness-[0.92] transition-[filter] duration-200 group-hover:brightness-100"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center" style={{ background: '#1a1a1a' }}>
                        <Film className="h-6 w-6 text-gray-700" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2.5 px-0.5">
                    {variant === 'friend' && item.username && (
                      <p className="truncate text-[11px] font-medium text-zinc-500">@{item.username}</p>
                    )}
                    <p className="truncate text-[13px] font-medium text-zinc-300 transition-colors group-hover:text-white">
                      {item.movie_title}
                    </p>
                  </div>
                </button>
              ))}
        </div>
      )}
    </section>
  );
}
