import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeContext';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}
