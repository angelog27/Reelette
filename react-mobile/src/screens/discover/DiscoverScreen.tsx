import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColdStartBanner } from '../../components/common/ColdStartBanner';
import { MovieDetailModal } from '../../components/modals/MovieDetailModal';
import {
  getTrendingMovies, getTopRatedMovies, discoverMovies, discoverShows,
  getNewReleases, searchMovies, searchShows, getServices,
} from '../../services/api';
import { Colors, PROVIDER_COLORS } from '../../constants/colors';
import { PROVIDERS, PROVIDER_BY_LABEL } from '../../constants/providers';
import type { Movie } from '../../types';

const { width: W } = Dimensions.get('window');
const PORTRAIT_W  = 120;
const PORTRAIT_H  = PORTRAIT_W * 1.5;
const LANDSCAPE_W = W * 0.72;
const LANDSCAPE_H = LANDSCAPE_W * 0.56;

// Genre IDs
const MOVIE_GENRES = [
  { id: '28',    label: 'Action' },
  { id: '35',    label: 'Comedy' },
  { id: '27',    label: 'Horror' },
  { id: '878',   label: 'Sci-Fi' },
  { id: '53',    label: 'Thriller' },
  { id: '18',    label: 'Drama' },
  { id: '10749', label: 'Romance' },
  { id: '16',    label: 'Animation' },
  { id: '80',    label: 'Crime' },
  { id: '14',    label: 'Fantasy' },
  { id: '9648',  label: 'Mystery' },
  { id: '10751', label: 'Family' },
];

const SHOW_GENRES = [
  { id: '18',  label: 'Drama' },
  { id: '35',  label: 'Comedy' },
  { id: '80',  label: 'Crime' },
  { id: '10765', label: 'Sci-Fi & Fantasy' },
  { id: '9648',  label: 'Mystery' },
  { id: '10759', label: 'Action & Adventure' },
];

type GenreRow = {
  label: string;
  genre_id?: string;
  with_keywords?: string;
  with_companies?: string;
  no_service_filter?: boolean; // skip services_filter for universe-wide collections
};

// Per-service curated config
const SERVICE_CONFIG: Record<string, { popularLabel: string; genreRows: GenreRow[] }> = {
  netflix:     { popularLabel: 'Popular on Netflix',     genreRows: [
    { label: 'Netflix Action',   genre_id: '28'  },
    { label: 'Netflix Comedy',   genre_id: '35'  },
    { label: 'Netflix Horror',   genre_id: '27'  },
    { label: 'Netflix Sci-Fi',   genre_id: '878' },
    { label: 'Netflix Thriller', genre_id: '53'  },
  ]},
  heboMax:     { popularLabel: 'Popular on Max',         genreRows: [
    { label: 'DC Universe',  with_companies: '9993|128064', no_service_filter: true },
    { label: 'Max Drama',    genre_id: '18' },
    { label: 'Max Thriller', genre_id: '53' },
    { label: 'Max Crime',    genre_id: '80' },
    { label: 'Max Sci-Fi',   genre_id: '878' },
  ]},
  disneyPlus:  { popularLabel: 'Popular on Disney+',    genreRows: [
    { label: 'Marvel',           with_companies: '420',    no_service_filter: true },
    { label: 'Star Wars',        with_keywords: '161176',  no_service_filter: true },
    { label: 'Pixar',            with_companies: '3',      no_service_filter: true },
    { label: 'Disney Classics',  with_companies: '2',      no_service_filter: true },
    { label: 'Disney+ Action',   genre_id: '28' },
  ]},
  amazonPrime: { popularLabel: 'Popular on Prime Video', genreRows: [
    { label: 'Prime Action',   genre_id: '28'  },
    { label: 'Prime Drama',    genre_id: '18'  },
    { label: 'Prime Thriller', genre_id: '53'  },
    { label: 'Prime Sci-Fi',   genre_id: '878' },
    { label: 'Prime Comedy',   genre_id: '35'  },
  ]},
  appleTV:     { popularLabel: 'Popular on Apple TV+',  genreRows: [
    { label: 'Apple TV+ Drama',    genre_id: '18'  },
    { label: 'Apple TV+ Thriller', genre_id: '53'  },
    { label: 'Apple TV+ Sci-Fi',   genre_id: '878' },
    { label: 'Apple TV+ Crime',    genre_id: '80'  },
  ]},
  paramount:   { popularLabel: 'Popular on Paramount+', genreRows: [
    { label: 'Paramount+ Action', genre_id: '28' },
    { label: 'Paramount+ Horror', genre_id: '27' },
    { label: 'Paramount+ Drama',  genre_id: '18' },
    { label: 'Paramount+ Comedy', genre_id: '35' },
  ]},
  peacock:     { popularLabel: 'Popular on Peacock',    genreRows: [
    { label: 'Peacock Comedy', genre_id: '35' },
    { label: 'Peacock Horror', genre_id: '27' },
    { label: 'Peacock Action', genre_id: '28' },
    { label: 'Peacock Drama',  genre_id: '18' },
  ]},
  hulu:        { popularLabel: 'Popular on Hulu',       genreRows: [
    { label: 'Hulu Horror',   genre_id: '27'  },
    { label: 'Hulu Comedy',   genre_id: '35'  },
    { label: 'Hulu Drama',    genre_id: '18'  },
    { label: 'Hulu Sci-Fi',   genre_id: '878' },
    { label: 'Hulu Thriller', genre_id: '53'  },
  ]},
};

