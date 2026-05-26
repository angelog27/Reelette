import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId =
  | 'default' | 'starwars' | 'tron' | 'matrix'
  | 'synthwave' | 'midnight' | 'crimson' | 'forest';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  tagline: string;
  accent: string;
  cardGradient: string;
  effect?: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'Reelette',
    tagline: 'Classic purple',
    accent: '#7C5DBD',
    cardGradient: 'linear-gradient(135deg, #12083a 0%, #0a0a12 100%)',
  },
  {
    id: 'starwars',
    name: 'Star Wars',
    tagline: 'A long time ago…',
    accent: '#FFE81A',
    cardGradient: 'linear-gradient(135deg, #000820 0%, #000510 100%)',
    effect: '✦ Stars',
  },
  {
    id: 'tron',
    name: 'Tron',
    tagline: 'Welcome to the Grid',
    accent: '#00F5FF',
    cardGradient: 'linear-gradient(135deg, #000D1A 0%, #000508 100%)',
    effect: '⬡ Grid',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    tagline: 'Follow the white rabbit',
    accent: '#00FF41',
    cardGradient: 'linear-gradient(135deg, #001000 0%, #000800 100%)',
    effect: '▓ Rain',
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    tagline: '80s retro neon',
    accent: '#FF2D87',
    cardGradient: 'linear-gradient(135deg, #1a0030 0%, #0d0018 100%)',
    effect: '◈ Glow',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    tagline: 'Deep ocean blue',
    accent: '#4A9EFF',
    cardGradient: 'linear-gradient(135deg, #000D1F 0%, #000814 100%)',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    tagline: 'Bold and dramatic',
    accent: '#FF3B30',
    cardGradient: 'linear-gradient(135deg, #1A0000 0%, #0A0000 100%)',
    effect: '◉ Glow',
  },
  {
    id: 'forest',
    name: 'Forest',
    tagline: 'Natural emerald',
    accent: '#34D399',
    cardGradient: 'linear-gradient(135deg, #001508 0%, #000A04 100%)',
  },
];

const ThemeContext = createContext<{
  themeId: ThemeId;
  setThemeId: (t: ThemeId) => void;
  theme: ThemeDef;
}>({
  themeId: 'default',
  setThemeId: () => {},
  theme: THEMES[0],
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem('reel-theme-v2') as ThemeId | null;
    return stored && THEMES.find(t => t.id === stored) ? stored : 'default';
  });

  function setThemeId(t: ThemeId) {
    setThemeIdState(t);
    localStorage.setItem('reel-theme-v2', t);
  }

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('dark');
    html.classList.remove('light');
    html.setAttribute('data-theme', themeId);
  }, [themeId]);

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
