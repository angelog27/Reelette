import React, { lazy, Suspense, useState } from 'react';
import { createBrowserRouter, Navigate, Link } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import QuizGate from './components/QuizGate';
import { getUser } from './services/api';
import logoFull from '../assets/Full_Reelette_upscaled.png';

// Tab components are code-split: their JS is only downloaded when the user
// navigates to that tab for the first time, keeping the initial bundle small.
const DiscoverTab          = lazy(() => import('./components/DiscoverTab').then(m => ({ default: m.DiscoverTab })));
const RouletteTab          = lazy(() => import('./components/RouletteTab').then(m => ({ default: m.RouletteTab })));
const SpinModePicker       = lazy(() => import('./components/SpinModePicker').then(m => ({ default: m.SpinModePicker })));
const SpeedSwipeTab        = lazy(() => import('./components/SpeedSwipeTab').then(m => ({ default: m.SpeedSwipeTab })));
const SocialTab            = lazy(() => import('./components/SocialTab').then(m => ({ default: m.SocialTab })));
const ProfileandSettingsTab = lazy(() => import('./components/ProfileandSettingsTab').then(m => ({ default: m.ProfileandSettingsTab })));
const MyStuffTab           = lazy(() => import('./components/MyStuffTab').then(m => ({ default: m.MyStuffTab })));
const SearchTab            = lazy(() => import('./components/SearchTab').then(m => ({ default: m.SearchTab })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getUser()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LandingGuard() {
  if (localStorage.getItem('user_id')) {
    return <Navigate to="/home/spin" replace />;
  }
  return <LandingPage />;
}

// Public roulette - accessible without an account, with a sign-in prompt in the nav
function PublicRouletteWrapper() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<'login' | 'register'>('register');

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Minimal nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoFull} alt="Reelette" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setModalView('login'); setModalOpen(true); }}
              className="text-sm font-medium text-white/50 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => { setModalView('register'); setModalOpen(true); }}
              className="text-sm font-medium bg-[#7C5DBD] hover:bg-[#8F6FD4] active:scale-[0.97] text-white px-4 py-2 rounded-xl transition-all duration-150"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/30 text-sm">Loading...</div>}>
          <RouletteTab />
        </Suspense>
      </div>

      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialView={modalView}
      />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingGuard />,
  },
  {
    // Legacy login route now redirects to the landing page (auth modal lives there)
    path: '/login',
    element: <Navigate to="/" replace />,
  },
  {
    // Public roulette - accessible without an account
    path: '/play',
    element: <PublicRouletteWrapper />,
  },
  {
    path: '/quiz',
    element: <QuizGate />,
  },
  {
    path: '/home',
    element: <ProtectedRoute><HomePage /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <Navigate to="/home/spin" replace />,
      },
      {
        path: 'spin',
        Component: SpinModePicker,
      },
      {
        path: 'speedswipe',
        Component: SpeedSwipeTab,
      },
      {
        path: 'discover',
        Component: DiscoverTab,
      },
      {
        path: 'roulette',
        Component: RouletteTab,
      },
      {
        path: 'social',
        Component: SocialTab,
      },
      {
        path: 'profile',
        Component: ProfileandSettingsTab,
      },
      {
        path: 'mystuff',
        Component: MyStuffTab,
      },
      {
        path: 'search',
        Component: SearchTab,
      },
    ],
  },
]);
