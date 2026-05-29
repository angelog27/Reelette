import { useNavigate } from 'react-router-dom';
import { Shuffle, Zap } from 'lucide-react';

export function SpinModePicker() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center px-4"
      style={{ minHeight: 'calc(100dvh - 120px)', background: '#0c0c0f' }}
    >
      {/* Header */}
      <div className="text-center mb-8 md:mb-14">
        <h1
          className="text-white mb-3"
          style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(1.4rem, 4vw, 2.6rem)',
            letterSpacing: '-0.02em',
          }}
        >
          Don't know what to watch?
        </h1>
        <p
          className="text-gray-500"
          style={{
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontWeight: 300,
            fontSize: '1.1rem',
          }}
        >
          No more scrolling. Let us decide.
        </p>
      </div>

      {/* Split panel — side-by-side on all sizes, taller on desktop */}
      <div
        className="flex w-full relative overflow-hidden rounded-2xl"
        style={{ maxWidth: 680, height: 'clamp(240px, 50vh, 400px)' }}
      >
        {/* LEFT — Roulette */}
        <button
          onClick={() => navigate('/home/roulette')}
          className="flex-1 flex flex-col items-center justify-center gap-3 md:gap-5 p-5 md:p-10 group transition-all duration-300"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--reel-accent-hex) 7%, transparent)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'color-mix(in srgb, var(--reel-accent-hex) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--reel-accent-hex) 20%, transparent)' }}
          >
            <Shuffle className="w-5 h-5 md:w-7 md:h-7" style={{ color: 'var(--reel-accent-hex)' }} />
          </div>

          <div className="text-center">
            <h2
              className="text-white mb-1 md:mb-2"
              style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}
            >
              Roulette
            </h2>
            <p
              className="text-gray-500 leading-relaxed mb-3 md:mb-4"
              style={{
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: 300,
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                maxWidth: 180,
              }}
            >
              Set your filters, toggle your providers on/off and spin for something precise.
            </p>
          </div>
        </button>

        {/* Vertical divider */}
        <div className="w-px self-stretch" style={{ background: '#1e1e22' }} />

        {/* RIGHT — SpeedSwipe */}
        <button
          onClick={() => navigate('/home/speedswipe')}
          className="flex-1 flex flex-col items-center justify-center gap-3 md:gap-5 p-5 md:p-10 group transition-all duration-300"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            <Zap className="w-5 h-5 md:w-7 md:h-7" style={{ color: '#4ade80' }} />
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1 md:mb-2">
              <h2
                className="text-white"
                style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}
              >
                Speed Swipe
              </h2>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wider"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
              >
                BETA
              </span>
            </div>
            <p
              className="text-gray-500 leading-relaxed mb-3 md:mb-4"
              style={{
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: 300,
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                maxWidth: 180,
              }}
            >
              Swipe fast and rediscover movies, no thinking required. Swipe left to pass, swipe right to rewatch.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
