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
  fontFamily: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'Reelette',
    tagline: 'Cinema gold',
    accent: '#D4A843',
    cardGradient: 'linear-gradient(135deg, #1a1200 0%, #0d0d08 100%)',
    fontFamily: 'system-ui, sans-serif',
  },
  {
    id: 'starwars',
    name: 'Star Wars',
    tagline: 'A long time ago…',
    accent: '#FFE81A',
    cardGradient: 'linear-gradient(135deg, #000820 0%, #000510 100%)',
    effect: '✦ Stars',
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'tron',
    name: 'Tron',
    tagline: 'Welcome to the Grid',
    accent: '#00F5FF',
    cardGradient: 'linear-gradient(135deg, #000D1A 0%, #000508 100%)',
    effect: '⬡ Grid',
    fontFamily: '"Courier New", Courier, monospace',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    tagline: 'Follow the white rabbit',
    accent: '#00FF41',
    cardGradient: 'linear-gradient(135deg, #001000 0%, #000800 100%)',
    effect: '▓ Rain',
    fontFamily: '"Courier New", Courier, monospace',
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    tagline: '80s retro neon',
    accent: '#FF2D87',
    cardGradient: 'linear-gradient(135deg, #1a0030 0%, #0d0018 100%)',
    effect: '◈ Glow',
    fontFamily: '"Georgia", serif',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    tagline: 'Deep ocean blue',
    accent: '#4A9EFF',
    cardGradient: 'linear-gradient(135deg, #000D1F 0%, #000814 100%)',
    fontFamily: 'system-ui, sans-serif',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    tagline: 'Bold and dramatic',
    accent: '#FF3B30',
    cardGradient: 'linear-gradient(135deg, #1A0000 0%, #0A0000 100%)',
    effect: '◉ Glow',
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'forest',
    name: 'Forest',
    tagline: 'Natural emerald',
    accent: '#34D399',
    cardGradient: 'linear-gradient(135deg, #001508 0%, #000A04 100%)',
    fontFamily: 'system-ui, sans-serif',
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
    const activeTheme = THEMES.find(th => th.id === themeId) ?? THEMES[0];
    document.documentElement.style.setProperty('--reel-theme-font', activeTheme.fontFamily);
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
