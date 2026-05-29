import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from './AuthModal';
import logoFull from '../../assets/Full_Reelette_upscaled.png';

import netflixLogo    from '../../assets/netflix-logo.png';
import huluLogo       from '../../assets/hulu.webp';
import disneyLogo     from '../../assets/disney-plus.jpg';
import hboLogo        from '../../assets/hbo-max.png';
import primeLogo      from '../../assets/prime-video.jpg';
import appleLogo      from '../../assets/apple-tv.png';
import paramountLogo  from '../../assets/paramount-plus.jpg';
import peacockLogo    from '../../assets/peacock.webp';

// ── Constants ───────────────────────────────────────────────────────────────

const ACCENT   = '#D4A843';
const ACCENTLO = 'rgba(212,168,67,0.15)';

const POSTERS = [
  'https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg',
  'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg',
  'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
  'https://image.tmdb.org/t/p/original/ierOUpBnzqEEVykLKxLeLZ9zKc.jpg',
  'https://image.tmdb.org/t/p/original/8PWiwMBccJ67Ng7STjJSgr92qSJ.jpg',
  'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
  'https://image.tmdb.org/t/p/original/ceG9VzoRAVGwivFU403Wc3AHRys.jpg',
  'https://image.tmdb.org/t/p/original/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg',
  'https://image.tmdb.org/t/p/original/eJGWx219ZcEMVQJhAgMiqo8tYY.jpg',
  'https://image.tmdb.org/t/p/original/dMc96Rn0XutMaIYJNwkJ5yO9oTh.jpg',
  'https://image.tmdb.org/t/p/original/7sfbEnaARXDDhKm0CZ7D7uc2sbo.jpg',
  'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
];

const SERVICE_LOGOS = [
  { src: netflixLogo,   alt: 'Netflix'    },
  { src: huluLogo,      alt: 'Hulu'       },
  { src: disneyLogo,    alt: 'Disney+'    },
  { src: hboLogo,       alt: 'Max'        },
  { src: primeLogo,     alt: 'Prime Video'},
  { src: appleLogo,     alt: 'Apple TV+'  },
  { src: paramountLogo, alt: 'Paramount+' },
  { src: peacockLogo,   alt: 'Peacock'    },
];

// ── Sub-components ───────────────────────────────────────────────────────────

