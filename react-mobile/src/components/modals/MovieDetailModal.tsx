import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, TextInput, Alert,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getMovieDetails, getShowDetails, getWatchedMovie, addWatchedMovie,
  updateWatchedMovie, watchMovieLater, removeFromWatchLater,
  getWatchLater, getUser, getFriends,
} from '../../services/api';
import { Colors, PROVIDER_COLORS } from '../../constants/colors';
import type { Movie } from '../../types';

type FriendActivity = { id: string; username: string; avatarUrl?: string; rating: number; comment: string };

const { width: W, height: H } = Dimensions.get('window');
const TMDB = 'https://image.tmdb.org/t/p';

interface Props {
  movieId: string | null;
  mediaType?: 'movie' | 'show';
  onClose: () => void;
}

export function MovieDetailModal({ movieId, mediaType = 'movie', onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [details, setDetails]         = useState<Record<string, any> | null>(null);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watched, setWatched]         = useState<{ rating: number; comment: string } | null>(null);
  const [showRateForm, setShowRateForm] = useState(false);
  const [rating, setRating]           = useState(0);
  const [comment, setComment]         = useState('');
  const [saving, setSaving]           = useState(false);
  const [friendsActivity, setFriendsActivity] = useState<FriendActivity[]>([]);

  const load = useCallback(async () => {
    if (!movieId) return;
    setLoading(true);
    setExpanded(false);
    setShowRateForm(false);
    setFriendsActivity([]);
    try {
      const [d, user] = await Promise.all([
        mediaType === 'show' ? getShowDetails(movieId) : getMovieDetails(movieId),
        getUser(),
      ]);
      setDetails(d as Record<string, any>);
      if (user) {
        const [wl, wd] = await Promise.all([
          getWatchLater(user.user_id),
          getWatchedMovie(user.user_id, movieId),
        ]);
        setInWatchlist(wl.includes(movieId));
        if (wd) {
          setWatched({ rating: wd.user_rating, comment: wd.comment });
          setRating(wd.user_rating);
          setComment(wd.comment);
        } else {
          setWatched(null);
          setRating(0);
          setComment('');
        }

        // Friends' ratings + takes for this title (loads in background)
        getFriends(user.user_id).then(async friends => {
          const entries = await Promise.all(
            friends.map(async f => {
              const w = await getWatchedMovie(f.friend_id, movieId).catch(() => null);
              if (!w || (!(w.user_rating > 0) && !w.comment)) return null;
              return { id: f.friend_id, username: f.friend_username, avatarUrl: f.avatarUrl, rating: w.user_rating, comment: w.comment } as FriendActivity;
            })
          );
          setFriendsActivity(entries.filter((e): e is FriendActivity => e !== null));
        }).catch(() => {});
      }
    } catch {}
    setLoading(false);
  }, [movieId, mediaType]);

  useEffect(() => { if (movieId) load(); }, [movieId]);

  const handleWatchlist = async () => {
    const user = await getUser();
    if (!user || !movieId) return;
    if (inWatchlist) {
      await removeFromWatchLater(user.user_id, movieId);
      setInWatchlist(false);
    } else {
      await watchMovieLater(user.user_id, movieId);
      setInWatchlist(true);
    }
  };

  const handleSave = async () => {
    const user = await getUser();
    if (!user || !movieId || !details) return;
    setSaving(true);
    try {
      const movie: Movie = {
        id: movieId,
        title: details.title || details.name || '',
        year: parseInt((details.release_date || details.first_air_date || '0').slice(0, 4)) || 0,
        genres: (details.genres ?? []).map((g: any) => g.name),
        rating: details.vote_average ?? 0,
        poster: posterUri,
        streamingService: details.streamingService ?? '',
        overview: details.overview ?? '',
        type: mediaType,
      };
      if (watched) {
        await updateWatchedMovie(user.user_id, movieId, rating, comment);
      } else {
        await addWatchedMovie(user.user_id, movie, rating, comment);
      }
      setWatched({ rating, comment });
      setShowRateForm(false);
    } catch { Alert.alert('Error', 'Could not save. Try again.'); }
    setSaving(false);
  };

  if (!movieId) return null;

  // Derived values
  const title      = details?.title || details?.name || '';
  const overview   = details?.overview ?? '';
  const year       = (details?.release_date || details?.first_air_date || '').slice(0, 4);
  const runtime    = details?.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : '';
  const seasons    = details?.number_of_seasons;
  const episodes   = details?.number_of_episodes;
  const voteAvg    = details?.vote_average ?? 0;
  const genres     = (details?.genres ?? []).slice(0, 4) as Array<{ id: number; name: string }>;
  const cast       = (details?.credits?.cast ?? details?.cast ?? []).slice(0, 15) as Array<{
    id: number; name: string; character?: string; profile_path?: string | null;
  }>;
  const director   = (details?.credits?.crew ?? []).find((c: any) => c.job === 'Director')?.name as string | undefined;
  const tagline    = details?.tagline as string | undefined;
  const status     = details?.status as string | undefined;
  const similar    = (details?.similar?.results ?? details?.recommendations?.results ?? []).slice(0, 8) as Array<{
    id: number; title?: string; name?: string; poster_path?: string | null;
  }>;

  const backdropPath = details?.backdrop_path as string | null;
  const posterPath   = details?.poster_path as string | null;
  const posterUri    = details?.poster
    ? (details.poster as string).replace(/\/t\/p\/\w+\//, '/t/p/w342/')
    : posterPath ? `${TMDB}/w342${posterPath}` : '';
  const backdropUri  = details?.backdrop
    ? (details.backdrop as string).replace(/\/t\/p\/\w+\//, '/t/p/w780/')
    : backdropPath ? `${TMDB}/w780${backdropPath}` : posterUri;

  // Trailer — prefer official YouTube trailer
  const allVideos  = (details?.videos?.results ?? []) as Array<{ type: string; site: string; key: string; name: string }>;
  const trailer    = allVideos.find(v => v.type === 'Trailer' && v.site === 'YouTube')
                  ?? allVideos.find(v => v.site === 'YouTube');
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

  // Streaming providers (flatrate = subscription, US region)
  const usProviders  = (details?.['watch/providers'] as any)?.results?.US ?? {};
  const flatrate     = (usProviders.flatrate ?? []) as Array<{ provider_name: string; logo_path: string }>;
  const watchProviders = flatrate.slice(0, 5);

  const HERO_H = H * 0.42;

  return (
    <Modal visible={!!movieId} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.screen}>
        {/* ── Hero backdrop ── */}
        <View style={[s.hero, { height: HERO_H }]}>
          {backdropUri ? (
            <Image source={{ uri: backdropUri }} style={StyleSheet.absoluteFill} contentFit="cover" priority="high" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bgCard }]} />
          )}
          {/* Multi-stop gradient fades into bg */}
          <LinearGradient
            colors={['rgba(8,8,8,0.15)', 'transparent', 'rgba(8,8,8,0.6)', 'rgba(8,8,8,0.98)', '#080808']}
            locations={[0, 0.2, 0.6, 0.85, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Close button */}
          <TouchableOpacity
            style={[s.closeBtn, { top: (insets.top || 16) + 6 }]}
            onPress={onClose}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={s.scrollArea}
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator color={Colors.accent} size="large" style={{ marginTop: 40 }} />
            ) : !details ? (
              <Text style={s.err}>Could not load details.</Text>
            ) : (
              <>
                {/* ── Poster + info side-by-side ── */}
                <View style={s.heroRow}>
                  {posterUri ? (
                    <Image source={{ uri: posterUri }} style={s.poster} contentFit="cover" />
                  ) : null}
                  <View style={s.heroMeta}>
                    <Text style={s.title}>{title}</Text>
                    <View style={s.metaRow}>
                      {year ? <Text style={s.metaText}>{year}</Text> : null}
                      {runtime ? <><Text style={s.metaDot}>·</Text><Text style={s.metaText}>{runtime}</Text></> : null}
                      {seasons ? <><Text style={s.metaDot}>·</Text><Text style={s.metaText}>{seasons}S</Text></> : null}
                    </View>
                    {voteAvg > 0 && (
                      <View style={s.ratingRow}>
                        <Ionicons name="star" size={13} color="#fbbf24" />
                        <Text style={s.ratingVal}>{voteAvg.toFixed(1)}</Text>
                        <Text style={s.ratingLabel}>TMDB</Text>
                      </View>
                    )}
                    {director ? (
                      <Text style={s.director} numberOfLines={1}>Dir. {director}</Text>
                    ) : null}
                    {genres.length > 0 && (
                      <View style={s.genreRow}>
                        {genres.map(g => (
                          <View key={g.id} style={s.genrePill}>
                            <Text style={s.genrePillText}>{g.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* ── Tagline ── */}
                {tagline ? (
                  <Text style={s.tagline}>"{tagline}"</Text>
                ) : null}

                {/* ── Overview ── */}
                {overview ? (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Overview</Text>
                    <Text style={s.overview} numberOfLines={expanded ? undefined : 4}>{overview}</Text>
                    {overview.length > 220 && (
                      <TouchableOpacity onPress={() => setExpanded(v => !v)} style={s.readMore}>
                        <Text style={s.readMoreText}>{expanded ? 'Show less' : 'Read more'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                {/* ── From your friends ── */}
                {friendsActivity.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>From Your Friends</Text>
                    {friendsActivity.map(f => (
                      <View key={f.id} style={s.friendActivity}>
                        {f.avatarUrl ? (
                          <Image source={{ uri: f.avatarUrl }} style={s.friendAvatar} contentFit="cover" />
                        ) : (
                          <View style={[s.friendAvatar, s.friendAvatarFallback]}>
                            <Text style={s.friendInitials}>{f.username.slice(0, 2).toUpperCase()}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <View style={s.friendActivityHead}>
                            <Text style={s.friendName} numberOfLines={1}>{f.username}</Text>
                            {f.rating > 0 && (
                              <View style={s.friendRatingPill}>
                                <Ionicons name="star" size={11} color="#fbbf24" />
                                <Text style={s.friendRatingText}>{f.rating}/10</Text>
                              </View>
                            )}
                          </View>
                          {!!f.comment && <Text style={s.friendComment}>{f.comment}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* ── Watched badge ── */}
                {watched && !showRateForm && (
                  <View style={s.watchedBanner}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                    <Text style={s.watchedText}>
                      Watched{watched.rating > 0 ? ` · ${watched.rating}/10` : ''}
                    </Text>
                    <TouchableOpacity onPress={() => setShowRateForm(true)}>
                      <Text style={s.editText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── Rate form ── */}
                {showRateForm && (
                  <View style={s.rateWrap}>
                    <Text style={s.rateTitle}>{watched ? 'Update Rating' : 'Log This'}</Text>
                    <Text style={s.rateLabel}>Rating</Text>
                    <View style={s.starsRow}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <TouchableOpacity key={n} onPress={() => setRating(n)} style={[s.starBtn, rating >= n && s.starBtnActive]}>
                          <Text style={[s.starNum, rating >= n && s.starNumActive]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={s.rateLabel}>Comment</Text>
                    <TextInput
                      style={s.commentInput}
                      placeholder="What did you think?"
                      placeholderTextColor={Colors.textFaint}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                    />
                    <View style={s.rateActions}>
                      <TouchableOpacity style={s.cancelBtn} onPress={() => setShowRateForm(false)}>
                        <Text style={s.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.saveBtn, (rating === 0 || saving) && { opacity: 0.5 }]}
                        onPress={handleSave}
                        disabled={rating === 0 || saving}
                      >
                        {saving ? <ActivityIndicator size="small" color="#0A0A0A" /> : <Text style={s.saveText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ── Action buttons ── */}
                <View style={s.actions}>
                  {!watched && !showRateForm && (
                    <TouchableOpacity style={s.primaryBtn} onPress={() => { setRating(0); setComment(''); setShowRateForm(true); }}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#0A0A0A" />
                      <Text style={s.primaryBtnText}>Mark as Watched</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.secondaryBtn, inWatchlist && s.secondaryBtnSaved]}
                    onPress={handleWatchlist}
                  >
                    <Ionicons
                      name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
                      size={18}
                      color={inWatchlist ? Colors.accent : Colors.textPrimary}
                    />
                    <Text style={[s.secondaryBtnText, inWatchlist && { color: Colors.accent }]}>
                      {inWatchlist ? 'Saved' : 'Save for Later'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ── Trailer + Watch On ── */}
                <View style={s.mediaRow}>
                  {trailerUrl && (
                    <TouchableOpacity
                      style={s.trailerBtn}
                      onPress={() => Linking.openURL(trailerUrl)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-youtube" size={18} color="#ff0000" />
                      <Text style={s.trailerBtnText}>Watch Trailer</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── Where to watch ── */}
                {watchProviders.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Where to Watch</Text>
                    <View style={s.providerRow}>
                      {watchProviders.map(p => (
                        <View key={p.provider_name} style={s.providerChip}>
                          {p.logo_path ? (
                            <Image
                              source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }}
                              style={s.providerLogo}
                              contentFit="cover"
                            />
                          ) : null}
                          <Text style={s.providerName} numberOfLines={1}>{p.provider_name.replace(' Standard with Ads','').replace(' with Ads','')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Cast ── */}
                {cast.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Cast</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.castRow}>
                      {cast.map(person => {
                        const imgUri = person.profile_path ? `${TMDB}/w185${person.profile_path}` : '';
                        return (
                          <View key={person.id} style={s.castMember}>
                            <View style={s.castAvatar}>
                              {imgUri
                                ? <Image source={{ uri: imgUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                                : <Ionicons name="person" size={24} color={Colors.textFaint} />
                              }
                            </View>
                            <Text style={s.castName} numberOfLines={2}>{person.name}</Text>
                            {person.character ? (
                              <Text style={s.castChar} numberOfLines={1}>{person.character}</Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* ── Similar ── */}
                {similar.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>More Like This</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.castRow}>
                      {similar.map(m => {
                        const uri = m.poster_path ? `${TMDB}/w185${m.poster_path}` : '';
                        const simTitle = m.title || m.name || '';
                        return (
                          <View key={m.id} style={s.similarCard}>
                            <View style={s.similarPoster}>
                              {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                            </View>
                            <Text style={s.similarTitle} numberOfLines={2}>{simTitle}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const CAST_SIZE = 72;
const SIM_W    = 100;

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#080808' },
  hero:     { position: 'relative', width: '100%' },
  closeBtn: {
    position: 'absolute', right: 16, zIndex: 20,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollArea: { flex: 1, marginTop: -60 },

  heroRow:  { flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingTop: 16, alignItems: 'flex-end' },
  poster:   { width: 110, height: 164, borderRadius: 12, flexShrink: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroMeta: { flex: 1, paddingBottom: 4, paddingTop: 30 },
  title:    { fontSize: 21, fontWeight: '800', color: '#fff', lineHeight: 27, marginBottom: 7 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7, flexWrap: 'wrap' },
  metaText: { color: Colors.textFaint, fontSize: 13 },
  metaDot:  { color: Colors.textFaint, fontSize: 13 },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  ratingVal:  { color: '#fbbf24', fontSize: 14, fontWeight: '700' },
  ratingLabel:{ color: Colors.textFaint, fontSize: 12 },
  director:   { color: Colors.textFaint, fontSize: 12, marginBottom: 8 },
  genreRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  genrePill:  { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  genrePillText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },

  tagline: { color: Colors.textFaint, fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginHorizontal: 20, marginTop: 16, lineHeight: 20 },

  // Friends' activity
  friendActivity:     { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  friendAvatar:       { width: 38, height: 38, borderRadius: 19, flexShrink: 0 },
  friendAvatarFallback: { backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  friendInitials:     { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  friendActivityHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  friendName:         { color: '#fff', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  friendRatingPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  friendRatingText:   { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  friendComment:      { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 19, marginTop: 4 },

  section:      { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 },
  overview:     { color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 24 },
  readMore:     { marginTop: 6 },
  readMoreText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },

  watchedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: `${Colors.accent}12`, borderRadius: 12,
    padding: 13, borderWidth: 1, borderColor: `${Colors.accent}28`,
  },
  watchedText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  editText:    { color: Colors.accent, fontSize: 13, fontWeight: '600' },

  rateWrap: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  rateTitle:    { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 14 },
  rateLabel:    { fontSize: 11, fontWeight: '700', color: Colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  starsRow:     { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  starBtn:      { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  starBtnActive:{ backgroundColor: Colors.accent },
  starNum:      { color: Colors.textFaint, fontSize: 13, fontWeight: '700' },
  starNumActive:{ color: '#0A0A0A' },
  commentInput: {
    backgroundColor: Colors.bgElevated, borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: 12,
  },
  rateActions:  { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText:   { color: Colors.textMuted, fontWeight: '600' },
  saveBtn:      { flex: 2, backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveText:     { color: '#0A0A0A', fontWeight: '700' },

  actions:         { marginHorizontal: 16, marginTop: 20, gap: 10 },
  primaryBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14 },
  primaryBtnText:  { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  secondaryBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.bgCard, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border },
  secondaryBtnSaved: { borderColor: `${Colors.accent}45` },
  secondaryBtnText:{ color: '#fff', fontSize: 15, fontWeight: '600' },

  // Trailer + providers
  mediaRow:      { marginHorizontal: 16, marginTop: 16, flexDirection: 'row', gap: 10 },
  trailerBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: 'rgba(255,0,0,0.25)' },
  trailerBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  providerRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  providerChip:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.bgCard, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: Colors.border },
  providerLogo:  { width: 24, height: 24, borderRadius: 5 },
  providerName:  { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },

  castRow: { paddingLeft: 16, paddingRight: 8 },
  castMember: { width: CAST_SIZE, marginRight: 14, alignItems: 'center' },
  castAvatar: {
    width: CAST_SIZE, height: CAST_SIZE, borderRadius: CAST_SIZE / 2,
    backgroundColor: Colors.bgCard, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  castName: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 7, lineHeight: 14 },
  castChar: { color: Colors.textFaint, fontSize: 10, textAlign: 'center', marginTop: 2, lineHeight: 13 },

  similarCard:  { width: SIM_W, marginRight: 10 },
  similarPoster:{ width: SIM_W, height: SIM_W * 1.5, borderRadius: 10, backgroundColor: Colors.bgCard, overflow: 'hidden' },
  similarTitle: { color: Colors.textMuted, fontSize: 11, marginTop: 6, lineHeight: 15 },

  err: { color: Colors.textMuted, textAlign: 'center', marginTop: 60, fontSize: 15 },
});
