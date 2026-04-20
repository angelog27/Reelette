import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { LoginPage } from './components/LoginPage';
import QuizGate from './components/QuizGate';

// Tab components are code-split: their JS is only downloaded when the user
// navigates to that tab for the first time, keeping the initial bundle small.
const DiscoverTab          = lazy(() => import('./components/DiscoverTab').then(m => ({ default: m.DiscoverTab })));
const RouletteTab          = lazy(() => import('./components/RouletteTab').then(m => ({ default: m.RouletteTab })));
const SocialTab            = lazy(() => import('./components/SocialTab').then(m => ({ default: m.SocialTab })));
const ProfileandSettingsTab = lazy(() => import('./components/ProfileandSettingsTab').then(m => ({ default: m.ProfileandSettingsTab })));
const MyStuffTab           = lazy(() => import('./components/MyStuffTab').then(m => ({ default: m.MyStuffTab })));


export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/quiz',
    element: <QuizGate />,
  },
  {
    path: '/home',
    Component: HomePage,
    children: [
      {
        index: true,
        element: <Navigate to="/home/roulette" replace />,
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
    ],
  },
]);
