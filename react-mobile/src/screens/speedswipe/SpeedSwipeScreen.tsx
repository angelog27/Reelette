import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, PanResponder, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { discoverMovies, getServices, watchMovieLater, getUser } from '../../services/api';
import { Colors } from '../../constants/colors';
import type { Movie } from '../../types';

interface Props { onBack: () => void; }

const { width: W } = Dimensions.get('window');
const CARD_W = W - 48;
const CARD_H = CARD_W * 1.4;
const SWIPE_THRESHOLD = W * 0.32;

export function SpeedSwipeScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [deck, setDeck]     = useState<Movie[]>([]);
  const [idx, setIdx]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved]   = useState<string[]>([]);
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    (async () => {
      try {
        const services = await getServices();
        const movies = await discoverMovies({
          sort_by: 'popularity.desc',
          ...(Object.values(services).some(Boolean) ? { services_filter: services } : {}),
        });
        setDeck(movies.slice(0, 30));
      } catch { Alert.alert('Error', 'Could not load movies.'); }
      setLoading(false);
    })();
  }, []);

  const dismiss = useCallback((liked: boolean) => {
    position.setValue({ x: 0, y: 0 });
    setIdx(i => i + 1);
    if (liked) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [position]);

  const handleSave = useCallback(async (movie: Movie) => {
    const user = await getUser();
    if (!user) return;
    await watchMovieLater(user.user_id, movie.id);
    setSaved(s => [...s, movie.id]);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, { dx, dy }) => {
        if (dx > SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: W * 1.5, y: dy },
            duration: 220,
            useNativeDriver: true,
          }).start(() => dismiss(true));
        } else if (dx < -SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: -W * 1.5, y: dy },
            duration: 220,
            useNativeDriver: true,
          }).start(() => dismiss(false));
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-W, 0, W],
    outputRange: ['-25deg', '0deg', '25deg'],
  });

  const likeOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1] });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0] });

  if (loading) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={Colors.accent} size="large" />
    </View>
  );

  const current = deck[idx];
  const isDone = idx >= deck.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Speed Swipe</Text>
        <Text style={styles.counter}>{Math.min(idx + 1, deck.length)}/{deck.length}</Text>
      </View>

      <View style={styles.deckArea}>
        {isDone ? (
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>All done</Text>
            <Text style={styles.doneDesc}>
              {saved.length} movie{saved.length !== 1 ? 's' : ''} saved to your watchlist.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onBack}>
              <Text style={styles.doneBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {deck[idx + 1] && (
              <View style={[styles.card, styles.cardNext]}>
                <Image source={{ uri: deck[idx + 1].poster }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
            )}
            <Animated.View
              style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
              {...panResponder.panHandlers}
            >
              <Image source={{ uri: current.poster }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Animated.View style={[styles.stamp, styles.stampSave, { opacity: likeOpacity }]}>
                <Text style={[styles.stampText, { color: Colors.accent }]}>SAVE</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.stampSkip, { opacity: nopeOpacity }]}>
                <Text style={[styles.stampText, { color: '#ef4444' }]}>SKIP</Text>
              </Animated.View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardTitle}>{current.title}</Text>
                <Text style={styles.cardMeta}>
                  {[current.year > 0 ? String(current.year) : '', current.genres[0], current.rating > 0 ? `${current.rating.toFixed(1)}` : ''].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
            </Animated.View>
          </>
        )}
      </View>

      {!isDone && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.btnSkip} onPress={() => dismiss(false)} accessibilityLabel="Skip">
            <Text style={styles.btnSkipIcon}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSave}
            onPress={() => { handleSave(current); dismiss(true); }}
            accessibilityLabel="Save"
          >
            <Text style={styles.btnSaveIcon}>♥</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 56 },
  backText: { color: Colors.textMuted, fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  counter: { color: Colors.textMuted, fontSize: 13, width: 56, textAlign: 'right' },
  deckArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { width: CARD_W, height: CARD_H, borderRadius: 20, overflow: 'hidden', backgroundColor: Colors.bgCard, position: 'absolute' },
  cardNext: { transform: [{ scale: 0.94 }], top: 10 },
  cardFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 40, backgroundColor: 'rgba(0,0,0,0)' },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  stamp: { position: 'absolute', top: 36, borderWidth: 3, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  stampSave: { right: 24, borderColor: Colors.accent },
  stampSkip: { left: 24, borderColor: '#ef4444' },
  stampText: { fontSize: 20, fontWeight: '900' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 48, paddingTop: 16 },
  btnSkip: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard },
  btnSkipIcon: { fontSize: 22, color: '#ef4444' },
  btnSave: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnSaveIcon: { fontSize: 26, color: '#0A0A0A' },
  doneCard: { alignItems: 'center', paddingHorizontal: 40 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  doneDesc: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  doneBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  doneBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 15 },
});