// Full-width scrolling poster rows used as hero background
function HeroPosterBg() {
  const sets = [
    [...POSTERS.slice(0, 6), ...POSTERS.slice(0, 6)],
    [...POSTERS.slice(6, 12), ...POSTERS.slice(6, 12)],
    [...POSTERS.slice(3, 9), ...POSTERS.slice(3, 9)],
  ];
  const dirs  = ['left', 'right', 'left'] as const;
  const speeds = [52, 38, 62];

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {sets.map((row, ri) => (
        <div
          key={ri}
          className="absolute left-0 right-0 overflow-hidden"
          style={{ top: `${(ri / 3) * 100}%`, height: '34%' }}
        >
          <div
            className="flex h-full gap-1.5 absolute"
            style={{
              animation: `lp-bg-${dirs[ri]} ${speeds[ri]}s linear infinite`,
              width: 'max-content',
            }}
          >
            {[...row, ...row].map((src, i) => (
              <div
                key={i}
                className="h-full flex-shrink-0 overflow-hidden rounded-sm"
                style={{ aspectRatio: '2/3' }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  loading={ri === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Scroll-reveal wrapper
function Reveal({
  children,
  delay = 0,
  className = '',
  from = 'bottom',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  from?: 'bottom' | 'left' | 'right';
}) {
  const initial =
    from === 'left'  ? { opacity: 0, x: -36, y: 0 }
    : from === 'right' ? { opacity: 0, x: 36, y: 0 }
    : { opacity: 0, x: 0, y: 30 };

  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate   = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<'login' | 'register'>('login');
  const [navSolid,  setNavSolid]  = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const heroRef       = useRef<HTMLElement>(null);
  const aboutRef      = useRef<HTMLElement>(null);
  const featuresRef   = useRef<HTMLElement>(null);
  const howRef        = useRef<HTMLElement>(null);

  const openLogin    = () => { setModalView('login');    setModalOpen(true); setMobileMenuOpen(false); };
  const openRegister = () => { setModalView('register'); setModalOpen(true); setMobileMenuOpen(false); };

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Detect scroll past hero for nav style change (IntersectionObserver - no scroll listener)
  useEffect(() => {
    const sentinel = document.getElementById('nav-sentinel');
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNavSolid(!entry.isIntersecting),
      { threshold: 1.0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }

        @keyframes lp-bg-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes lp-bg-right {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes lp-gold-pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          [style*="lp-bg-left"], [style*="lp-bg-right"] {
            animation: none !important;
          }
        }
      `}</style>

      <div className="bg-[#080808] text-white">

        {/* ── Sentinel for nav scroll detection ── */}
        <div id="nav-sentinel" className="absolute top-20 h-px w-px" aria-hidden="true" />

        {/* ── NAV ── */}
        <nav
          className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
          style={{
            background: navSolid ? 'rgba(8,8,8,0.95)' : 'transparent',
            backdropFilter: navSolid ? 'blur(20px)' : 'none',
            borderBottom: navSolid ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex-shrink-0"
            >
              <img src={logoFull} alt="Reelette" className="h-8 w-auto object-contain" />
            </button>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-7">
              {[
                { label: 'About',      ref: aboutRef },
                { label: 'Features',   ref: featuresRef },
                { label: 'How It Works', ref: howRef },
              ].map(({ label, ref }) => (
                <button
                  key={label}
                  onClick={() => scrollTo(ref)}
                  className="text-sm text-white/50 hover:text-white transition-colors duration-150"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <button
                onClick={openLogin}
                className="hidden sm:block text-sm font-medium text-white/50 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={openRegister}
                className="text-sm font-semibold text-[#080808] px-4 py-2 rounded-xl active:scale-[0.97] transition-all duration-150"
                style={{ background: ACCENT }}
              >
                Get Started
              </button>
              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
                aria-label="Menu"
              >
                <span className={`block w-5 h-0.5 bg-white/60 transition-all duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white/60 transition-all duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white/60 transition-all duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="md:hidden border-t border-white/5 bg-[#080808]/98 px-5 py-4 flex flex-col gap-4"
              >
                {[
                  { label: 'About',        ref: aboutRef },
                  { label: 'Features',     ref: featuresRef },
                  { label: 'How It Works', ref: howRef },
                ].map(({ label, ref }) => (
                  <button
                    key={label}
                    onClick={() => { scrollTo(ref); setMobileMenuOpen(false); }}
                    className="text-sm text-white/60 hover:text-white text-left transition-colors"
                  >
                    {label}
                  </button>
                ))}
                <div className="pt-2 border-t border-white/5 flex gap-3">
                  <button onClick={openLogin} className="flex-1 text-sm text-white/50 py-2 border border-white/10 rounded-xl">Sign In</button>
                  <button onClick={openRegister} className="flex-1 text-sm font-semibold py-2 rounded-xl text-[#080808]" style={{ background: ACCENT }}>Get Started</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── HERO ── */}
        <section ref={heroRef} className="relative min-h-[100dvh] flex items-center overflow-hidden">

          {/* Full-width poster background */}
          <HeroPosterBg />

          {/* Gradient overlays */}
          {/* Left heavy - text readable */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #080808 0%, #080808 32%, rgba(8,8,8,0.82) 52%, rgba(8,8,8,0.28) 100%)' }}
          />
          {/* Top - nav area */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(8,8,8,0.65) 0%, transparent 18%)' }}
          />
          {/* Bottom - blend into next section */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #080808 0%, transparent 22%)' }}
          />

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto w-full px-5 md:px-8 pt-24 pb-20">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[600px]"
            >
              <h1 className="text-[3.2rem] md:text-[4.5rem] lg:text-[5.5rem] font-bold tracking-tight leading-[0.97] text-white mb-6">
                Stop scrolling.
                <br />
                <span style={{ color: ACCENT }}>Start watching.</span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="text-[1.1rem] text-white/55 leading-relaxed max-w-[440px] mb-8"
              >
                Reelette picks movies and shows from your actual streaming services.
                Spin, rate, and share what's worth watching.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap gap-3 items-center"
              >
                <button
                  onClick={openRegister}
                  className="font-semibold text-[#080808] px-7 py-3.5 rounded-xl text-sm active:scale-[0.97] transition-all duration-150 hover:brightness-110"
                  style={{ background: ACCENT }}
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => navigate('/play')}
                  className="font-semibold text-white px-7 py-3.5 rounded-xl text-sm bg-white/8 hover:bg-white/14 active:scale-[0.97] border border-white/12 transition-all duration-150"
                >
                  Try the Spin
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-4 text-xs text-white/25"
              >
                Free to use. No credit card.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* ── SERVICES STRIP ── */}
        <div className="border-y border-white/5 bg-[#0b0b0b] py-5 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs text-white/25 mb-4 text-center">Works with every major streaming service</p>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
              {SERVICE_LOGOS.map(s => (
                <div key={s.alt} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
                    <img src={s.src} alt={s.alt} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <span className="text-[10px] text-white/30 hidden md:block">{s.alt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ABOUT ── */}
        <section ref={aboutRef} id="about" className="py-28 px-5 md:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Reveal from="left">
              <p className="text-xs font-medium text-white/30 mb-4 tracking-wide">About</p>
              <h2 className="text-[2.2rem] md:text-[3rem] font-bold tracking-tight text-white leading-[1.05] mb-6">
                Built for people who
                <br />
                can't pick what to watch.
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-4 max-w-[480px]">
                Reelette was built by Angelo Gonzales, a Software Engineering student at LSU,
                after one too many evenings scrolling through Netflix deciding nothing.
              </p>
              <p className="text-white/40 text-base leading-relaxed max-w-[480px]">
                The result is a spin-based movie discovery app that filters your entire
                streaming library down to one pick. Rate what you watch, share with friends,
                and let AI make the call when you're truly stuck.
              </p>
            </Reveal>

            <Reveal from="right" delay={0.1}>
              {/* Poster collage - angled stack */}
              <div className="relative h-72 md:h-96 hidden lg:block">
                {POSTERS.slice(0, 4).map((p, i) => (
                  <div
                    key={i}
                    className="absolute rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                      width: '38%',
                      aspectRatio: '2/3',
                      top:  `${[5, 0, 12, 7][i]}%`,
                      left: `${[0, 22, 44, 62][i]}%`,
                      zIndex: 4 - i,
                      transform: `rotate(${[-4, 2, -2, 5][i]}deg)`,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                    }}
                  >
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {/* Gold glow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 50% 60%, ${ACCENTLO} 0%, transparent 65%)` }}
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section ref={featuresRef} id="features" className="py-10 pb-28 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <Reveal className="mb-12">
              <h2 className="text-[2.2rem] md:text-[3rem] font-bold tracking-tight text-white leading-tight">
                Everything you need
                <br />
                for better movie nights.
              </h2>
            </Reveal>

            {/* Bento - 3 columns, 2 rows, 5 cells */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* Roulette - large hero cell */}
              <Reveal delay={0.04} className="md:col-span-2">
                <div
                  className="relative rounded-2xl overflow-hidden border border-white/6 min-h-[260px] flex flex-col justify-end p-8"
                  style={{ background: '#0e0e0e' }}
                >
                  {/* Poster background */}
                  <div className="absolute inset-0">
                    <img src={POSTERS[4]} alt="" className="w-full h-full object-cover opacity-35" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0e0e0e 0%, rgba(14,14,14,0.7) 50%, rgba(14,14,14,0.3) 100%)' }} />
                  </div>
                  <div className="relative z-10">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#080808] text-xs font-bold mb-4"
                      style={{ background: ACCENT }}
                    >
                      R
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">The Roulette</h3>
                    <p className="text-white/50 text-sm leading-relaxed max-w-[380px]">
                      Hit spin and get a movie or show matched to your genre, rating, and service filters.
                      Like it or spin again. No more paralysis.
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Smart Spin */}
              <Reveal delay={0.08}>
                <div
                  className="relative rounded-2xl overflow-hidden border border-white/6 min-h-[260px] flex flex-col justify-end p-8"
                  style={{ background: '#0e0e0e' }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${ACCENTLO} 0%, transparent 65%)` }}
                  />
                  <div className="relative z-10">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold mb-4"
                      style={{ background: ACCENTLO, color: ACCENT, border: `1px solid rgba(212,168,67,0.3)` }}
                    >
                      AI
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Smart Spin</h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      Once a day, AI picks something based on your taste profile. No filters needed.
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Services filter */}
              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-white/6 p-7" style={{ background: '#0e0e0e' }}>
                  <h3 className="text-base font-bold text-white mb-3">Your services, filtered</h3>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {SERVICE_LOGOS.map(s => (
                      <div key={s.alt} className="w-full aspect-square rounded-lg overflow-hidden bg-black/40">
                        <img src={s.src} alt={s.alt} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Every spin only shows what you can actually watch tonight.
                  </p>
                </div>
              </Reveal>

              {/* Social */}
              <Reveal delay={0.12}>
                <div className="rounded-2xl border border-white/6 p-7" style={{ background: '#0e0e0e' }}>
                  <h3 className="text-base font-bold text-white mb-2">Social feed</h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    See what your friends are watching in real time. Follow their picks or argue about them.
                  </p>
                </div>
              </Reveal>

              {/* Rate and track */}
              <Reveal delay={0.14}>
                <div className="rounded-2xl border border-white/6 p-7" style={{ background: '#0e0e0e' }}>
                  <h3 className="text-base font-bold text-white mb-2">Rate and track</h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Log every movie you watch, rate it, and build a history of your taste over time.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section ref={howRef} id="how-it-works" className="py-10 pb-28 px-5 md:px-8 border-t border-white/4">
          <div className="max-w-7xl mx-auto">
            <Reveal className="mb-16">
              <h2 className="text-[2.2rem] md:text-[3rem] font-bold tracking-tight text-white">
                Three steps to your next watch.
              </h2>
            </Reveal>

            <div className="space-y-px">
              {/* Step 1 - wide left */}
              <Reveal>
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-px bg-white/4 rounded-t-2xl overflow-hidden">
                  <div className="bg-[#0b0b0b] p-10 md:p-14">
                    <div className="text-[5rem] font-bold leading-none mb-6 select-none" style={{ color: `rgba(212,168,67,0.12)` }}>01</div>
                    <h3 className="text-2xl font-bold text-white mb-3">Connect your streaming services</h3>
                    <p className="text-white/40 leading-relaxed max-w-sm">
                      Tell Reelette what you subscribe to. Netflix, Hulu, Max, Disney+, Prime, Apple TV+, Paramount+, Peacock. All eight.
                    </p>
                  </div>
                  <div className="bg-[#0b0b0b] hidden md:flex items-center justify-center p-8">
                    <div className="grid grid-cols-4 gap-2 w-full max-w-[180px]">
                      {SERVICE_LOGOS.map(s => (
                        <div key={s.alt} className="aspect-square rounded-lg overflow-hidden">
                          <img src={s.src} alt={s.alt} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Step 2 - full width cinematic */}
              <Reveal delay={0.06}>
                <div className="relative overflow-hidden bg-[#0b0b0b]">
                  <div className="absolute inset-0">
                    <img src={POSTERS[7]} alt="" className="w-full h-full object-cover opacity-20" />
                    <div className="absolute inset-0 bg-[#0b0b0b]/60" />
                  </div>
                  <div className="relative z-10 p-10 md:p-14">
                    <div className="text-[5rem] font-bold leading-none mb-6 select-none" style={{ color: `rgba(212,168,67,0.12)` }}>02</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-3">Spin the reel</h3>
                        <p className="text-white/40 leading-relaxed">
                          One button. Reelette picks from your filtered pool of movies and shows. Like the pick or spin again. No scrolling, no decision fatigue.
                        </p>
                      </div>
                      <div className="hidden md:flex items-center">
                        <div className="flex gap-3">
                          {POSTERS.slice(0, 3).map((p, i) => (
                            <div
                              key={i}
                              className="rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
                              style={{
                                width: 80,
                                aspectRatio: '2/3',
                                transform: `rotate(${[-3, 0, 3][i]}deg) translateY(${[6, 0, 6][i]}px)`,
                                opacity: [0.6, 1, 0.6][i],
                              }}
                            >
                              <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Step 3 - right-heavy */}
              <Reveal delay={0.1}>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-px bg-white/4 rounded-b-2xl overflow-hidden">
                  <div className="bg-[#0b0b0b] hidden md:flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white/80 mb-1">&#9733; &#9733; &#9733; &#9733; &#9733;</div>
                      <p className="text-xs text-white/30">Rate what you watch</p>
                    </div>
                  </div>
                  <div className="bg-[#0b0b0b] p-10 md:p-14">
                    <div className="text-[5rem] font-bold leading-none mb-6 select-none" style={{ color: `rgba(212,168,67,0.12)` }}>03</div>
                    <h3 className="text-2xl font-bold text-white mb-3">Rate, share, and keep watching</h3>
                    <p className="text-white/40 leading-relaxed max-w-sm">
                      Log every pick, rate what you watched, and share your spins with friends in the social feed. Build a record of your taste.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── TRY IT CTA ── */}
        <section className="py-28 px-5 md:px-8 relative overflow-hidden border-t border-white/4">
          {/* Background poster grid */}
          <div className="absolute inset-0">
            <div className="flex h-full gap-px">
              {POSTERS.slice(0, 6).map((p, i) => (
                <div key={i} className="flex-1 overflow-hidden">
                  <img src={p} alt="" className="w-full h-full object-cover opacity-40" loading="lazy" />
                </div>
              ))}
            </div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #080808 0%, rgba(8,8,8,0.55) 30%, rgba(8,8,8,0.55) 70%, #080808 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(8,8,8,0.4) 0%, transparent 20%, transparent 80%, rgba(8,8,8,0.4) 100%)' }} />
          </div>

          <Reveal className="relative z-10 text-center max-w-2xl mx-auto">
            <h2 className="text-[2.4rem] md:text-[3.5rem] font-bold tracking-tight text-white mb-4">
              See it in action.
            </h2>
            <p className="text-white/50 text-base mb-8">
              Pick your streaming services and spin right now. No account needed.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate('/play')}
                className="font-semibold text-[#080808] px-8 py-4 rounded-xl text-sm active:scale-[0.97] transition-all duration-150 hover:brightness-110"
                style={{ background: ACCENT }}
              >
                Try the Spin
              </button>
              <button
                onClick={openRegister}
                className="font-semibold text-white px-8 py-4 rounded-xl text-sm bg-white/8 hover:bg-white/14 active:scale-[0.97] border border-white/12 transition-all duration-150"
              >
                Create Free Account
              </button>
            </div>
          </Reveal>
        </section>

        {/* ── CREATOR ── */}
        <section className="py-20 px-5 md:px-8 border-t border-white/4">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <img src={logoFull} alt="Reelette" className="h-12 w-auto object-contain opacity-70" />
                <div className="flex-1">
                  <p className="text-xs text-white/30 mb-1">Built by</p>
                  <h3 className="text-lg font-semibold text-white">Angelo Gonzales</h3>
                  <p className="text-white/35 text-sm mt-0.5">LSU Student, Software Engineering</p>
                </div>
                <button
                  onClick={openRegister}
                  className="text-sm font-medium transition-colors"
                  style={{ color: ACCENT }}
                >
                  Join Reelette
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-white/4 py-8 px-5 md:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/20">
              &copy; {new Date().getFullYear()} Reelette. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <button onClick={() => scrollTo(aboutRef)}    className="text-xs text-white/25 hover:text-white/60 transition-colors">About</button>
              <button onClick={() => scrollTo(featuresRef)} className="text-xs text-white/25 hover:text-white/60 transition-colors">Features</button>
              <button onClick={openLogin}                   className="text-xs text-white/25 hover:text-white/60 transition-colors">Sign In</button>
              <button onClick={openRegister}                className="text-xs text-white/25 hover:text-white/60 transition-colors">Sign Up</button>
              <button onClick={() => navigate('/play')}     className="text-xs text-white/25 hover:text-white/60 transition-colors">Try Free</button>
            </div>
          </div>
        </footer>
      </div>

      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialView={modalView}
      />
    </>
  );
}
