import { useNavigate } from 'react-router-dom';
import { Shuffle, Zap } from 'lucide-react';

export function SpinModePicker() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center px-4"
      style={{ minHeight: 'calc(100vh - 120px)', background: '#0c0c0f' }}
    >
      {/* Header */}
      <div className="text-center mb-14">
        <h1
          className="text-white mb-3"
          style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.6rem)',
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
          Let fate decide.
        </p>
      </div>

      {/* Split panel */}
      <div
        className="flex w-full relative overflow-hidden rounded-2xl"
        style={{ maxWidth: 680, height: 400 }}
      >
        {/* LEFT — Roulette */}
        <button
          onClick={() => navigate('/home/roulette')}
          className="flex-1 flex flex-col items-center justify-center gap-5 p-10 group transition-all duration-300"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,93,189,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'rgba(124,93,189,0.12)', border: '1px solid rgba(124,93,189,0.2)' }}
          >
            <Shuffle className="w-7 h-7" style={{ color: '#9B7BD7' }} />
          </div>

          <div className="text-center">
            <h2
              className="text-white mb-2"
              style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: '1.5rem' }}
            >
              Roulette
            </h2>
            <p
              className="text-gray-500 leading-relaxed mb-4"
              style={{
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: 300,
                fontSize: '0.875rem',
                maxWidth: 180,
              }}
            >
              Set your filters and spin for something precise.
            </p>
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(124,93,189,0.15)',
                color: '#9B7BD7',
                border: '1px solid rgba(124,93,189,0.3)',
                fontFamily: 'DM Sans, system-ui, sans-serif',
              }}
            >
              Precise
            </span>
          </div>
        </button>

        {/* Vertical divider */}
        <div className="w-px self-stretch" style={{ background: '#1e1e22' }} />

        {/* RIGHT — SpeedSwipe */}
        <button
          onClick={() => navigate('/home/speedswipe')}
          className="flex-1 flex flex-col items-center justify-center gap-5 p-10 group transition-all duration-300"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            <Zap className="w-7 h-7" style={{ color: '#4ade80' }} />
          </div>

          <div className="text-center">
            <h2
              className="text-white mb-2"
              style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: '1.5rem' }}
            >
              SpeedSwipe
            </h2>
            <p
              className="text-gray-500 leading-relaxed mb-4"
              style={{
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: 300,
                fontSize: '0.875rem',
                maxWidth: 180,
              }}
            >
              Tinder for movies. Swipe fast, no thinking required.
            </p>
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(74,222,128,0.1)',
                color: '#4ade80',
                border: '1px solid rgba(74,222,128,0.25)',
                fontFamily: 'DM Sans, system-ui, sans-serif',
              }}
            >
              Fast
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
