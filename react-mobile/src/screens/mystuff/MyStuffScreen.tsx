import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MovieDetailModal } from '../../components/modals/MovieDetailModal';
import { getWatchedMovies, getWatchLater, getUser, getMovieDetails } from '../../services/api';
import { Colors } from '../../constants/colors';
import type { WatchedMovie, CurrentUser } from '../../types';

const { width: W } = Dimensions.get('window');

type Tab   = 'movies' | 'shows' | 'watchlist' | 'stats';
type Sort  = 'recent' | 'ratingHigh' | 'ratingLow' | 'title';

const SORT_OPTIONS: { id: Sort; label: string }[] = [
  { id: 'recent',     label: 'Recent' },
  { id: 'ratingHigh', label: 'Highest' },
  { id: 'ratingLow',  label: 'Lowest' },
  { id: 'title',      label: 'A-Z' },
];

function tmdbPoster(url: string, size = 'w185') {
  return url ? url.replace(/\/t\/p\/\w+\//, `/t/p/${size}/`) : '';
}

// ── Watched item row ──────────────────────────────────────────────────────────
function WatchedRow({ item, onPress }: { item: WatchedMovie; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      <Image source={{ uri: tmdbPoster(item.poster) }} style={s.rowPoster} contentFit="cover" />
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={s.rowMeta}>
          {[item.year > 0 ? String(item.year) : '', item.genres[0]].filter(Boolean).join(' · ')}
        </Text>
        {item.user_rating > 0 && (
          <View style={s.rowRatingRow}>
            <Ionicons name="star" size={11} color={Colors.accent} />
            <Text style={s.rowRating}>{item.user_rating}/10</Text>
          </View>
        )}
        {item.comment ? (
          <Text style={s.rowComment} numberOfLines={2}>{item.comment}</Text>
        ) : null}
      </View>
      <View style={s.rowRight}>
        <Text style={s.rowDate}>
          {new Date(item.watched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textFaint} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

// ── Watchlist tab ─────────────────────────────────────────────────────────────
function WatchlistTab({
  ids, onOpenModal, onRefresh, refreshing,
}: {
  ids: string[];
  onOpenModal: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const TILE_W = (W - 52) / 3;
  const TILE_H = TILE_W * 1.5;

  const [items, setItems] = useState<{ id: string; title: string; poster: string | null; year: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ids.length) { setLoading(false); return; }
    setLoading(true);
    Promise.all(
      ids.slice(0, 150).map(id =>
        getMovieDetails(String(id))
          .then(d => ({
            id: String(id),
            title: ((d?.title ?? (d as any)?.name ?? 'Unknown') as string),
            year: d?.release_date ? String(d.release_date).slice(0, 4) : '',
            poster: (d as any)?.poster_path ? `https://image.tmdb.org/t/p/w342${(d as any).poster_path}` : null,
          }))
          .catch(() => ({ id: String(id), title: '?', year: '', poster: null }))
      )
    ).then(resolved => {
      setItems(resolved);
      setLoading(false);
    });
  }, [ids]);

  if (loading) {
    return <ActivityIndicator color={Colors.accent} style={{ marginTop: 48 }} />;
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      {items.length === 0 ? (
        <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 24, lineHeight: 22 }}>
          Save movies from Discover or Roulette to watch later.
        </Text>
      ) : (
        <>
          <Text style={{ color: Colors.textFaint, fontSize: 13, marginBottom: 14 }}>{items.length} saved</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {items.map(item => (
              <TouchableOpacity key={item.id} onPress={() => onOpenModal(item.id)} activeOpacity={0.8}>
                <View style={{ width: TILE_W, height: TILE_H, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border }}>
                  {item.poster ? (
                    <Image source={{ uri: item.poster }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="film-outline" size={24} color={Colors.textFaint} />
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={{ color: Colors.textPrimary, fontSize: 11, fontWeight: '600', marginTop: 5, width: TILE_W }}>{item.title}</Text>
                {item.year ? <Text style={{ color: Colors.textFaint, fontSize: 10, marginTop: 1 }}>{item.year}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────
function StatsTab({ movies, shows }: { movies: WatchedMovie[]; shows: WatchedMovie[] }) {
  const all = [...movies, ...shows];
  const rated = all.filter(m => m.user_rating > 0);
  const avg = rated.length
    ? (rated.reduce((sum, m) => sum + m.user_rating, 0) / rated.length).toFixed(1)
    : '—';

  // Estimated watch time: movies ~105min, shows ~45min
  const totalMinutes = movies.length * 105 + shows.length * 45;
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays  = (totalHours / 24).toFixed(1);

  // Rating distribution
  const dist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) dist[i] = 0;
  rated.forEach(m => { const r = Math.round(m.user_rating); if (r >= 1 && r <= 10) dist[r]++; });
  const maxD = Math.max(...Object.values(dist), 1);

  // Genre frequency
  const genreMap: Record<string, number> = {};
  all.forEach(m => m.genres?.forEach(g => { genreMap[g] = (genreMap[g] ?? 0) + 1; }));
  const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGenre  = topGenres[0]?.[1] ?? 1;

  // Director frequency
  const directorMap: Record<string, number> = {};
  all.forEach(m => { if (m.director) directorMap[m.director] = (directorMap[m.director] ?? 0) + 1; });
  const topDirectors = Object.entries(directorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Actor frequency
  const actorMap: Record<string, number> = {};
  all.forEach(m => m.actors?.slice(0, 3).forEach(a => { actorMap[a] = (actorMap[a] ?? 0) + 1; }));
  const topActors = Object.entries(actorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Streaming service breakdown
  const serviceMap: Record<string, number> = {};
  all.forEach(m => m.services?.forEach(sv => { serviceMap[sv] = (serviceMap[sv] ?? 0) + 1; }));
  const topServices = Object.entries(serviceMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Best rated (user rating >= 8)
  const bestRated = [...rated].sort((a, b) => b.user_rating - a.user_rating).slice(0, 6);

  // Monthly activity (last 12 months)
  const monthMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = 0;
  }
  all.forEach(m => {
    const d = new Date(m.watched_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in monthMap) monthMap[key]++;
  });
  const months = Object.entries(monthMap);
  const maxMonth = Math.max(...months.map(([, v]) => v), 1);

  // Decade breakdown
  const decadeMap: Record<string, number> = {};
  all.forEach(m => {
    if (m.year > 0) {
      const decade = `${Math.floor(m.year / 10) * 10}s`;
      decadeMap[decade] = (decadeMap[decade] ?? 0) + 1;
    }
  });
  const topDecades = Object.entries(decadeMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (all.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Ionicons name="bar-chart-outline" size={48} color={Colors.textFaint} />
        <Text style={{ color: Colors.textMuted, fontSize: 16, marginTop: 16, textAlign: 'center' }}>
          Log some movies and shows to see your stats.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.statsWrap} showsVerticalScrollIndicator={false}>

      {/* ── Hero numbers ── */}
      <View style={s.heroRow}>
        <View style={s.heroCard}>
          <Text style={s.heroNum}>{movies.length + shows.length}</Text>
          <Text style={s.heroLabel}>Total Watched</Text>
        </View>
        <View style={s.heroCard}>
          <Text style={s.heroNum}>{totalHours >= 1000 ? `${(totalHours/1000).toFixed(1)}k` : totalHours}h</Text>
          <Text style={s.heroLabel}>~{totalDays} days</Text>
        </View>
        <View style={s.heroCard}>
          <Text style={s.heroNum}>{avg}</Text>
          <Text style={s.heroLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* ── Movies vs Shows split ── */}
      <View style={s.splitRow}>
        {[
          { label: 'Movies', count: movies.length, color: Colors.accent },
          { label: 'Shows',  count: shows.length,  color: '#6C5CE7' },
        ].map(item => (
          <View key={item.label} style={s.splitCard}>
            <Text style={[s.splitNum, { color: item.color }]}>{item.count}</Text>
            <Text style={s.splitLabel}>{item.label}</Text>
            <View style={s.splitBar}>
              <View style={[s.splitFill, {
                width: `${all.length ? (item.count / all.length) * 100 : 0}%` as any,
                backgroundColor: item.color,
              }]} />
            </View>
          </View>
        ))}
      </View>

      {/* ── Activity by month ── */}
      <Text style={s.statSection}>Monthly Activity</Text>
      <View style={s.activityGrid}>
        {months.map(([key, count]) => {
          const monthName = new Date(key + '-01').toLocaleString('en-US', { month: 'short' });
          return (
            <View key={key} style={s.activityCol}>
              <View style={s.activityTrack}>
                <View style={[s.activityFill, { height: `${(count / maxMonth) * 100}%` as any }]} />
              </View>
              <Text style={s.activityLabel}>{monthName}</Text>
              {count > 0 && <Text style={s.activityCount}>{count}</Text>}
            </View>
          );
        })}
      </View>

      {/* ── Rating distribution ── */}
      <Text style={s.statSection}>Your Ratings</Text>
      <View style={s.distWrap}>
        {Object.entries(dist).reverse().map(([r, count]) => (
          <View key={r} style={s.distRow}>
            <Text style={s.distLabel}>{r}★</Text>
            <View style={s.distTrack}>
              <View style={[s.distFill, { width: `${(count / maxD) * 100}%` as any,
                backgroundColor: Number(r) >= 8 ? '#10b981' : Number(r) >= 5 ? Colors.accent : '#ef4444',
              }]} />
            </View>
            <Text style={s.distCount}>{count}</Text>
          </View>
        ))}
      </View>

      {/* ── Top genres ── */}
      {topGenres.length > 0 && (
        <>
          <Text style={s.statSection}>Top Genres</Text>
          <View style={s.distWrap}>
            {topGenres.map(([g, count]) => (
              <View key={g} style={s.distRow}>
                <Text style={[s.distLabel, { width: 100 }]}>{g}</Text>
                <View style={s.distTrack}>
                  <View style={[s.distFill, { width: `${(count / maxGenre) * 100}%` as any, backgroundColor: '#6C5CE7' }]} />
                </View>
                <Text style={s.distCount}>{count}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Best rated movies ── */}
      {bestRated.length > 0 && (
        <>
          <Text style={s.statSection}>Your Best Rated</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, gap: 10, paddingBottom: 4 }}>
            {bestRated.map(m => (
              <View key={m.movie_id} style={s.bestCard}>
                {m.poster ? (
                  <Image source={{ uri: tmdbPoster(m.poster, 'w185') }} style={s.bestPoster} contentFit="cover" />
                ) : (
                  <View style={[s.bestPoster, { backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="film-outline" size={20} color={Colors.textFaint} />
                  </View>
                )}
                <View style={s.bestRatingBadge}>
                  <Text style={s.bestRatingText}>{m.user_rating}</Text>
                </View>
                <Text style={s.bestTitle} numberOfLines={2}>{m.title}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* ── Top directors ── */}
      {topDirectors.length > 0 && (
        <>
          <Text style={s.statSection}>Favourite Directors</Text>
          <View style={s.listCards}>
            {topDirectors.map(([name, count], i) => (
              <View key={name} style={s.listCard}>
                <Text style={s.listRank}>#{i + 1}</Text>
                <Text style={s.listName}>{name}</Text>
                <Text style={s.listCount}>{count} film{count > 1 ? 's' : ''}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Top actors ── */}
      {topActors.length > 0 && (
        <>
          <Text style={s.statSection}>Most Watched Actors</Text>
          <View style={s.listCards}>
            {topActors.map(([name, count], i) => (
              <View key={name} style={s.listCard}>
                <Text style={s.listRank}>#{i + 1}</Text>
                <Text style={s.listName}>{name}</Text>
                <Text style={s.listCount}>{count} title{count > 1 ? 's' : ''}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Streaming services ── */}
      {topServices.length > 0 && (
        <>
          <Text style={s.statSection}>By Streaming Service</Text>
          <View style={s.distWrap}>
            {topServices.map(([sv, count]) => (
              <View key={sv} style={s.distRow}>
                <Text style={[s.distLabel, { width: 100 }]}>{sv || 'Unknown'}</Text>
                <View style={s.distTrack}>
                  <View style={[s.distFill, { width: `${(count / (topServices[0][1])) * 100}%` as any, backgroundColor: '#00b894' }]} />
                </View>
                <Text style={s.distCount}>{count}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Era / decade breakdown ── */}
      {topDecades.length > 0 && (
        <>
          <Text style={s.statSection}>By Era</Text>
          <View style={s.genreWrap}>
            {topDecades.map(([decade, count]) => (
              <View key={decade} style={s.genrePill}>
                <Text style={s.genreText}>{decade}</Text>
                <Text style={s.genreCount}>{count}</Text>
              </View>
            ))}
          </View>
        </>
      )}

    </ScrollView>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function MyStuffScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab]         = useState<Tab>('movies');
  const [sort, setSort]       = useState<Sort>('recent');
  const [watched, setWatched] = useState<WatchedMovie[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalId, setModalId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'movie' | 'show'>('movie');

  const movies = watched.filter(m => m.media_type !== 'show' && (m as any).type !== 'show');
  const shows  = watched.filter(m => m.media_type === 'show' || (m as any).type === 'show');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const user = await getUser();
    if (user) {
      const [w, wl] = await Promise.all([
        getWatchedMovies(user.user_id, 500),
        getWatchLater(user.user_id),
      ]);
      setWatched(w);
      setWatchlistIds(wl);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  const applySort = (list: WatchedMovie[]) => {
    return [...list].sort((a, b) => {
      if (sort === 'ratingHigh') return b.user_rating - a.user_rating;
      if (sort === 'ratingLow')  return a.user_rating - b.user_rating;
      if (sort === 'title')      return a.title.localeCompare(b.title);
      return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
    });
  };

  const openModal = (item: WatchedMovie) => {
    setModalId(item.movie_id);
    setModalType(item.media_type === 'show' ? 'show' : 'movie');
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'movies',    label: 'Movies',    count: movies.length },
    { id: 'shows',     label: 'Shows',     count: shows.length },
    { id: 'watchlist', label: 'Watchlist', count: watchlistIds.length },
    { id: 'stats',     label: 'Stats' },
  ];

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  const currentList = applySort(tab === 'movies' ? movies : shows);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <Text style={s.screenTitle}>My Stuff</Text>

      {/* Tab row — tap to switch, no scroll */}
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={s.tabBtn} onPress={() => setTab(t.id)}>
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>
              {t.label}{t.count !== undefined ? ` ${t.count}` : ''}
            </Text>
            {tab === t.id && <View style={s.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort row — wrapped in fixed-height View to prevent vertical clipping */}
      {(tab === 'movies' || tab === 'shows') && (
        <View style={s.sortWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortRow}>
            {SORT_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.id}
                style={[s.sortBtn, sort === o.id && s.sortBtnActive]}
                onPress={() => setSort(o.id)}
              >
                <Text style={[s.sortText, sort === o.id && s.sortTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {tab === 'movies' && (
        <FlatList
          data={currentList}
          keyExtractor={m => m.movie_id}
          renderItem={({ item }) => <WatchedRow item={item} onPress={() => openModal(item)} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Colors.accent} />}
          ListEmptyComponent={<Text style={s.emptyText}>No movies logged yet.</Text>}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {tab === 'shows' && (
        <FlatList
          data={currentList}
          keyExtractor={m => m.movie_id}
          renderItem={({ item }) => <WatchedRow item={item} onPress={() => openModal(item)} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Colors.accent} />}
          ListEmptyComponent={<Text style={s.emptyText}>No TV shows logged yet.</Text>}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {tab === 'watchlist' && (
        <WatchlistTab
          ids={watchlistIds}
          onOpenModal={id => { setModalId(id); setModalType('movie'); }}
          onRefresh={() => { setRefreshing(true); load(true); }}
          refreshing={refreshing}
        />
      )}

      {tab === 'stats' && <StatsTab movies={movies} shows={shows} />}

      <MovieDetailModal movieId={modalId} mediaType={modalType} onClose={() => setModalId(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  screenTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textFaint },
  tabTextActive: { color: Colors.textPrimary },
  tabIndicator: { position: 'absolute', bottom: 0, left: '25%', right: '25%', height: 2, backgroundColor: Colors.accent, borderRadius: 1 },

  sortWrap: { height: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  sortRow: { paddingHorizontal: 16, alignItems: 'center' },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, marginRight: 8, height: 34 },
  sortBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  sortText: { color: Colors.textFaint, fontSize: 13, fontWeight: '600' },
  sortTextActive: { color: '#0A0A0A' },

  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowPoster: { width: 48, height: 72, borderRadius: 8, backgroundColor: Colors.bgCard, flexShrink: 0 },
  rowBody: { flex: 1, justifyContent: 'center' },
  rowTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 3, lineHeight: 20 },
  rowMeta: { color: Colors.textFaint, fontSize: 12, marginBottom: 4 },
  rowRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowRating: { color: Colors.accent, fontSize: 12, fontWeight: '600' },
  rowComment: { color: Colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  rowRight: { alignItems: 'flex-end', justifyContent: 'center' },
  rowDate: { color: Colors.textFaint, fontSize: 11 },


  emptyText: { color: Colors.textMuted, fontSize: 14, lineHeight: 22, paddingTop: 32, textAlign: 'center' },

  statsWrap: { padding: 16, paddingBottom: 100 },
  statCards: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textFaint },
  statSection: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginTop: 4 },
  distWrap: { gap: 7, marginBottom: 24 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: { width: 18, color: Colors.textFaint, fontSize: 12, textAlign: 'right' },
  distTrack: { flex: 1, height: 6, backgroundColor: Colors.bgElevated, borderRadius: 3, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  distCount: { width: 22, color: Colors.textFaint, fontSize: 12 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genrePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  genreText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  genreCount: { color: Colors.textFaint, fontSize: 12 },

  // Enhanced stats
  heroRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  heroCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  heroNum:  { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  heroLabel:{ fontSize: 11, color: Colors.textFaint, textAlign: 'center' },

  splitRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  splitCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  splitNum:  { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  splitLabel:{ color: Colors.textFaint, fontSize: 12, marginBottom: 8 },
  splitBar:  { height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2, overflow: 'hidden' },
  splitFill: { height: '100%', borderRadius: 2 },

  activityGrid: { flexDirection: 'row', gap: 4, height: 80, alignItems: 'flex-end', marginBottom: 24 },
  activityCol:  { flex: 1, alignItems: 'center', gap: 3 },
  activityTrack:{ width: '100%', flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  activityFill: { width: '100%', backgroundColor: Colors.accent, borderRadius: 3, minHeight: 2 },
  activityLabel:{ color: Colors.textFaint, fontSize: 8, textAlign: 'center' },
  activityCount:{ color: Colors.accent, fontSize: 8, fontWeight: '700' },

  bestCard:  { width: 100, marginRight: 0 },
  bestPoster:{ width: 100, height: 150, borderRadius: 10 },
  bestRatingBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bestRatingText: { color: '#fbbf24', fontSize: 11, fontWeight: '800' },
  bestTitle: { color: Colors.textPrimary, fontSize: 11, fontWeight: '600', marginTop: 5, lineHeight: 14 },

  listCards: { gap: 8, marginBottom: 4 },
  listCard:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  listRank:  { color: Colors.accent, fontSize: 13, fontWeight: '800', width: 26 },
  listName:  { flex: 1, color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  listCount: { color: Colors.textFaint, fontSize: 12 },
});
