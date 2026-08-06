export const Colors = {
  // Backgrounds
  bg: '#0A0A0A',
  bgCard: '#141416',
  bgElevated: '#1a1a1e',
  bgBorder: 'rgba(255,255,255,0.07)',

  // Accent (matches web var(--reel-accent-hex) default)
  accent: '#D4A843',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: '#a1a1aa',   // zinc-400
  textFaint: '#71717a',   // zinc-500

  // Borders
  border: 'rgba(255,255,255,0.07)',
  borderLight: 'rgba(255,255,255,0.12)',

  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',

  // Streaming services
  netflix: '#E50914',
  disneyPlus: '#113CCF',
  hulu: '#1CE783',
  max: '#002BE7',
  primeVideo: '#00A8E1',
  paramountPlus: '#0064FF',
  appleTv: '#8E8E93',
  peacock: '#F5C518',
};

export const PROVIDER_COLORS: Record<string, string> = {
  'Netflix':     Colors.netflix,
  'Disney+':     Colors.disneyPlus,
  'Hulu':        Colors.hulu,
  'Max':         Colors.max,
  'Prime Video': Colors.primeVideo,
  'Paramount+':  Colors.paramountPlus,
  'Apple TV+':   Colors.appleTv,
  'Peacock':     Colors.peacock,
};
