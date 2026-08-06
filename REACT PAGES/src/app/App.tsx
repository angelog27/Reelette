import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeContext';
import { Toaster } from './components/ui/sonner';
import CookieConsentBanner from './components/CookieConsentBanner';

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
      <CookieConsentBanner />
    </ThemeProvider>
  );
}
