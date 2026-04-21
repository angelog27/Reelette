import netflixLogo    from '../../assets/netflix-logo.jpg';
import hboMaxLogo     from '../../assets/hbo-max.png';
import disneyLogo     from '../../assets/disney-plus.jpg';
import primeLogo      from '../../assets/prime-video.jpg';
import appleLogo      from '../../assets/apple-tv.png';
import paramountLogo  from '../../assets/paramount-plus.webp';
import peacockLogo    from '../../assets/peacock.webp';

// Map of streaming service display name → local asset URL.
// Hulu has no local asset so it falls back to the TMDB CDN.
export const PROVIDER_LOGOS: Record<string, string> = {
  'Netflix':      netflixLogo,
  'Max':          hboMaxLogo,
  'Disney+':      disneyLogo,
  'Prime Video':  primeLogo,
  'Apple TV+':    appleLogo,
  'Paramount+':   paramountLogo,
  'Peacock':      peacockLogo,
  'Hulu':         'https://image.tmdb.org/t/p/original/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg',
};