type Tab = 'foryou' | 'browse';

// ── Portrait card ──────────────────────────────────────────────────────────────
function PCard({ movie, onPress, priority }: { movie: Movie; onPress: () => void; priority?: boolean }) {
  const uri = movie.poster?.replace(/\/t\/p\/\w+\//, '/t/p/w342/') ?? '';
  const provider = movie.streamingService ? PROVIDER_BY_LABEL[movie.streamingService] : null;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginRight: 10 }}>
      <View style={{ width: PORTRAIT_W, height: PORTRAIT_H, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.bgCard }}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" priority={priority ? 'high' : 'normal'} /> : null}
        {provider && (
          <View style={pc.badge}>
            <Image source={provider.logo} style={pc.badgeLogo} contentFit="cover" />
          </View>
        )}
      </View>
      <Text style={pc.title} numberOfLines={2}>{movie.title}</Text>
      {movie.year > 0 && <Text style={pc.year}>{movie.year}</Text>}
    </TouchableOpacity>
  );
}
const pc = StyleSheet.create({
  title:    { color: Colors.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 6, lineHeight: 15, width: PORTRAIT_W },
  year:     { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  badge:    { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 6, padding: 3 },
  badgeLogo:{ width: 18, height: 18, borderRadius: 3 },
});

// ── Landscape card ─────────────────────────────────────────────────────────────
function LCard({ movie, onPress, priority }: { movie: Movie; onPress: () => void; priority?: boolean }) {
  const src = movie.backdrop || movie.poster || '';
  const uri = src?.replace(/\/t\/p\/\w+\//, '/t/p/w780/') ?? '';
  const provider = movie.streamingService ? PROVIDER_BY_LABEL[movie.streamingService] : null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ width: LANDSCAPE_W, height: LANDSCAPE_H, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.bgCard, marginRight: 12 }}
    >
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" priority={priority ? 'high' : 'normal'} /> : null}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%' }} />
      {provider && (
        <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 6, padding: 3 }}>
          <Image source={provider.logo} style={{ width: 20, height: 20, borderRadius: 4 }} contentFit="cover" />
        </View>
      )}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 17 }} numberOfLines={1}>{movie.title}</Text>
        {movie.rating > 0 && <Text style={{ color: '#fbbf24', fontSize: 11, marginTop: 2 }}>★ {movie.rating.toFixed(1)}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ── Section row ────────────────────────────────────────────────────────────────
function Row({ label, movies, onPress, type = 'portrait', loading }: {
  label: string; movies: Movie[] | null; onPress: (m: Movie) => void;
  type?: 'portrait' | 'landscape'; loading?: boolean;
}) {
  if (!loading && (!movies || movies.length === 0)) return null;
  return (
    <View style={{ marginTop: 26 }}>
      <Text style={r.label}>{label}</Text>
      {loading ? (
        <View style={{ height: type === 'landscape' ? LANDSCAPE_H : PORTRAIT_H, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.textFaint} size="small" />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={r.row}>
          {(movies ?? []).slice(0, 14).map((m, i) =>
            type === 'portrait'
              ? <PCard key={m.id} movie={m} onPress={() => onPress(m)} priority={i === 0} />
              : <LCard key={m.id} movie={m} onPress={() => onPress(m)} priority={i === 0} />
          )}
        </ScrollView>
      )}
    </View>
  );
}
const r = StyleSheet.create({
  label: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
  row:   { paddingHorizontal: 16, paddingBottom: 4 },
});

// ── Section header with optional service logo ──────────────────────────────────
function SectionHeader({ label, providerKey }: { label: string; providerKey?: string }) {
  const provider = providerKey ? PROVIDERS.find(p => p.key === providerKey) : null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10, marginTop: 26 }}>
      {provider && (
        <Image source={provider.logo} style={{ width: 22, height: 22, borderRadius: 5 }} contentFit="cover" />
      )}
      <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

// ── Featured hero carousel ─────────────────────────────────────────────────────
function FeaturedHero({ movies, onPress }: { movies: Movie[]; onPress: (m: Movie) => void }) {
  const [idx, setIdx] = useState(0);
  if (!movies.length) return null;
  const movie = movies[idx];
  const uri = (movie.backdrop || movie.poster)?.replace(/\/t\/p\/\w+\//, '/t/p/w780/') ?? '';
  const HERO_H = W * 0.7;

  return (
    <View style={{ marginTop: 4 }}>
      <TouchableOpacity onPress={() => onPress(movie)} activeOpacity={0.92}>
        <View style={{ width: W, height: HERO_H, position: 'relative' }}>
          {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" priority="high" /> : null}
          <LinearGradient
            colors={['rgba(8,8,8,0.1)', 'transparent', 'rgba(8,8,8,0.65)', 'rgba(8,8,8,0.97)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 16 }}>
            {movie.genres[0] && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{movie.genres[0]}</Text>
              </View>
            )}
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32, marginBottom: 6 }} numberOfLines={2}>{movie.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {movie.year > 0 && <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{movie.year}</Text>}
              {movie.rating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={11} color="#fbbf24" />
                  <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '600' }}>{movie.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
              <Ionicons name="play" size={14} color="#0A0A0A" />
              <Text style={{ color: '#0A0A0A', fontSize: 14, fontWeight: '700' }}>See Details</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {movies.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {movies.slice(0, 5).map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setIdx(i)} style={{ padding: 5 }}>
              <View style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.25)' }} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Provider-specific section (lazy-loaded) ────────────────────────────────────
function ProviderSection({ providerKey, onPress }: { providerKey: string; onPress: (m: Movie) => void }) {
  const cfg = SERVICE_CONFIG[providerKey];
  if (!cfg) return null;
  const provider = PROVIDERS.find(p => p.key === providerKey);

  const [popular, setPopular]       = useState<Movie[] | null>(null);
  const [subRows, setSubRows]        = useState<(Movie[] | null)[]>(() => cfg.genreRows.map(() => null));
  const [showMovies, setShowMovies]  = useState<Movie[] | null>(null);

  useEffect(() => {
    discoverMovies({ services_filter: { [providerKey]: true }, sort_by: 'popularity.desc' })
      .then(r => setPopular(r.slice(0, 14))).catch(() => setPopular([]));
    discoverShows({ services_filter: { [providerKey]: true }, sort_by: 'popularity.desc' })
      .then(r => setShowMovies(r.slice(0, 14))).catch(() => setShowMovies([]));
    cfg.genreRows.forEach((row, i) => {
      const filters: Record<string, unknown> = { sort_by: 'popularity.desc' };
      if (row.genre_id)       filters.genre_id       = row.genre_id;
      if (row.with_keywords)  filters.with_keywords  = row.with_keywords;
      if (row.with_companies) filters.with_companies = row.with_companies;
      if (!row.no_service_filter) filters.services_filter = { [providerKey]: true };
      discoverMovies(filters as any)
        .then(movies => setSubRows(prev => { const n = [...prev]; n[i] = movies.slice(0, 14); return n; }))
        .catch(() => setSubRows(prev => { const n = [...prev]; n[i] = []; return n; }));
    });
  }, [providerKey]);

  return (
    <View>
      {/* Provider banner */}
      <View style={{ marginHorizontal: 16, marginTop: 24, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
        {provider && <Image source={provider.logo} style={{ width: 36, height: 36, borderRadius: 9 }} contentFit="cover" />}
        <View>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{provider?.label}</Text>
          <Text style={{ color: Colors.textFaint, fontSize: 12, marginTop: 1 }}>What's on right now</Text>
        </View>
      </View>

      {/* Popular — landscape */}
      {(popular === null || (popular?.length ?? 0) > 0) && (
        <>
          <SectionHeader label={cfg.popularLabel} providerKey={providerKey} />
          {popular === null ? (
            <View style={{ height: LANDSCAPE_H, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={Colors.textFaint} size="small" />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {popular.map((m, i) => <LCard key={m.id} movie={m} onPress={() => onPress(m)} priority={i === 0} />)}
            </ScrollView>
          )}
        </>
      )}

      {/* TV Shows on this service */}
      {(showMovies === null || (showMovies?.length ?? 0) > 0) && (
        <>
          <SectionHeader label={`Shows on ${provider?.label}`} />
          {showMovies === null ? (
            <View style={{ height: PORTRAIT_H, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={Colors.textFaint} size="small" />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {showMovies.map((m, i) => <PCard key={m.id} movie={m} onPress={() => onPress(m)} priority={i === 0} />)}
            </ScrollView>
          )}
        </>
      )}

      {/* Genre sub-rows — portrait */}
      {cfg.genreRows.map((row, i) => (
        <View key={row.label}>
          <SectionHeader label={row.label} />
          {subRows[i] === null ? (
            <View style={{ height: PORTRAIT_H, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={Colors.textFaint} size="small" />
            </View>
          ) : (subRows[i]?.length ?? 0) > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {subRows[i]!.map((m, j) => <PCard key={m.id} movie={m} onPress={() => onPress(m)} priority={j === 0} />)}
            </ScrollView>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('foryou');

  // Core movie rows
  const [trending,    setTrending]   = useState<Movie[]>([]);
  const [topRated,    setTopRated]   = useState<Movie[]>([]);
  const [newRel,      setNewRel]     = useState<Movie[]>([]);

  // Movie genre rows
  const [action,    setAction]     = useState<Movie[]>([]);
  const [comedy,    setComedy]     = useState<Movie[]>([]);
  const [horror,    setHorror]     = useState<Movie[]>([]);
  const [scifi,     setScifi]      = useState<Movie[]>([]);
  const [thriller,  setThriller]   = useState<Movie[]>([]);
  const [drama,     setDrama]      = useState<Movie[]>([]);
  const [romance,   setRomance]    = useState<Movie[]>([]);
  const [animation, setAnimation]  = useState<Movie[]>([]);
  const [crime,     setCrime]      = useState<Movie[]>([]);
  const [fantasy,   setFantasy]    = useState<Movie[]>([]);

  // TV shows rows
  const [trendingShows,   setTrendingShows]   = useState<Movie[]>([]);
  const [dramaShows,      setDramaShows]      = useState<Movie[]>([]);
  const [comedyShows,     setComedyShows]     = useState<Movie[]>([]);
  const [crimeShows,      setCrimeShows]      = useState<Movie[]>([]);
  const [scifiShows,      setScifiShows]      = useState<Movie[]>([]);
  const [actionShows,     setActionShows]     = useState<Movie[]>([]);

  // Service-specific For You rows
  const [userServiceKeys, setUserServiceKeys] = useState<string[]>([]);

  // Browse tab
  const [activeProvider, setActiveProvider]   = useState<string>('all');

  // Search
  const [query,         setQuery]      = useState('');
  const [searchResults, setResults]    = useState<Movie[]>([]);
  const [searchLoading, setSearching]  = useState(false);
  const [isSearching,   setIsSearching] = useState(false);

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coldStart,  setColdStart]  = useState(false);
  const [modalId,    setModalId]    = useState<string | null>(null);
  const [modalType,  setModalType]  = useState<'movie' | 'show'>('movie');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openModal = (movie: Movie) => {
    setModalId(movie.id);
    setModalType(movie.type === 'show' ? 'show' : 'movie');
  };

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const cold = setTimeout(() => setColdStart(true), 3000);

    // Movies
    const [
      trendR, topR, newR,
      actR, comR, horR, sciR, thrR, draR, romR, aniR, criR, fanR,
      tShowR, dShowR, cShowR, crShowR, sfShowR, aShowR,
    ] = await Promise.allSettled([
      getTrendingMovies('week'),
      getTopRatedMovies(1),
      getNewReleases(),
      discoverMovies({ genre_id: '28',    sort_by: 'popularity.desc' }),
      discoverMovies({ genre_id: '35',    sort_by: 'popularity.desc' }),
      discoverMovies({ genre_id: '27',    sort_by: 'popularity.desc' }),
      discoverMovies({ genre_id: '878',   sort_by: 'popularity.desc' }),
      discoverMovies({ genre_id: '53',    sort_by: 'popularity.desc' }),
      discoverMovies({ genre_id: '18',    sort_by: 'vote_average.desc', min_rating: 7 }),
      discoverMovies({ genre_id: '10749', sort_by: 'popularity.desc' }),
      discoverMovies({ genre_id: '16',    sort_by: 'popularity.desc' }),
      discoverMovies({ genre_id: '80',    sort_by: 'popularity.desc' }),
      discoverMovies({ genre_id: '14',    sort_by: 'popularity.desc' }),
      // TV shows
      discoverShows({ sort_by: 'popularity.desc' }),
      discoverShows({ genre_id: '18',    sort_by: 'vote_average.desc', min_rating: 7 }),
      discoverShows({ genre_id: '35',    sort_by: 'popularity.desc' }),
      discoverShows({ genre_id: '80',    sort_by: 'popularity.desc' }),
      discoverShows({ genre_id: '10765', sort_by: 'popularity.desc' }),
      discoverShows({ genre_id: '10759', sort_by: 'popularity.desc' }),
    ]);

    const get = (r: PromiseSettledResult<Movie[]>) => r.status === 'fulfilled' ? r.value : [];

    setTrending(get(trendR)); setTopRated(get(topR)); setNewRel(get(newR));
    setAction(get(actR)); setComedy(get(comR)); setHorror(get(horR));
    setScifi(get(sciR));  setThriller(get(thrR)); setDrama(get(draR));
    setRomance(get(romR)); setAnimation(get(aniR)); setCrime(get(criR)); setFantasy(get(fanR));
    setTrendingShows(get(tShowR)); setDramaShows(get(dShowR)); setComedyShows(get(cShowR));
    setCrimeShows(get(crShowR)); setScifiShows(get(sfShowR)); setActionShows(get(aShowR));

    clearTimeout(cold);
    setColdStart(false);
    setLoading(false);
    setRefreshing(false);

    // Load user's active services for personalized rows
    getServices().then(saved => {
      const keys = Object.entries(saved).filter(([, v]) => v).map(([k]) => k);
      setUserServiceKeys(keys);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadAll(); }, []);

  // Search debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const [movies, shows] = await Promise.allSettled([
        searchMovies(query.trim()).catch(() => []),
        searchShows(query.trim()).catch(() => []),
      ]);
      const combined = [
        ...(movies.status === 'fulfilled' ? movies.value : []),
        ...(shows.status === 'fulfilled' ? shows.value : []),
      ].slice(0, 50);
      setResults(combined);
      setSearching(false);
    }, 380);
  }, [query]);

  const heroMovies = trending.slice(0, 5);

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top + 60, alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* ── Search bar ── */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.textFaint} />
        <TextInput
          style={s.searchInput}
          placeholder="Search movies & shows"
          placeholderTextColor={Colors.textFaint}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsSearching(true)}
          returnKeyType="search"
        />
        {(query.length > 0 || isSearching) && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setIsSearching(false); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textFaint} />
          </TouchableOpacity>
        )}
      </View>

      <ColdStartBanner visible={coldStart} />

      {isSearching && query.length > 0 ? (
        /* ── Search results ── */
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {searchLoading
            ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            : searchResults.length === 0
            ? <Text style={s.emptyText}>No results for "{query}"</Text>
            : (
              <View style={s.searchGrid}>
                {searchResults.map((m, i) => (
                  <PCard key={`${m.id}-${i}`} movie={m} onPress={() => openModal(m)} priority={i < 6} />
                ))}
              </View>
            )
          }
        </ScrollView>
      ) : (
        <>
          {/* ── Tab row ── */}
          <View style={s.tabRow}>
            {(['foryou', 'browse'] as Tab[]).map(t => (
              <TouchableOpacity key={t} style={s.tabBtn} onPress={() => setTab(t)}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                  {t === 'foryou' ? 'For You' : 'Browse'}
                </Text>
                {tab === t && <View style={s.tabLine} />}
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'foryou' ? (
            /* ── FOR YOU ── */
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(true); }} tintColor={Colors.accent} />}
              contentContainerStyle={{ paddingBottom: 80 }}
            >
              <FeaturedHero movies={heroMovies} onPress={openModal} />

              <Row label="Trending This Week" movies={trending}  onPress={openModal} type="portrait" />
              <Row label="New Releases"       movies={newRel}    onPress={openModal} type="landscape" />
              <Row label="Top Rated"          movies={topRated}  onPress={openModal} type="portrait" />

              {/* ── Personalized: service rows ── */}
              {userServiceKeys.length > 0 && (
                <View style={{ marginTop: 32 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>On Your Services</Text>
                  </View>
                  <Text style={{ color: Colors.textFaint, fontSize: 13, paddingHorizontal: 16, marginBottom: 4 }}>
                    Curated for what you subscribe to
                  </Text>
                </View>
              )}
              {userServiceKeys.map(key => (
                <ProviderSection key={key} providerKey={key} onPress={openModal} />
              ))}

              {/* ── Movie genres ── */}
              <View style={{ marginTop: 32, paddingHorizontal: 16, marginBottom: 4 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Movies by Genre</Text>
              </View>
              <Row label="Action"    movies={action}    onPress={openModal} type="portrait" />
              <Row label="Comedy"    movies={comedy}    onPress={openModal} type="portrait" />
              <Row label="Horror"    movies={horror}    onPress={openModal} type="landscape" />
              <Row label="Sci-Fi"    movies={scifi}     onPress={openModal} type="portrait" />
              <Row label="Thriller"  movies={thriller}  onPress={openModal} type="landscape" />
              <Row label="Drama"     movies={drama}     onPress={openModal} type="portrait" />
              <Row label="Romance"   movies={romance}   onPress={openModal} type="portrait" />
              <Row label="Animation" movies={animation} onPress={openModal} type="landscape" />
              <Row label="Crime"     movies={crime}     onPress={openModal} type="portrait" />
              <Row label="Fantasy"   movies={fantasy}   onPress={openModal} type="portrait" />

              {/* ── TV Shows section ── */}
              <View style={{ marginTop: 32, paddingHorizontal: 16, marginBottom: 4 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>TV Shows</Text>
              </View>
              <Row label="Trending Shows"       movies={trendingShows} onPress={openModal} type="landscape" />
              <Row label="Top Drama Series"     movies={dramaShows}    onPress={openModal} type="portrait" />
              <Row label="Best Comedy Shows"    movies={comedyShows}   onPress={openModal} type="portrait" />
              <Row label="Crime & Thriller"     movies={crimeShows}    onPress={openModal} type="landscape" />
              <Row label="Sci-Fi & Fantasy"     movies={scifiShows}    onPress={openModal} type="portrait" />
              <Row label="Action & Adventure"   movies={actionShows}   onPress={openModal} type="portrait" />
            </ScrollView>

          ) : (
            /* ── BROWSE ── */
            <>
              {/* Provider chip row — fixed height prevents vertical clipping */}
              <View style={s.providerChipRow}>
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.providerScroll}
                >
                  <TouchableOpacity
                    style={[s.providerChip, activeProvider === 'all' && s.providerChipActive]}
                    onPress={() => setActiveProvider('all')}
                  >
                    <Text style={[s.providerChipText, activeProvider === 'all' && s.providerChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {PROVIDERS.map(p => {
                    const active = activeProvider === p.key;
                    const color  = PROVIDER_COLORS[p.label] ?? Colors.accent;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={[s.providerChip, active && { borderColor: color, borderWidth: 1.5 }]}
                        onPress={() => setActiveProvider(p.key)}
                      >
                        <Image source={p.logo} style={{ width: 16, height: 16, borderRadius: 3, marginRight: 5 }} contentFit="cover" />
                        <Text style={[s.providerChipText, active && { color }]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {activeProvider === 'all' ? (
                /* ── All genres browse ── */
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
                  {/* Movies */}
                  <View style={{ marginTop: 20, paddingHorizontal: 16, marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Movies</Text>
                  </View>
                  {MOVIE_GENRES.map((g, i) => (
                    <BrowseGenreRow key={g.id} label={g.label} genreId={g.id} type="movie" onPress={openModal} cardType={i % 3 === 0 ? 'landscape' : 'portrait'} />
                  ))}
                  {/* TV Shows */}
                  <View style={{ marginTop: 32, paddingHorizontal: 16, marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>TV Shows</Text>
                  </View>
                  {SHOW_GENRES.map((g, i) => (
                    <BrowseGenreRow key={g.id} label={g.label} genreId={g.id} type="show" onPress={openModal} cardType={i % 3 === 0 ? 'landscape' : 'portrait'} />
                  ))}
                </ScrollView>
              ) : (
                /* ── Service-specific browse ── */
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
                  <ProviderSection providerKey={activeProvider} onPress={openModal} />
                </ScrollView>
              )}
            </>
          )}
        </>
      )}

      <MovieDetailModal movieId={modalId} mediaType={modalType} onClose={() => setModalId(null)} />
    </View>
  );
}

// ── Lazy-loaded genre row for Browse tab ───────────────────────────────────────
function BrowseGenreRow({ label, genreId, type, onPress, cardType }: {
  label: string; genreId: string; type: 'movie' | 'show';
  onPress: (m: Movie) => void; cardType: 'portrait' | 'landscape';
}) {
  const [movies, setMovies] = useState<Movie[] | null>(null);

  useEffect(() => {
    const fn = type === 'show' ? discoverShows : discoverMovies;
    fn({ genre_id: genreId, sort_by: 'popularity.desc' })
      .then(r => setMovies(r.slice(0, 14))).catch(() => setMovies([]));
  }, [genreId, type]);

  if (movies !== null && movies.length === 0) return null;

  return <Row label={label} movies={movies} onPress={onPress} type={cardType} loading={movies === null} />;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080808' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  searchGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 16, gap: 10 },
  emptyText:   { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingTop: 40 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textFaint },
  tabTextActive: { color: '#fff' },
  tabLine: { position: 'absolute', bottom: 0, height: 2, width: 32, backgroundColor: Colors.accent, borderRadius: 1 },

  providerChipRow: { height: 52, justifyContent: 'center' },
  providerScroll: { paddingHorizontal: 16, alignItems: 'center' },
  providerChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 8, height: 36,
  },
  providerChipActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  providerChipText: { color: Colors.textFaint, fontSize: 13, fontWeight: '600' },
  providerChipTextActive: { color: '#fff' },
});
