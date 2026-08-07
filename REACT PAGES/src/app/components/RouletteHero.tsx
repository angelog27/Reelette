import type { ReactNode } from 'react';

interface Props {
  /** Optional backdrop image. Falls back to a subtle dark cinematic base. */
  backdropUrl?: string | null;
  children: ReactNode;
}

/**
 * Full-bleed cinematic hero shell.
 *
 * Presentational only — it renders an atmospheric backdrop layer, the dark
 * cinematic gradients (left → transparent, bottom fade, vignette) and a
 * centered max-width content container. The actual headline / CTA / controls
 * are passed in as `children` so all interactive logic stays in RouletteTab.
 *
 * The backdrop is decorative and heavily darkened so it never overpowers the
 * text; when no image is available it degrades to a plain dark background.
 */
export function RouletteHero({ backdropUrl, children }: Props) {
  return (
    <section
      className="relative w-full"
      style={{ minHeight: 'clamp(420px, 52vh, 520px)', background: '#070707' }}
    >
      {/* Backdrop image (decorative) */}
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: 'center 28%' }}
        />
      )}

      {/* Left-weighted darkness behind the text */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,5,5,0.96) 0%, rgba(5,5,5,0.82) 30%, rgba(5,5,5,0.35) 65%, rgba(5,5,5,0.55) 100%)',
        }}
      />
      {/* Bottom fade into the page */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(0deg, #050505 0%, rgba(5,5,5,0.35) 40%, rgba(5,5,5,0) 72%)',
        }}
      />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative h-full">
        <div className="mx-auto flex min-h-[clamp(420px,52vh,520px)] w-full max-w-[1600px] flex-col justify-center px-4 sm:px-6 md:px-10 lg:px-12 py-14">
          {children}
        </div>
      </div>
    </section>
  );
}
