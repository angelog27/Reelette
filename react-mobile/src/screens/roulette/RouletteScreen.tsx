import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Dimensions, Alert, Animated, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  discoverMovies, discoverShows, logRouletteSpin,
  getServices, saveServices, updateUserStreaming, getUser, getUserStreaming,
  getSmartSpinStatus, doSmartSpin,
} from '../../services/api';
import { MovieDetailModal } from '../../components/modals/MovieDetailModal';
import { ColdStartBanner } from '../../components/common/ColdStartBanner';
import { RainbowBorder } from '../../components/common/RainbowBorder';
import { Colors, PROVIDER_COLORS } from '../../constants/colors';
import { GENRES, PROVIDERS } from '../../constants/providers';
import type { Movie } from '../../types';

const { width: W } = Dimensions.get('window');

// 4-per-row grid with gaps
const GAP  = 10;
const COLS = 4;
const TILE = (W - 32 - GAP * (COLS - 1)) / COLS;

const RATINGS = [
  { label: 'Any', value: 0 },
  { label: '6+',  value: 6 },
  { label: '7+',  value: 7 },
  { label: '7.5+',value: 7.5 },
  { label: '8+',  value: 8 },
];

export function RouletteScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [services, setServices]       = useState<Record<string, boolean>>({});
  const [mediaType, setMediaType]     = useState<'movie' | 'show'>('movie');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setGenre]     = useState('');
  const [minRating, setMinRating]     = useState(0);
  const [result, setResult]           = useState<Movie | null>(null);
  const [spinning, setSpinning]       = useState(false);
  const [coldStart, setColdStart]     = useState(false);
  const [modalId, setModalId]         = useState<string | null>(null);
  const [history, setHistory]         = useState<Set<string>>(new Set());

  // ── Smart Watch (Groq-powered) ──
  const [smartAvailable, setSmartAvailable] = useState(true);
  const [hoursUntilReset, setHoursUntilReset] = useState(0);
  const [smartLoading, setSmartLoading]     = useState(false);
  const [smartResting, setSmartResting]     = useState(false);
  const [smartPrefs, setSmartPrefs]         = useState('');
  const [smartResult, setSmartResult]       = useState<{ movie: Movie; reason: string } | null>(null);
  const [smartError, setSmartError]         = useState('');

  const filterAnim = useRef(new Animated.Value(0)).current;
  const spinScale  = useRef(new Animated.Value(1)).current;

  // Load enabled services on focus — prefer the server (shared with Settings),
  // fall back to local cache. Keeps Home, Discover and Settings in sync.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const u = await getUser();
        let svc: Record<string, boolean> | null = null;
        if (u) svc = await getUserStreaming(u.user_id).catch(() => null);
        if (!svc || Object.keys(svc).length === 0) svc = await getServices().catch(() => ({}));
        if (alive) setServices(svc ?? {});
      })();
      return () => { alive = false; };
    }, [])
  );

  useEffect(() => {
    getSmartSpinStatus()
      .then(st => { setSmartAvailable(st.available); setHoursUntilReset(st.hoursUntilReset); })
      .catch(() => {});
  }, []);

  const handleSmartSpin = useCallback(async () => {
    if (smartLoading || smartResting) return;
    setSmartLoading(true);
    setSmartError('');
    setSmartResult(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const prefs = smartPrefs.trim() ? [smartPrefs.trim()] : [];
      const res = await doSmartSpin(prefs, '', selectedGenre);
      if (!res?.movie) throw new Error('empty');
      setSmartResult({ movie: res.movie, reason: res.reason });
      setSmartAvailable(false);
      setHoursUntilReset(24);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const user = await getUser();
      if (user) logRouletteSpin(user.user_id, res.movie.id, res.movie.title, res.movie.poster).catch(() => {});
    } catch {
      setSmartError('Smart Watch is resting — try again in a bit.');
      setSmartResting(true);
      setTimeout(() => { setSmartResting(false); setSmartError(''); }, 30000);
    } finally {
      setSmartLoading(false);
    }
  }, [smartLoading, smartResting, smartPrefs, selectedGenre]);

  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: showFilters ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [showFilters]);

  const toggleService = useCallback(async (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...services, [key]: !services[key] };
    setServices(next);
    await saveServices(next);
    const user = await getUser();
    if (user) updateUserStreaming(user.user_id, next).catch(() => {});
  }, [services]);

  const handleSpin = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setColdStart(false);

    Animated.sequence([
      Animated.timing(spinScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(spinScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();

    const cold = setTimeout(() => setColdStart(true), 3000);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Only pass services that are explicitly enabled
      const activeServices = Object.fromEntries(
        Object.entries(services).filter(([, v]) => v === true)
      );
      const hasServices = Object.keys(activeServices).length > 0;

      const filters: Record<string, unknown> = {
        sort_by: 'popularity.desc',
        ...(selectedGenre ? { genre_id: selectedGenre } : {}),
        ...(minRating > 0 ? { min_rating: minRating } : {}),
        ...(hasServices ? { services_filter: activeServices } : {}),
      };

      const movies = mediaType === 'show'
        ? await discoverShows(filters as any)
        : await discoverMovies(filters as any);

      const fresh = movies.filter(m => !history.has(m.id));
      const pool  = fresh.length > 0 ? fresh : movies;

      if (!pool.length) {
        Alert.alert('No results', 'Try different filters or enable more streaming services.');
        setSpinning(false);
        clearTimeout(cold);
        setColdStart(false);
        return;
      }

      const picked = pool[Math.floor(Math.random() * Math.min(pool.length, 20))];
      setResult(picked);
      setHistory(prev => new Set([...prev, picked.id]));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const user = await getUser();
      if (user) logRouletteSpin(user.user_id, picked.id, picked.title, picked.poster);
    } catch {
      Alert.alert('Error', 'Could not fetch movies. Try again in a moment.');
    } finally {
      clearTimeout(cold);
      setColdStart(false);
      setSpinning(false);
    }
  }, [spinning, services, mediaType, selectedGenre, minRating, history]);

  const activeCount    = Object.values(services).filter(Boolean).length;
  const hasActiveFilter = !!selectedGenre || minRating > 0;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Headline ── */}
        <View style={s.headline}>
          <Text style={s.headlineMain}>What can you</Text>
          <Text style={s.headlineMain}>watch tonight?</Text>
          <Text style={s.headlineSub}>Toggle your services, pick a mood, find something great.</Text>
        </View>

        <ColdStartBanner visible={coldStart} />

        {/* ── Media type toggle ── */}
        <View style={s.toggleWrap}>
          <View style={s.togglePill}>
            {(['movie', 'show'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[s.toggleBtn, mediaType === type && s.toggleBtnActive]}
                onPress={() => setMediaType(type)}
              >
                <Text style={[s.toggleText, mediaType === type && s.toggleTextActive]}>
                  {type === 'movie' ? 'Movies' : 'TV Shows'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Streaming services ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>Streaming Services</Text>
            {activeCount > 0 && (
              <Text style={s.sectionCount}>{activeCount} active</Text>
            )}
          </View>
          <Text style={s.sectionHint}>Tap to toggle on/off for the spin</Text>
          <View style={s.serviceGrid}>
            {PROVIDERS.map(p => {
              const active = !!services[p.key];
              const color  = PROVIDER_COLORS[p.label] ?? Colors.accent;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => toggleService(p.key)}
                  activeOpacity={0.75}
                  style={[
                    s.serviceTile,
                    active && {
                      borderColor: color,
                      borderWidth: 2,
                      shadowColor: color,
                      shadowOpacity: 0.55,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 0 },
                    },
                    !active && s.serviceTileOff,
                  ]}
                  accessibilityLabel={`${active ? 'Disable' : 'Enable'} ${p.label}`}
                >
                  <Image
                    source={p.logo}
                    style={[s.serviceLogo, !active && s.serviceLogoOff]}
                    contentFit="cover"
                  />
                  {active && (
                    <View style={[s.glowRing, { shadowColor: color }]} pointerEvents="none" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Filters toggle ── */}
        <View style={s.section}>
          <TouchableOpacity
            style={[s.filtersBtn, hasActiveFilter && s.filtersBtnActive]}
            onPress={() => setShowFilters(v => !v)}
          >
            <Ionicons
              name={hasActiveFilter ? 'options' : 'options-outline'}
              size={16}
              color={hasActiveFilter ? Colors.accent : Colors.textMuted}
            />
            <Text style={[s.filtersBtnText, hasActiveFilter && { color: Colors.accent }]}>
              {hasActiveFilter ? 'Filters active' : 'Filters'}
            </Text>
            <Ionicons
              name={showFilters ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={hasActiveFilter ? Colors.accent : Colors.textFaint}
              style={{ marginLeft: 'auto' as any }}
            />
          </TouchableOpacity>

          {showFilters && (
            <View style={s.filtersPanel}>
              <Text style={s.filterLabel}>Genre</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
                <TouchableOpacity
                  style={[s.pill, !selectedGenre && s.pillActive]}
                  onPress={() => setGenre('')}
                >
                  <Text style={[s.pillText, !selectedGenre && s.pillTextActive]}>Any</Text>
                </TouchableOpacity>
                {GENRES.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={[s.pill, selectedGenre === g.id && s.pillActive]}
                    onPress={() => setGenre(selectedGenre === g.id ? '' : g.id)}
                  >
                    <Text style={[s.pillText, selectedGenre === g.id && s.pillTextActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[s.filterLabel, { marginTop: 14 }]}>Min Rating</Text>
              <View style={s.pillRow}>
                {RATINGS.map(r => (
                  <TouchableOpacity
                    key={r.value}
                    style={[s.pill, minRating === r.value && s.pillActive]}
                    onPress={() => setMinRating(r.value)}
                  >
                    <Text style={[s.pillText, minRating === r.value && s.pillTextActive]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {hasActiveFilter && (
                <TouchableOpacity
                  style={s.clearFilters}
                  onPress={() => { setGenre(''); setMinRating(0); }}
                >
                  <Text style={s.clearFiltersText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Spin button ── */}
        <View style={s.section}>
          <Animated.View style={{ transform: [{ scale: spinScale }] }}>
            <TouchableOpacity
              style={[s.spinBtn, spinning && s.spinBtnDisabled]}
              onPress={handleSpin}
              disabled={spinning}
              activeOpacity={0.88}
            >
              {spinning ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <>
                  <Ionicons name="shuffle" size={20} color="#0A0A0A" />
                  <Text style={s.spinBtnText}>Spin the Reel</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Smart Watch (Groq-powered) ── */}
        <View style={s.section}>
          <RainbowBorder radius={20} borderWidth={2} bg="#0b0b0d" duration={smartLoading ? 2 : 6}>
            <View style={s.smartInner}>
              <View style={s.smartHead}>
                <View style={s.smartMark}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                </View>
                <Text style={s.smartTitle}>Smart Watch</Text>
                <Text style={s.smartStatus}>
                  {smartAvailable ? '1 use left today' : `Resets in ${hoursUntilReset}h`}
                </Text>
              </View>
              <Text style={s.smartSub}>Tell me your mood — I'll pick something and tell you why.</Text>

              <TextInput
                style={s.smartInput}
                value={smartPrefs}
                onChangeText={setSmartPrefs}
                maxLength={300}
                editable={!smartLoading}
                multiline
                placeholder="e.g. something funny but smart, under 2 hours…"
                placeholderTextColor={Colors.textFaint}
              />

              <TouchableOpacity
                style={[s.smartBtn, (smartLoading || smartResting || !smartAvailable) && s.smartBtnMuted]}
                onPress={handleSmartSpin}
                disabled={smartLoading || smartResting || !smartAvailable}
                activeOpacity={0.9}
              >
                {smartLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="sparkles" size={15} color={smartAvailable ? '#fff' : Colors.textFaint} />}
                <Text style={[s.smartBtnText, !smartAvailable && !smartLoading && { color: Colors.textFaint }]}>
                  {smartLoading ? 'Finding your perfect pick…'
                    : smartResting ? 'Resting…'
                    : smartAvailable ? 'Ask Smart Watch'
                    : 'Come back tomorrow'}
                </Text>
              </TouchableOpacity>

              {!!smartError && <Text style={s.smartErr}>{smartError}</Text>}

              {smartResult && (
                <TouchableOpacity style={s.smartResult} activeOpacity={0.9} onPress={() => setModalId(smartResult.movie.id)}>
                  <View style={s.smartResRow}>
                    {smartResult.movie.poster ? (
                      <Image source={{ uri: smartResult.movie.poster }} style={s.smartPoster} contentFit="cover" />
                    ) : (
                      <View style={[s.smartPoster, s.smartPosterEmpty]}>
                        <Ionicons name="film-outline" size={18} color={Colors.textFaint} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.smartResTitle} numberOfLines={2}>{smartResult.movie.title}</Text>
                      <View style={s.smartResMeta}>
                        {smartResult.movie.year > 0 && <Text style={s.smartResMetaText}>{smartResult.movie.year}</Text>}
                        {smartResult.movie.rating > 0 && <Text style={s.smartResStar}>★ {smartResult.movie.rating.toFixed(1)}</Text>}
                      </View>
                      <Text style={s.smartReason} numberOfLines={5}>“{smartResult.reason}”</Text>
                    </View>
                  </View>
                  <View style={s.groqRow}>
                    <Ionicons name="sparkles" size={10} color={Colors.textFaint} />
                    <Text style={s.groqText}>Powered by Groq</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </RainbowBorder>
        </View>

        {/* ── Result card ── */}
        {result && (
          <View style={s.resultWrap}>
            <TouchableOpacity
              style={s.resultCard}
              onPress={() => setModalId(result.id)}
              activeOpacity={0.93}
            >
              <View style={s.resultPosterWrap}>
                <Image source={{ uri: result.poster }} style={s.resultPoster} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.9)']}
                  style={s.resultGradient}
                />
                {result.streamingService && (
                  <View style={[s.streamBadge, { borderColor: `${PROVIDER_COLORS[result.streamingService] ?? Colors.accent}60` }]}>
                    <Text style={[s.streamText, { color: PROVIDER_COLORS[result.streamingService] ?? Colors.accent }]}>
                      {result.streamingService}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.resultInfo}>
                <Text style={s.resultTitle} numberOfLines={2}>{result.title}</Text>
                <View style={s.resultMeta}>
                  {result.year > 0 && <Text style={s.resultMetaText}>{result.year}</Text>}
                  {result.genres[0] && <Text style={s.resultMetaDot}>·</Text>}
                  {result.genres[0] && <Text style={s.resultMetaText}>{result.genres[0]}</Text>}
                  {result.rating > 0 && <Text style={s.resultMetaDot}>·</Text>}
                  {result.rating > 0 && (
                    <View style={s.resultRatingRow}>
                      <Ionicons name="star" size={11} color="#fbbf24" />
                      <Text style={s.resultRating}>{result.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                {result.overview ? (
                  <Text style={s.resultOverview} numberOfLines={3}>{result.overview}</Text>
                ) : null}
                <Text style={s.tapHint}>Tap to see details →</Text>
              </View>
            </TouchableOpacity>

            <View style={s.voteRow}>
              <TouchableOpacity
                style={s.voteSkip}
                onPress={() => { setResult(null); handleSpin(); }}
              >
                <Ionicons name="close" size={20} color={Colors.textMuted} />
                <Text style={s.voteSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.voteWatch}
                onPress={() => setModalId(result.id)}
              >
                <Ionicons name="checkmark" size={20} color="#0A0A0A" />
                <Text style={s.voteWatchText}>I'm watching this</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      <MovieDetailModal
        movieId={modalId}
        mediaType={mediaType}
        onClose={() => setModalId(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080808' },
  scroll: { paddingBottom: 60 },

  headline: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  headlineMain: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 38, letterSpacing: -0.5 },
  headlineSub: { fontSize: 14, color: Colors.textFaint, marginTop: 8, lineHeight: 20 },

  toggleWrap: { paddingHorizontal: 20, marginTop: 20 },
  togglePill: {
    flexDirection: 'row', alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24, padding: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  toggleBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.textFaint },
  toggleTextActive: { color: '#fff' },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textFaint, textTransform: 'uppercase', letterSpacing: 1 },
  sectionCount: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
  sectionHint: { fontSize: 12, color: Colors.textFaint, marginBottom: 12, opacity: 0.6 },

  // Service grid — logos fill tiles, no padding
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  serviceTile: {
    width: TILE, height: TILE,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  serviceTileOff: { opacity: 0.35 },
  serviceLogo: { width: '100%', height: '100%' },
  serviceLogoOff: {},
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  filtersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  filtersBtnActive: { borderColor: `${Colors.accent}40` },
  filtersBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },

  filtersPanel: {
    marginTop: 12, backgroundColor: '#0d0d0d', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  filterLabel: { fontSize: 11, fontWeight: '700', color: Colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 13, fontWeight: '600', color: Colors.textFaint },
  pillTextActive: { color: '#0A0A0A' },
  clearFilters: { alignSelf: 'flex-start', marginTop: 12 },
  clearFiltersText: { color: Colors.textFaint, fontSize: 13, textDecorationLine: 'underline' },

  spinBtn: {
    backgroundColor: Colors.accent, borderRadius: 16,
    paddingVertical: 17, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: Colors.accent, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
  },
  spinBtnDisabled: { opacity: 0.6 },
  spinBtnText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },

  // ── Smart Watch ──
  smartInner:      { padding: 16 },
  smartHead:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smartMark:       { width: 22, height: 22, borderRadius: 11, backgroundColor: '#5856d6', alignItems: 'center', justifyContent: 'center' },
  smartTitle:      { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  smartStatus:     { color: Colors.textFaint, fontSize: 11, fontWeight: '600', marginLeft: 'auto' as any },
  smartSub:        { color: Colors.textMuted, fontSize: 12.5, lineHeight: 17, marginTop: 8 },
  smartInput:      {
    marginTop: 12, minHeight: 64, maxHeight: 120, textAlignVertical: 'top',
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 13.5, lineHeight: 19,
  },
  smartBtn:        {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(88,86,214,0.18)', borderWidth: 1, borderColor: 'rgba(120,110,255,0.4)',
  },
  smartBtnMuted:   { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' },
  smartBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  smartErr:        { color: Colors.warning, fontSize: 12.5, textAlign: 'center', marginTop: 10 },

  smartResult:     { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  smartResRow:     { flexDirection: 'row', gap: 12, padding: 12 },
  smartPoster:     { width: 60, height: 90, borderRadius: 8, flexShrink: 0 },
  smartPosterEmpty:{ backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  smartResTitle:   { color: '#fff', fontSize: 14.5, fontWeight: '800', lineHeight: 19 },
  smartResMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  smartResMetaText:{ color: Colors.textFaint, fontSize: 12 },
  smartResStar:    { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  smartReason:     { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic', lineHeight: 17, marginTop: 6 },
  groqRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingHorizontal: 12, paddingBottom: 8 },
  groqText:        { color: Colors.textFaint, fontSize: 10, fontWeight: '600' },

  resultWrap: { paddingHorizontal: 16, marginTop: 28 },
  resultCard: {
    backgroundColor: '#111', borderRadius: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  resultPosterWrap: { width: '100%', height: W - 32, position: 'relative' },
  resultPoster: { ...StyleSheet.absoluteFillObject },
  resultGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  streamBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1,
  },
  streamText: { fontSize: 12, fontWeight: '700' },
  resultInfo: { padding: 18, paddingTop: 14 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 30, marginBottom: 8 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  resultMetaText: { color: Colors.textFaint, fontSize: 14 },
  resultMetaDot: { color: Colors.textFaint, fontSize: 14 },
  resultRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultRating: { color: '#fbbf24', fontSize: 13, fontWeight: '600' },
  resultOverview: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 19, marginBottom: 10 },
  tapHint: { color: Colors.textFaint, fontSize: 13 },

  voteRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  voteSkip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  voteSkipText: { color: Colors.textMuted, fontWeight: '600', fontSize: 15 },
  voteWatch: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14,
  },
  voteWatchText: { color: '#0A0A0A', fontWeight: '700', fontSize: 15 },
});
