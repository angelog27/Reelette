import type { ReactNode } from 'react';

interface Props {
  /** Optional backdrop image. Falls back to the theme background. */
  backdropUrl?: string | null;
  /** Optional badge (e.g. "Today's Pick") pinned to the hero's bottom-right. */
  badge?: ReactNode;
  children: ReactNode;
}

/**
 * Full-bleed cinematic hero shell.
 *
 * Presentational only — it renders an atmospheric backdrop layer, the cinematic
 * gradients (left → transparent for text legibility, bottom fade into the page,
 * vignette) and a centered max-width content container. The actual headline /
 * CTA / controls are passed in as `children` so all interactive logic stays in
 * RouletteTab.
 *
 * The base and bottom fade use the theme background token (`--reel-bg`) so the
 * hero blends into whatever theme (dark/light) is active. The backdrop is
 * decorative and darkened so it never overpowers the text; with no image it
 * degrades to a plain themed background.
 */
export function RouletteHero({ backdropUrl, badge, children }: Props) {
  return (
    <section
      className="relative w-full"
      style={{ minHeight: 'clamp(420px, 52vh, 520px)', background: 'var(--reel-bg)' }}
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

      {/* Left-weighted darkness behind the text (keeps white copy legible
          over the photo in every theme) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 30%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      {/* Bottom fade into the page — themed */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(0deg, var(--reel-bg) 0%, color-mix(in srgb, var(--reel-bg) 32%, transparent) 42%, transparent 72%)',
        }}
      />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative h-full">
        <div className="mx-auto flex min-h-[clamp(420px,52vh,520px)] w-full max-w-[1600px] flex-col justify-center px-4 sm:px-6 md:px-10 lg:px-12 py-14">
          {children}
        </div>

        {badge && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <div className="mx-auto flex w-full max-w-[1600px] justify-end px-4 sm:px-6 md:px-10 lg:px-12 pb-6">
              <div className="pointer-events-auto">{badge}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
