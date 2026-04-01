import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { LoginPage } from './components/LoginPage';
import { DiscoverTab } from './components/DiscoverTab';
import { SearchTab } from './components/SearchTab';
import { RouletteTab } from './components/RouletteTab';
import { SocialTab } from './components/SocialTab';
import { ProfileTab } from './components/ProfileTab';
import { SettingsTab } from './components/SettingsTab';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/home',
    Component: HomePage,
    children: [
      {
        index: true,
        element: <Navigate to="/home/discover" replace />,
      },
      {
        path: 'discover',
        Component: DiscoverTab,
      },
      {
        path: 'search',
        Component: SearchTab,
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
        Component: ProfileTab,
      },
      {
        path: 'settings',
        Component: SettingsTab,
      },
    ],
  },
]);