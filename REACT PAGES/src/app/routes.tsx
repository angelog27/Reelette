import { createBrowserRouter } from 'react-router';
import { HomePage } from './components/HomePage';
import { LoginPage } from './components/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/home',
    Component: HomePage,
  },
]);