// Streaming provider metadata — mirrors web PROVIDER_LOGOS / PROVIDER_KEY

export interface Provider {
  key: string;           // API filter key (e.g. 'netflix')
  label: string;         // Display name
  color: string;
  logo: ReturnType<typeof require>;
}

export const PROVIDERS: Provider[] = [
  { key: 'netflix',     label: 'Netflix',     color: '#E50914', logo: require('../../assets/providers/netflix.png') },
  { key: 'heboMax',     label: 'Max',         color: '#002BE7', logo: require('../../assets/providers/max.png') },
  { key: 'disneyPlus',  label: 'Disney+',     color: '#113CCF', logo: require('../../assets/providers/disney.jpg') },
  { key: 'amazonPrime', label: 'Prime Video', color: '#00A8E1', logo: require('../../assets/providers/prime.jpg') },
  { key: 'appleTV',     label: 'Apple TV+',   color: '#8E8E93', logo: require('../../assets/providers/apple-tv.png') },
  { key: 'paramount',   label: 'Paramount+',  color: '#0064FF', logo: require('../../assets/providers/paramount.jpg') },
  { key: 'peacock',     label: 'Peacock',     color: '#F5C518', logo: require('../../assets/providers/peacock.webp') },
  { key: 'hulu',        label: 'Hulu',        color: '#1CE783', logo: require('../../assets/providers/hulu.webp') },
];

export const PROVIDER_BY_KEY: Record<string, Provider> = Object.fromEntries(
  PROVIDERS.map(p => [p.key, p])
);

export const PROVIDER_BY_LABEL: Record<string, Provider> = Object.fromEntries(
  PROVIDERS.map(p => [p.label, p])
);

export const GENRES: Array<{ id: string; label: string }> = [
  { id: '28',    label: 'Action' },
  { id: '12',    label: 'Adventure' },
  { id: '16',    label: 'Animation' },
  { id: '35',    label: 'Comedy' },
  { id: '80',    label: 'Crime' },
  { id: '99',    label: 'Documentary' },
  { id: '18',    label: 'Drama' },
  { id: '10751', label: 'Family' },
  { id: '14',    label: 'Fantasy' },
  { id: '36',    label: 'History' },
  { id: '27',    label: 'Horror' },
  { id: '10402', label: 'Music' },
  { id: '9648',  label: 'Mystery' },
  { id: '10749', label: 'Romance' },
  { id: '878',   label: 'Sci-Fi' },
  { id: '53',    label: 'Thriller' },
  { id: '10752', label: 'War' },
  { id: '37',    label: 'Western' },
];

export const ADMIN_UID = 'IiBMPhonpAR4RWTGCwlykGiDIH63';
