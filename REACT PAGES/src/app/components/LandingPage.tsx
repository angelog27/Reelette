import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from './AuthModal';
import logoFull from '../../assets/Full_Reelette_upscaled.png';

// Real TMDB poster images (reused from LoginPage)
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

const FEATURES = [
  'Spin to discover',
  'Matched to your services',
  'Rate what you watch',
  'Share picks with friends',
  'Netflix · Hulu · Disney+ · Max',
  'AI Smart Spin',
  'Prime · Apple TV+ · Peacock',
  'Social watchlists',
];

function PosterRow({ images, direction = 'left', speed = 35 }: { images: string[]; direction?: 'left' | 'right'; speed?: number }) {
  const doubled = [...images, ...images, ...images];
  return (
    <div className="relative overflow-hidden h-36 mb-3">
      <div
        className="flex gap-3 absolute"
        style={{
          animation: `lp-scroll-${direction} ${speed}s linear infinite`,
          width: 'max-content',
        }}
      >
        {doubled.map((src, i) => (
          <div key={i} className="lp-poster h-36 w-24 flex-shrink-0 rounded-lg overflow-hidden">
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<'login' | 'register'>('login');

  const openLogin = () => { setModalView('login'); setModalOpen(true); };
  const openRegister = () => { setModalView('register'); setModalOpen(true); };

  return (
    <>
      <style>{`
        @keyframes lp-scroll-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes lp-scroll-right {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        @keyframes lp-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .lp-poster {
          box-shadow: 0 10px 30px rgba(0,0,0,0.7);
        }
        .lp-poster-grid {
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
        }
        .lp-poster-grid-inner {
          transform: perspective(900px) rotateY(-6deg);
          transform-origin: right center;
        }
        @media (max-width: 768px) {
          .lp-poster-grid-inner { transform: none; }
        }
      `}</style>

      <div className="min-h-screen bg-[#0A0A0A] text-white">

        {/* ── Nav ── */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={logoFull} alt="Reelette" className="h-8 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={openLogin}
                className="text-sm font-medium text-white/50 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={openRegister}
                className="text-sm font-medium bg-[#7C5DBD] hover:bg-[#8F6FD4] active:scale-[0.97] text-white px-4 py-2 rounded-xl transition-all duration-150"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="min-h-[100dvh] flex items-center relative overflow-hidden pt-16">
          {/* Subtle purple ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 700px 600px at -5% 50%, rgba(124, 93, 189, 0.12) 0%, transparent 60%)',
            }}
          />

          <div className="max-w-7xl mx-auto w-full px-5 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-0 items-center py-16 lg:py-0">
            {/* Left: headline + CTAs */}
            <div className="relative z-10 lg:pr-16">
              <motion.h1
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-bold tracking-tight leading-[1.05] text-white"
              >
                Your next great
                <br />
                <span style={{ color: '#9B8FD0' }}>movie is one spin</span>
                <br />
                away.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 text-base md:text-lg text-white/55 leading-relaxed max-w-[480px]"
              >
                Reelette matches movies and shows to your streaming services.
                Spin to discover, rate what you watch, and share picks with friends.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <button
                  onClick={openRegister}
                  className="bg-[#7C5DBD] hover:bg-[#8F6FD4] active:scale-[0.97] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all duration-150"
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate('/play')}
                  className="bg-white/5 hover:bg-white/10 active:scale-[0.97] border border-white/10 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all duration-150"
                >
                  Try the Spin
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-4 text-xs text-white/25"
              >
                Free to use. No credit card required.
              </motion.p>
            </div>

            {/* Right: poster mosaic */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lp-poster-grid hidden lg:block"
            >
              <div className="lp-poster-grid-inner">
                <PosterRow images={POSTERS.slice(0, 4)} direction="left" speed={42} />
                <PosterRow images={POSTERS.slice(4, 8)} direction="right" speed={36} />
                <PosterRow images={POSTERS.slice(8, 12)} direction="left" speed={48} />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Feature marquee ── */}
        <div className="border-y border-white/5 py-4 overflow-hidden bg-[#0d0d0d]">
          <div
            className="flex gap-10 whitespace-nowrap"
            style={{ animation: 'lp-marquee 30s linear infinite', width: 'max-content' }}
          >
            {[...FEATURES, ...FEATURES].map((f, i) => (
              <span key={i} className="text-sm text-white/30 font-medium flex items-center gap-10">
                {f}
                <span className="text-[#7C5DBD]/50">*</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── How it works ── */}
        <section className="py-28 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                How it works
              </h2>
              <p className="text-white/40 text-base mb-14 max-w-[420px]">
                Three steps from not knowing what to watch, to watching it.
              </p>
            </Reveal>

            {/* Asymmetric 3-step grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
              <Reveal delay={0.05} className="bg-[#0d0d0d] p-8 md:p-10">
                <div className="text-5xl font-bold text-[#7C5DBD]/20 mb-6 leading-none select-none">01</div>
                <h3 className="text-lg font-semibold text-white mb-2">Connect your services</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Tell Reelette which streaming platforms you subscribe to. We use this to filter every recommendation.
                </p>
              </Reveal>

              <Reveal delay={0.1} className="bg-[#0d0d0d] p-8 md:p-10 md:border-x border-white/5">
                <div className="text-5xl font-bold text-[#7C5DBD]/20 mb-6 leading-none select-none">02</div>
                <h3 className="text-lg font-semibold text-white mb-2">Spin the reel</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Hit spin and Reelette picks a movie or show matched to your genre and rating filters. Like it or spin again.
                </p>
              </Reveal>

              <Reveal delay={0.15} className="bg-[#0d0d0d] p-8 md:p-10">
                <div className="text-5xl font-bold text-[#7C5DBD]/20 mb-6 leading-none select-none">03</div>
                <h3 className="text-lg font-semibold text-white mb-2">Rate and share</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Log what you've watched, rate it, and share your picks with friends in the social feed.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Features bento ── */}
        <section className="py-10 pb-28 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Big feature tile */}
              <Reveal className="md:row-span-2">
                <div className="h-full bg-[#111] border border-white/8 rounded-2xl p-8 overflow-hidden relative min-h-[280px] md:min-h-0">
                  {/* Subtle poster background */}
                  <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden opacity-20 rounded-r-2xl">
                    <img src={POSTERS[4]} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111] to-transparent" />
                  </div>
                  <div className="relative z-10">
                    <div
                      className="w-10 h-10 rounded-xl mb-5 flex items-center justify-center text-lg"
                      style={{ background: 'rgba(124, 93, 189, 0.2)', color: '#9B8FD0' }}
                    >
                      AI
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Smart Spin</h3>
                    <p className="text-white/40 text-sm leading-relaxed max-w-[320px]">
                      Once a day, let the AI make the call. Smart Spin analyzes your taste profile and picks something you're likely to love.
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Social tile */}
              <Reveal delay={0.06}>
                <div className="bg-[#111] border border-white/8 rounded-2xl p-7">
                  <h3 className="text-base font-semibold text-white mb-2">Friends feed</h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    See what your friends are watching and rating in real time. Follow their picks or debate them.
                  </p>
                </div>
              </Reveal>

              {/* Services tile */}
              <Reveal delay={0.1}>
                <div className="bg-[#111] border border-white/8 rounded-2xl p-7">
                  <h3 className="text-base font-semibold text-white mb-3">All your services</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Netflix', 'Hulu', 'Disney+', 'Max', 'Prime', 'Apple TV+'].map((s) => (
                      <span
                        key={s}
                        className="text-xs text-white/50 border border-white/10 px-2.5 py-1 rounded-lg bg-white/3"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-white/40 text-sm mt-3 leading-relaxed">
                    Filter every recommendation to only what you can actually watch tonight.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Roulette promo ── */}
        <section className="py-24 px-5 md:px-8 relative overflow-hidden border-t border-white/5">
          {/* Background: poster collage with heavy overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="flex h-full gap-1 opacity-[0.06]">
              {POSTERS.slice(0, 6).map((p, i) => (
                <div key={i} className="flex-1 overflow-hidden">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A]" />
          </div>

          <div className="max-w-2xl mx-auto text-center relative z-10">
            <Reveal>
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
                Not sure what to watch?
              </h2>
              <p className="text-white/50 text-base mb-8">
                Try the spin right now. No account needed.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => navigate('/play')}
                  className="bg-[#7C5DBD] hover:bg-[#8F6FD4] active:scale-[0.97] text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all duration-150"
                >
                  Try the Spin
                </button>
                <button
                  onClick={openRegister}
                  className="bg-white/5 hover:bg-white/10 active:scale-[0.97] border border-white/10 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all duration-150"
                >
                  Create Free Account
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Creator / About ── */}
        <section className="py-20 px-5 md:px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
                <div className="flex-shrink-0">
                  <img
                    src={logoFull}
                    alt="Reelette"
                    className="h-14 w-auto object-contain opacity-80"
                  />
                </div>
                <div>
                  <p className="text-sm text-white/30 mb-1">Built by</p>
                  <h3 className="text-xl font-semibold text-white">Angelo Gonzales</h3>
                  <p className="text-white/40 text-sm mt-0.5">LSU Student, Software Engineering</p>
                </div>
                <div className="hidden md:block flex-1 border-t border-white/5" />
                <div className="flex-shrink-0">
                  <button
                    onClick={openRegister}
                    className="text-sm font-medium text-[#9B8FD0] hover:text-white transition-colors"
                  >
                    Join Reelette -&gt;
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 py-8 px-5 md:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/20">
              &copy; {new Date().getFullYear()} Reelette. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={openLogin}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={openRegister}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate('/play')}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Try the Spin
              </button>
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
