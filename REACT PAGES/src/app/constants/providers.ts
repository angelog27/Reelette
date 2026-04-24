import netflixLogo    from '../../assets/netflix-logo.png';
import hboMaxLogo     from '../../assets/hbo-max.png';
import disneyLogo     from '../../assets/disney-plus.jpg';
import primeLogo      from '../../assets/prime-video.jpg';
import appleLogo      from '../../assets/apple-tv.png';
import paramountLogo  from '../../assets/paramount-plus.jpg';
import peacockLogo    from '../../assets/peacock.webp';
import huluLogo       from '../../assets/hulu.webp';

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
  'Hulu':         huluLogo,
  // TMDB raw name aliases — for movies stored before the ID-based normalization
  'Disney Plus':        disneyLogo,
  'HBO Max':            hboMaxLogo,
  'Amazon Prime Video': primeLogo,
  'Apple TV Plus':      appleLogo,
  'Paramount Plus':     paramountLogo,
};
