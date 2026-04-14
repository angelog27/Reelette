import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { LoginPage } from './components/LoginPage';
import { DiscoverTab } from './components/DiscoverTab';
import { RouletteTab } from './components/RouletteTab';
import { SocialTab } from './components/SocialTab';
import { ProfileTab } from './components/ProfileTab';
import { SettingsTab } from './components/SettingsTab';
import { MyStuffTab } from './components/MyStuffTab';
import { ProfileandSettingsTab } from './components/ProfileandSettingsTab';


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