import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ColdStartBanner } from '../../components/common/ColdStartBanner';
import { MovieDetailModal } from '../../components/modals/MovieDetailModal';
import {
  getTrendingMovies, getTopRatedMovies, discoverMovies, discoverShows,
  getNewReleases, searchMovies, searchShows, getServices,
  getUser, getUserStreaming,
} from '../../services/api';
import { Colors, PROVIDER_COLORS } from '../../constants/colors';
import { PROVIDERS, PROVIDER_BY_LABEL } from '../../constants/providers';
import type { Movie } from '../../types';

const { width: W } = Dimensions.get('window');
const PORTRAIT_W  = 120;
const PORTRAIT_H  = PORTRAIT_W * 1.5;
const LANDSCAPE_W = W * 0.72;
const LANDSCAPE_H = LANDSCAPE_W * 0.56;

// Search results grid — 3 even columns
const GRID_GAP  = 10;
const GRID_COLS = 3;
const GRID_PAD  = 12;
const GRID_W    = Math.floor((W - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
const GRID_H    = Math.round(GRID_W * 1.5);

const SEARCH_SUGGESTIONS = ['Action', 'Comedy', 'Horror', 'Sci-Fi', 'Marvel', 'Thriller', 'Animation', 'A24'];

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

// ── Grid card (search results / trending grid) ─────────────────────────────────
function GridCard({ movie, onPress, priority }: { movie: Movie; onPress: () => void; priority?: boolean }) {
  const uri = movie.poster?.replace(/\/t\/p\/\w+\//, '/t/p/w342/') ?? '';
  const provider = movie.streamingService ? PROVIDER_BY_LABEL[movie.streamingService] : null;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ width: GRID_W }}>
      <View style={{ width: GRID_W, height: GRID_H, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.bgCard }}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" priority={priority ? 'high' : 'normal'} /> : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="film-outline" size={22} color={Colors.textFaint} />
          </View>
        )}
        {movie.type === 'show' && (
          <View style={gc.typeTag}><Text style={gc.typeTagText}>TV</Text></View>
        )}
        {provider && (
          <View style={pc.badge}>
            <Image source={provider.logo} style={pc.badgeLogo} contentFit="cover" />
          </View>
        )}
      </View>
      <Text style={gc.title} numberOfLines={1}>{movie.title}</Text>
      {movie.year > 0 && <Text style={gc.year}>{movie.year}</Text>}
    </TouchableOpacity>
  );
}
const gc = StyleSheet.create({
  title:      { color: Colors.textPrimary, fontSize: 12, fontWeight: '600', marginTop: 6, width: GRID_W },
  year:       { color: Colors.textFaint, fontSize: 11, marginTop: 1 },
  typeTag:    { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  typeTagText:{ color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
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

// ── Featured hero carousel (swipeable) ─────────────────────────────────────────
function FeaturedHero({ movies, onPress }: { movies: Movie[]; onPress: (m: Movie) => void }) {
  const [idx, setIdx] = useState(0);
  const HERO_H = W * 0.95;
  if (!movies.length) return null;
  const heroes = movies.slice(0, 6);

  return (
    <View style={{ marginTop: 4 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
        scrollEventThrottle={16}
      >
        {heroes.map((movie, i) => {
          const uri = (movie.backdrop || movie.poster)?.replace(/\/t\/p\/\w+\//, '/t/p/w780/') ?? '';
          return (
            <TouchableOpacity key={movie.id} onPress={() => onPress(movie)} activeOpacity={0.92} style={{ width: W, height: HERO_H }}>
              <View style={{ width: W, height: HERO_H, position: 'relative' }}>
                {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" priority={i === 0 ? 'high' : 'normal'} /> : null}
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
          );
        })}
      </ScrollView>
      {heroes.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {heroes.map((_, i) => (
            <View key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.25)' }} />
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
  const [query,         setQuery]       = useState('');
  const [movieHits,     setMovieHits]   = useState<Movie[]>([]);
  const [showHits,      setShowHits]    = useState<Movie[]>([]);
  const [searchLoading, setSearching]   = useState(false);
  const [isSearching,   setIsSearching] = useState(false);
  const [searchFilter,  setSearchFilter] = useState<'all' | 'movie' | 'show'>('all');

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coldStart,  setColdStart]  = useState(false);
  const [modalId,    setModalId]    = useState<string | null>(null);
  const [modalType,  setModalType]  = useState<'movie' | 'show'>('movie');
  const [searchBottom, setSearchBottom] = useState(52); // y where the tab content begins
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
  }, []);

  // Load the user's enabled services — prefer the server (source of truth shared
  // with the Home spin + Settings), fall back to local cache. Runs on every focus
  // so toggles made elsewhere show up immediately.
  const loadServices = useCallback(async () => {
    try {
      const u = await getUser();
      let svc: Record<string, boolean> | null = null;
      if (u) svc = await getUserStreaming(u.user_id).catch(() => null);
      if (!svc || Object.keys(svc).length === 0) svc = await getServices().catch(() => ({}));
      const keys = Object.entries(svc ?? {}).filter(([, v]) => v).map(([k]) => k);
      setUserServiceKeys(keys);
    } catch {}
  }, []);

  useEffect(() => { loadAll(); }, []);
  useFocusEffect(useCallback(() => { loadServices(); }, [loadServices]));

  // Search debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setMovieHits([]); setShowHits([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const q = query.trim();
      const [movies, shows] = await Promise.allSettled([
        searchMovies(q).catch(() => []),
        searchShows(q).catch(() => []),
      ]);
      setMovieHits((movies.status === 'fulfilled' ? movies.value : []).map(m => ({ ...m, type: 'movie' as const })));
      setShowHits((shows.status === 'fulfilled' ? shows.value : []).map(m => ({ ...m, type: 'show' as const })));
      setSearching(false);
    }, 320);
  }, [query]);

  const searchResults = (
    searchFilter === 'movie' ? movieHits
    : searchFilter === 'show' ? showHits
    : [...movieHits, ...showHits]
  );

  const closeSearch = () => {
    setQuery('');
    setMovieHits([]);
    setShowHits([]);
    setSearchFilter('all');
    setIsSearching(false);
  };

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
      <View
        style={s.searchRow}
        onLayout={e => setSearchBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
      >
        <View style={[s.searchBar, isSearching && s.searchBarActive]}>
          <Ionicons name="search-outline" size={17} color={isSearching ? Colors.textMuted : Colors.textFaint} />
          <TextInput
            style={s.searchInput}
            placeholder="Search movies & shows"
            placeholderTextColor={Colors.textFaint}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsSearching(true)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>
        {isSearching && (
          <TouchableOpacity onPress={closeSearch} hitSlop={8}>
            <Text style={s.cancelSearch}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <ColdStartBanner visible={coldStart} />

      {isSearching ? (
        /* ── Search mode ── */
        query.trim().length === 0 ? (
          /* Idle: quick suggestions */
          <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.suggestLabel}>Try searching</Text>
            <View style={s.suggestWrap}>
              {SEARCH_SUGGESTIONS.map(term => (
                <TouchableOpacity key={term} style={s.suggestChip} onPress={() => setQuery(term)}>
                  <Ionicons name="search-outline" size={13} color={Colors.textFaint} />
                  <Text style={s.suggestChipText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {trending.length > 0 && (
              <>
                <Text style={[s.suggestLabel, { marginTop: 28 }]}>Trending now</Text>
                <View style={s.searchGrid}>
                  {trending.slice(0, 9).map((m, i) => (
                    <GridCard key={`t-${m.id}`} movie={m} onPress={() => openModal(m)} priority={i < 6} />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        ) : (
          /* Results */
          <View style={{ flex: 1 }}>
            <View style={s.filterRow}>
              {([
                ['all', `All${searchResults.length && !searchLoading ? ` ${movieHits.length + showHits.length}` : ''}`],
                ['movie', `Movies${movieHits.length ? ` ${movieHits.length}` : ''}`],
                ['show', `Shows${showHits.length ? ` ${showHits.length}` : ''}`],
              ] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[s.filterChip, searchFilter === key && s.filterChipActive]}
                  onPress={() => setSearchFilter(key)}
                >
                  <Text style={[s.filterChipText, searchFilter === key && s.filterChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
              {searchLoading && searchResults.length === 0
                ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
                : searchResults.length === 0
                ? (
                  <View style={s.noResults}>
                    <Ionicons name="film-outline" size={40} color={Colors.textFaint} />
                    <Text style={s.emptyText}>No results for "{query.trim()}"</Text>
                    <Text style={s.emptySubText}>Check the spelling or try a different title.</Text>
                  </View>
                )
                : (
                  <View style={s.searchGrid}>
                    {searchResults.map((m, i) => (
                      <GridCard key={`${m.type}-${m.id}-${i}`} movie={m} onPress={() => openModal(m)} priority={i < 6} />
                    ))}
                  </View>
                )
              }
            </ScrollView>
          </View>
        )
      ) : (
        <>
          {/* ── Tab selector — floats over the hero poster ── */}
          <View style={[s.segmentWrap, { top: searchBottom + 8 }]} pointerEvents="box-none">
            <View style={s.segment}>
              {(['foryou', 'browse'] as Tab[]).map(t => (
                <TouchableOpacity key={t} style={[s.segmentBtn, tab === t && s.segmentBtnActive]} onPress={() => setTab(t)} activeOpacity={0.9}>
                  <Text style={[s.segmentText, tab === t && s.segmentTextActive]}>
                    {t === 'foryou' ? 'Browse' : 'For You'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {tab === 'foryou' ? (
            /* ── FOR YOU ── */
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(true); }} tintColor={Colors.accent} />}
              contentContainerStyle={{ paddingBottom: 80 }}
            >
              <FeaturedHero movies={heroMovies} onPress={openModal} />

              {/* ── Your services first ── */}
              {userServiceKeys.length > 0 ? (
                <>
                  <View style={{ marginTop: 26, paddingHorizontal: 16, marginBottom: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>On Your Services</Text>
                    <Text style={{ color: Colors.textFaint, fontSize: 13, marginTop: 2 }}>
                      Straight from what you subscribe to
                    </Text>
                  </View>
                  {userServiceKeys.map(key => (
                    <ProviderSection key={key} providerKey={key} onPress={openModal} />
                  ))}
                </>
              ) : (
                <TouchableOpacity style={s.servicesCta} onPress={() => setTab('browse')} activeOpacity={0.85}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.servicesCtaTitle}>Add your streaming services</Text>
                    <Text style={s.servicesCtaSub}>Get a feed tailored to what you can actually watch.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
                </TouchableOpacity>
              )}

              {/* ── Popular across everything ── */}
              <View style={{ marginTop: 32, paddingHorizontal: 16, marginBottom: 4 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>Popular Right Now</Text>
              </View>
              <Row label="Trending This Week" movies={trending}  onPress={openModal} type="portrait" />
              <Row label="New Releases"       movies={newRel}    onPress={openModal} type="landscape" />
              <Row label="Top Rated"          movies={topRated}  onPress={openModal} type="portrait" />

              {/* ── Movie genres ── */}
              <View style={{ marginTop: 32, paddingHorizontal: 16, marginBottom: 4 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>Movies by Genre</Text>
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
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>TV Shows</Text>
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
              {/* Spacer so the floating tab pill doesn't cover the chips */}
              <View style={{ height: 46 }} />
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

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 8, marginTop: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchBarActive: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.09)' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, padding: 0 },
  cancelSearch: { color: Colors.accent, fontSize: 15, fontWeight: '600' },

  searchGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_PAD, paddingTop: 14, columnGap: GRID_GAP, rowGap: 16 },

  // Search filter chips
  filterRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  filterChip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#0A0A0A' },

  // Idle suggestions
  suggestLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, marginBottom: 12 },
  suggestWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  suggestChip:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  suggestChipText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },

  // Empty
  noResults:   { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyText:   { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  emptySubText:{ color: Colors.textFaint, fontSize: 13, textAlign: 'center' },

  // Floating segmented tab selector — overlays the hero poster
  segmentWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20, elevation: 20 },
  segment: {
    flexDirection: 'row', backgroundColor: 'rgba(10,10,12,0.55)', borderRadius: 22, padding: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  segmentBtn: { paddingHorizontal: 24, paddingVertical: 7, borderRadius: 18 },
  segmentBtnActive: { backgroundColor: '#fff' },
  segmentText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  segmentTextActive: { color: '#0A0A0A' },

  // Add-services prompt (For You, no services yet)
  servicesCta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 24, padding: 14, borderRadius: 16, backgroundColor: 'rgba(212,168,67,0.08)', borderWidth: 1, borderColor: `${Colors.accent}30` },
  servicesCtaTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  servicesCtaSub: { color: Colors.textFaint, fontSize: 12.5, marginTop: 2, lineHeight: 17 },

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
