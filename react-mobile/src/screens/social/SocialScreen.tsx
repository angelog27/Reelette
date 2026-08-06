import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  RefreshControl, Alert, FlatList, Modal, Pressable, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getFeed, likePost, deletePost, createPost, addReply, getReplies,
  getUser, timeAgo, getFriendRequests, acceptFriendRequest, rejectFriendRequest,
  getUserPublicProfile, sendFriendRequest, getFriends, getWatchedMovies,
  searchMovies, searchUsers,
} from '../../services/api';
import { Colors } from '../../constants/colors';
import { ADMIN_UID } from '../../constants/providers';
import type { FeedPost, PostReply, CurrentUser, UserPublicProfile, WatchedMovie, Movie, Friend } from '../../types';

// ── User Profile Sheet ─────────────────────────────────────────────────────────
function UserProfileSheet({
  userId,
  currentUserId,
  onClose,
}: {
  userId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [watched, setWatched] = useState<WatchedMovie[]>([]);
  const [friendStatus, setFriendStatus] = useState<'none' | 'requested' | 'friends'>('none');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'watched' | 'watchlist' | 'friends' | null>(null);

  const [currentUsername, setCurrentUsername] = useState('');

  useEffect(() => {
    getUser().then(u => { if (u) setCurrentUsername(u.username); });
    setLoading(true);
    Promise.all([
      getUserPublicProfile(userId),
      getWatchedMovies(userId, 300).catch(() => []),
      getFriends(currentUserId).catch(() => []),
    ]).then(([prof, w, friends]) => {
      setProfile(prof);
      setWatched(w);
      const isFriend = friends.some((f: any) => f.friend_id === userId || f.user_id === userId);
      setFriendStatus(isFriend ? 'friends' : 'none');
      setLoading(false);
    });
  }, [userId, currentUserId]);

  const handleAddFriend = async () => {
    if (!currentUserId || friendStatus !== 'none') return;
    setActionLoading(true);
    await sendFriendRequest(userId, currentUserId, currentUsername).catch(() => {});
    setFriendStatus('requested');
    setActionLoading(false);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={ps.backdrop} onPress={onClose} />
      <View style={[ps.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={ps.dragHandle} />

        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : !profile ? (
          <Text style={{ color: Colors.textMuted, textAlign: 'center', marginTop: 40 }}>Profile not found.</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Avatar + name */}
            <View style={ps.header}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={ps.avatar} contentFit="cover" />
              ) : (
                <View style={[ps.avatar, ps.avatarFallback]}>
                  <Text style={ps.avatarInitials}>{profile.username.slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
              <Text style={ps.displayName}>{profile.displayName || profile.username}</Text>
              <Text style={ps.usernameText}>@{profile.username}</Text>
              {!!profile.bio && <Text style={ps.bio}>{profile.bio}</Text>}
            </View>

            {/* Stats — tappable */}
            <View style={ps.statsRow}>
              <TouchableOpacity style={ps.stat} onPress={() => setDetailTab('watched')}>
                <Text style={ps.statNum}>{profile.watchedCount}</Text>
                <Text style={[ps.statLabel, detailTab === 'watched' && { color: Colors.accent }]}>Watched</Text>
              </TouchableOpacity>
              <View style={ps.statDivider} />
              <TouchableOpacity style={ps.stat} onPress={() => setDetailTab('watchlist')}>
                <Text style={ps.statNum}>{profile.watchlistCount}</Text>
                <Text style={[ps.statLabel, detailTab === 'watchlist' && { color: Colors.accent }]}>Watchlist</Text>
              </TouchableOpacity>
              <View style={ps.statDivider} />
              <TouchableOpacity style={ps.stat} onPress={() => setDetailTab('friends')}>
                <Text style={ps.statNum}>{profile.friendsCount}</Text>
                <Text style={[ps.statLabel, detailTab === 'friends' && { color: Colors.accent }]}>Friends</Text>
              </TouchableOpacity>
            </View>

            {/* Detail panels — tap a stat to expand */}
            {detailTab && (
              <View style={{ marginTop: 12 }}>
                {/* Sub-header with back button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
                  <TouchableOpacity onPress={() => setDetailTab(null)} style={{ marginRight: 8, padding: 4 }}>
                    <Ionicons name="chevron-back" size={18} color={Colors.textFaint} />
                  </TouchableOpacity>
                  <Text style={ps.sectionTitle}>
                    {detailTab === 'watched' ? `${watched.length} Watched` : detailTab === 'watchlist' ? 'Watchlist' : 'Friends'}
                  </Text>
                </View>

                {detailTab === 'watched' && (
                  profile.showMyStuffPublicly ? (
                    watched.length === 0 ? (
                      <Text style={{ color: Colors.textFaint, fontSize: 13, paddingHorizontal: 16 }}>Nothing logged yet.</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
                        {watched.map(m => (
                          <View key={m.movie_id} style={ps.movieTile}>
                            {m.poster ? (
                              <Image source={{ uri: m.poster.replace(/\/t\/p\/\w+\//, '/t/p/w185/') }} style={ps.moviePoster} contentFit="cover" />
                            ) : (
                              <View style={[ps.moviePoster, { backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' }]}>
                                <Ionicons name="film-outline" size={16} color={Colors.textFaint} />
                              </View>
                            )}
                            {m.user_rating > 0 && (
                              <View style={ps.movieRating}>
                                <Text style={ps.movieRatingText}>★{m.user_rating}</Text>
                              </View>
                            )}
                            <Text style={{ color: Colors.textFaint, fontSize: 10, marginTop: 3, width: ps.moviePoster.width as number }} numberOfLines={1}>{m.title}</Text>
                          </View>
                        ))}
                      </View>
                    )
                  ) : (
                    <Text style={{ color: Colors.textFaint, fontSize: 13, paddingHorizontal: 16 }}>This profile is private.</Text>
                  )
                )}

                {detailTab === 'watchlist' && (
                  <Text style={{ color: Colors.textFaint, fontSize: 13, paddingHorizontal: 16 }}>
                    {profile.watchlistCount > 0 ? `${profile.watchlistCount} titles saved` : 'Nothing saved yet.'}
                  </Text>
                )}

                {detailTab === 'friends' && (
                  <Text style={{ color: Colors.textFaint, fontSize: 13, paddingHorizontal: 16 }}>
                    {profile.friendsCount > 0 ? `${profile.friendsCount} friends` : 'No friends yet.'}
                  </Text>
                )}
              </View>
            )}

            {/* Friend button */}
            {userId !== currentUserId && (
              <TouchableOpacity
                style={[ps.friendBtn, friendStatus === 'friends' && ps.friendBtnDone, friendStatus === 'requested' && ps.friendBtnPending]}
                onPress={handleAddFriend}
                disabled={actionLoading || friendStatus !== 'none'}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={friendStatus === 'none' ? '#0A0A0A' : Colors.textPrimary} />
                ) : (
                  <Text style={[ps.friendBtnText, friendStatus !== 'none' && { color: Colors.textMuted }]}>
                    {friendStatus === 'friends' ? 'Friends' : friendStatus === 'requested' ? 'Request Sent' : 'Add Friend'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {!detailTab && (
              <Text style={{ color: Colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: 14, marginHorizontal: 24 }}>
                Tap a stat to see details
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const AVATAR_SIZE = 80;
const ps = StyleSheet.create({
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', minHeight: 300, paddingTop: 12 },
  dragHandle:     { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header:         { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  avatar:         { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, marginBottom: 12 },
  avatarFallback: { backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: Colors.accent, fontSize: 24, fontWeight: '700' },
  displayName:    { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 2 },
  usernameText:   { color: Colors.textFaint, fontSize: 14, marginBottom: 8 },
  bio:            { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 4 },
  statsRow:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },
  stat:           { alignItems: 'center', flex: 1 },
  statNum:        { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel:      { color: Colors.textFaint, fontSize: 12, marginTop: 2 },
  statDivider:    { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },
  friendBtn:      { marginHorizontal: 16, marginTop: 16, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  friendBtnDone:  { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  friendBtnPending: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  friendBtnText:  { color: '#0A0A0A', fontWeight: '700', fontSize: 15 },
  sectionTitle:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  movieTile:      { position: 'relative' },
  moviePoster:    { width: 100, height: 150, borderRadius: 8 },
  movieRating:    { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  movieRatingText: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },
});

type Tab = 'feed' | 'friends';
type FeedMode = 'all' | 'friends';
type FriendCard = Friend & { bio?: string; displayName?: string };

const { width: SCREEN_W } = Dimensions.get('window');
// Large, Twitter-style media poster inside a post (content column width minus avatar rail)
const POSTER_W = Math.min(210, Math.round((SCREEN_W - 84) * 0.66));
const POSTER_H = Math.round(POSTER_W * 1.5);

// ── Helpers ───────────────────────────────────────────────────────────────────
function tmdbPoster(url: string, size = 'w185') {
  if (!url) return '';
  return url.replace(/\/t\/p\/\w+\//, `/t/p/${size}/`);
}

function Avatar({ uri, name, size = 36 }: { uri?: string; name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Colors.accent, fontSize: size * 0.33, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// ── Reply row ─────────────────────────────────────────────────────────────────
function ReplyRow({ reply }: { reply: PostReply }) {
  return (
    <View style={styles.replyRow}>
      <Avatar uri={reply.avatarUrl} name={reply.username} size={28} />
      <View style={styles.replyContent}>
        <View style={styles.replyHeader}>
          <Text style={styles.replyUsername}>{reply.username}</Text>
          <Text style={styles.replyTime}>{timeAgo(reply.created_at)}</Text>
        </View>
        <Text style={styles.replyText}>{reply.message}</Text>
      </View>
    </View>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({
  post, currentUserId, isFirst,
  onLike, onDelete, onReply, onPressProfile,
}: {
  post: FeedPost; currentUserId: string; isFirst: boolean;
  onLike: () => void; onDelete: () => void; onReply: (text: string) => void;
  onPressProfile: (userId: string) => void;
}) {
  const isLiked = post.liked_by.includes(currentUserId);
  const canDelete = post.user_id === currentUserId || currentUserId === ADMIN_UID;
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [composingReply, setComposingReply] = useState(false);

  const loadReplies = useCallback(async () => {
    if (loadingReplies) return;
    setLoadingReplies(true);
    const data = await getReplies(post.post_id).catch(() => []);
    setReplies(data);
    setLoadingReplies(false);
  }, [post.post_id]);

  const handleToggleReplies = () => {
    if (!showReplies) loadReplies();
    setShowReplies(v => !v);
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onReply(replyText.trim());
    setReplyText('');
    setComposingReply(false);
  };

  return (
    <View style={styles.postCard}>
      {/* Repost banner */}
      {post.is_repost && (
        <View style={styles.repostBanner}>
          <Ionicons name="repeat" size={12} color={Colors.textFaint} />
          <Text style={styles.repostText}>{post.username} reposted</Text>
        </View>
      )}

      <View style={styles.postRow}>
        {/* Left: avatar column */}
        <View style={styles.avatarCol}>
          <TouchableOpacity onPress={() => onPressProfile(post.user_id)} activeOpacity={0.8}>
            <Avatar uri={post.avatarUrl} name={post.username} size={40} />
          </TouchableOpacity>
          {showReplies && replies.length > 0 && <View style={styles.threadLine} />}
        </View>

        {/* Right: content */}
        <View style={styles.postBody}>
          {/* Header */}
          <View style={styles.postHeader}>
            <TouchableOpacity onPress={() => onPressProfile(post.user_id)}>
              <Text style={styles.postDisplayName}>{(post as any).displayName || post.username}</Text>
            </TouchableOpacity>
            <Text style={styles.postHandle}>@{post.username}</Text>
            <Text style={styles.postDot}>·</Text>
            <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
            {canDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} accessibilityLabel="Delete post">
                <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textFaint} />
              </TouchableOpacity>
            )}
          </View>

          {/* Movie attachment — large, Twitter-style media */}
          {post.movie_title ? (
            <View style={styles.movieMedia}>
              {post.movie_poster ? (
                <Image
                  source={{ uri: tmdbPoster(post.movie_poster, 'w500') }}
                  style={styles.moviePosterLarge}
                  contentFit="cover"
                  priority={isFirst ? 'high' : 'normal'}
                />
              ) : (
                <View style={[styles.moviePosterLarge, styles.moviePosterEmpty]}>
                  <Ionicons name="film-outline" size={30} color={Colors.textFaint} />
                </View>
              )}
              <Text style={styles.movieTitleLarge} numberOfLines={2}>{post.movie_title}</Text>
              {post.rating > 0 && (
                <View style={styles.ratingRow}>
                  {[1,2,3,4,5].map(n => (
                    <Ionicons
                      key={n}
                      name={post.rating / 2 >= n ? 'star' : 'star-outline'}
                      size={13}
                      color={post.rating / 2 >= n ? '#fbbf24' : Colors.bgElevated}
                    />
                  ))}
                  <Text style={styles.ratingNum}>{post.rating}/10</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Message */}
          {post.message ? (
            <Text style={styles.postMessage}>{post.message}</Text>
          ) : null}

          {/* Quoted repost */}
          {post.original_message ? (
            <View style={styles.quotedPost}>
              <Text style={styles.quotedHandle}>@{post.original_username}</Text>
              <Text style={styles.quotedMessage} numberOfLines={3}>{post.original_message}</Text>
            </View>
          ) : null}

          {/* Action bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setComposingReply(v => !v); setShowReplies(true); if (!showReplies) loadReplies(); }}
              accessibilityLabel="Reply"
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.textFaint} />
              {(post.reply_count ?? 0) > 0 && <Text style={styles.actionCount}>{post.reply_count}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={onLike} accessibilityLabel={isLiked ? 'Unlike' : 'Like'}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={16} color={isLiked ? '#ef4444' : Colors.textFaint} />
              {post.likes > 0 && <Text style={[styles.actionCount, isLiked && { color: '#ef4444' }]}>{post.likes}</Text>}
            </TouchableOpacity>
          </View>

          {/* Reply composer */}
          {composingReply && (
            <View style={styles.replyComposer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Write a reply…"
                placeholderTextColor={Colors.textFaint}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                autoFocus
              />
              <TouchableOpacity
                style={[styles.replySubmit, !replyText.trim() && { opacity: 0.4 }]}
                onPress={handleSendReply}
                disabled={!replyText.trim()}
              >
                <Text style={styles.replySubmitText}>Reply</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Replies */}
          {showReplies && (
            <View style={styles.repliesWrap}>
              {loadingReplies
                ? <ActivityIndicator size="small" color={Colors.textFaint} style={{ marginVertical: 8 }} />
                : replies.map(r => <ReplyRow key={r.reply_id} reply={r} />)
              }
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Compose sheet ─────────────────────────────────────────────────────────────
function ComposeSheet({ user, onDone, onClose }: { user: CurrentUser; onDone: () => void; onClose: () => void }) {
  const [message, setMessage]           = useState('');
  const [posting, setPosting]           = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [rating, setRating]             = useState(0);
  const [showMovieSearch, setShowMovieSearch] = useState(false);
  const [showRating, setShowRating]     = useState(false);
  const [movieQuery, setMovieQuery]     = useState('');
  const [movieResults, setMovieResults] = useState<Movie[]>([]);
  const [searchingMovies, setSearchingMovies] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ user_id: string; username: string }[]>([]);
  const movieSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<any>(null);

  // Movie search debounce
  useEffect(() => {
    if (movieSearchTimer.current) clearTimeout(movieSearchTimer.current);
    if (!movieQuery.trim()) { setMovieResults([]); return; }
    movieSearchTimer.current = setTimeout(async () => {
      setSearchingMovies(true);
      const r = await searchMovies(movieQuery.trim()).catch(() => []);
      setMovieResults(r.slice(0, 8));
      setSearchingMovies(false);
    }, 350);
  }, [movieQuery]);

  const handleMessageChange = (text: string) => {
    setMessage(text);
    // Detect @mention
    const match = text.match(/@(\w*)$/);
    if (match) {
      const q = match[1];
      setMentionQuery(q);
      if (q.length >= 1) {
        searchUsers(q, user.user_id).then(r => setMentionResults(r.slice(0, 5))).catch(() => {});
      } else {
        setMentionResults([]);
      }
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const insertMention = (username: string) => {
    const newText = message.replace(/@\w*$/, `@${username} `);
    setMessage(newText);
    setMentionQuery(null);
    setMentionResults([]);
  };

  async function submit() {
    if (!message.trim() && !selectedMovie) return;
    setPosting(true);
    try {
      await createPost({
        user_id: user.user_id,
        username: user.username,
        message: message.trim(),
        ...(selectedMovie ? {
          movie_id: selectedMovie.id,
          movie_title: selectedMovie.title,
          movie_poster: selectedMovie.poster,
          rating,
        } : {}),
      });
      onDone();
    } catch { Alert.alert('Error', 'Could not post. Try again.'); }
    setPosting(false);
  }

  const canPost = (message.trim().length > 0 || !!selectedMovie) && !posting;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.composeSheet}>
      {/* Header */}
      <View style={styles.composeHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.postBtn, !canPost && { opacity: 0.4 }]} onPress={submit} disabled={!canPost}>
          {posting ? <ActivityIndicator size="small" color="#0A0A0A" /> : <Text style={styles.postBtnText}>Post</Text>}
        </TouchableOpacity>
      </View>

      {/* Text input row */}
      <View style={styles.composeBody}>
        <Avatar uri={user.avatarUrl} name={user.username} size={40} />
        <TextInput
          ref={inputRef}
          style={styles.composeInput}
          placeholder="What did you watch?"
          placeholderTextColor={Colors.textFaint}
          multiline
          autoFocus
          value={message}
          onChangeText={handleMessageChange}
        />
      </View>

      {/* @mention suggestions */}
      {mentionQuery !== null && mentionResults.length > 0 && (
        <View style={styles.mentionList}>
          {mentionResults.map(u => (
            <TouchableOpacity key={u.user_id} style={styles.mentionRow} onPress={() => insertMention(u.username)}>
              <Ionicons name="person-circle-outline" size={18} color={Colors.textFaint} />
              <Text style={styles.mentionText}>@{u.username}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tagged movie card */}
      {selectedMovie && (
        <View style={styles.taggedMovie}>
          {selectedMovie.poster ? (
            <Image source={{ uri: selectedMovie.poster }} style={styles.taggedPoster} contentFit="cover" />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.taggedTitle} numberOfLines={1}>{selectedMovie.title}</Text>
            <Text style={styles.taggedYear}>{selectedMovie.year}</Text>
            {rating > 0 && <Text style={{ color: '#fbbf24', fontSize: 12, marginTop: 2 }}>{'★'.repeat(Math.round(rating / 2))} {rating}/10</Text>}
          </View>
          <TouchableOpacity onPress={() => { setSelectedMovie(null); setRating(0); }} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={20} color={Colors.textFaint} />
          </TouchableOpacity>
        </View>
      )}

      {/* Movie search panel */}
      {showMovieSearch && (
        <View style={styles.movieSearchPanel}>
          <View style={styles.movieSearchBar}>
            <Ionicons name="search-outline" size={14} color={Colors.textFaint} />
            <TextInput
              style={styles.movieSearchInput}
              placeholder="Search movies & shows…"
              placeholderTextColor={Colors.textFaint}
              value={movieQuery}
              onChangeText={setMovieQuery}
              autoFocus
            />
            {searchingMovies && <ActivityIndicator size="small" color={Colors.textFaint} />}
          </View>
          {movieResults.map(m => (
            <TouchableOpacity key={m.id} style={styles.movieResultRow} onPress={() => {
              setSelectedMovie(m);
              setShowMovieSearch(false);
              setMovieQuery('');
              setMovieResults([]);
            }}>
              {m.poster ? <Image source={{ uri: m.poster }} style={styles.movieResultPoster} contentFit="cover" /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.movieResultTitle} numberOfLines={1}>{m.title}</Text>
                <Text style={styles.movieResultYear}>{m.year}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Rating picker */}
      {showRating && selectedMovie && (
        <View style={styles.ratingPicker}>
          <Text style={{ color: Colors.textFaint, fontSize: 12, marginBottom: 8 }}>Your rating</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.ratingBtn, rating === n && styles.ratingBtnActive]}
                onPress={() => setRating(rating === n ? 0 : n)}
              >
                <Text style={[styles.ratingBtnText, rating === n && { color: '#0A0A0A' }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Toolbar */}
      <View style={styles.composeToolbar}>
        <TouchableOpacity
          style={[styles.toolbarBtn, (showMovieSearch || !!selectedMovie) && styles.toolbarBtnActive]}
          onPress={() => { setShowMovieSearch(v => !v); setShowRating(false); }}
        >
          <Ionicons name="film-outline" size={18} color={showMovieSearch || selectedMovie ? Colors.accent : Colors.textFaint} />
          <Text style={[styles.toolbarLabel, (showMovieSearch || !!selectedMovie) && { color: Colors.accent }]}>
            {selectedMovie ? 'Change film' : 'Tag film'}
          </Text>
        </TouchableOpacity>
        {selectedMovie && (
          <TouchableOpacity
            style={[styles.toolbarBtn, showRating && styles.toolbarBtnActive]}
            onPress={() => { setShowRating(v => !v); setShowMovieSearch(false); }}
          >
            <Ionicons name="star-outline" size={18} color={rating > 0 ? '#fbbf24' : Colors.textFaint} />
            <Text style={[styles.toolbarLabel, rating > 0 && { color: '#fbbf24' }]}>
              {rating > 0 ? `${rating}/10` : 'Rate'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function SocialScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('feed');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => { getUser().then(setUser); }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Social</Text>
        {user && (
          <TouchableOpacity style={styles.composeBtn} onPress={() => setComposing(true)} accessibilityLabel="Compose">
            <Ionicons name="add" size={18} color="#0A0A0A" />
            <Text style={styles.composeBtnText}>Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        {(['feed', 'friends'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tabPill, tab === t && styles.tabPillActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabPillText, tab === t && styles.tabPillTextActive]}>
              {t === 'feed' ? 'Feed' : 'Friends'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'feed'    && <FeedTab user={user} onCompose={() => setComposing(true)} />}
      {tab === 'friends' && <FriendsTab user={user} />}

      {/* Compose overlay */}
      {composing && user && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={styles.composeBackdrop} activeOpacity={1} onPress={() => setComposing(false)} />
          <ComposeSheet
            user={user}
            onClose={() => setComposing(false)}
            onDone={() => { setComposing(false); }}
          />
        </View>
      )}
    </View>
  );
}

// ── Feed tab ──────────────────────────────────────────────────────────────────
function FeedTab({ user, onCompose }: { user: CurrentUser | null; onCompose: () => void }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>('all');
  const [profileSheetId, setProfileSheetId] = useState<string | null>(null);

  const enrichWithAvatars = useCallback(async (rawPosts: FeedPost[]): Promise<FeedPost[]> => {
    const needsAvatar = rawPosts.filter(p => !p.avatarUrl);
    if (!needsAvatar.length) return rawPosts;
    const uniqueIds = [...new Set(needsAvatar.map(p => p.user_id))];
    const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id).catch(() => null)));
    const avatarMap: Record<string, string> = {};
    uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
    return rawPosts.map(p => p.avatarUrl ? p : { ...p, avatarUrl: avatarMap[p.user_id] });
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const raw = await getFeed(40);
      const enriched = await enrichWithAvatars(raw);
      setPosts(enriched);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [enrichWithAvatars]);

  useEffect(() => { load(); }, []);

  const handleLike = useCallback(async (post_id: string) => {
    if (!user) return;
    await likePost(post_id, user.user_id);
    setPosts(prev => prev.map(p => {
      if (p.post_id !== post_id) return p;
      const liked = p.liked_by.includes(user.user_id);
      return {
        ...p,
        likes: liked ? p.likes - 1 : p.likes + 1,
        liked_by: liked ? p.liked_by.filter(id => id !== user.user_id) : [...p.liked_by, user.user_id],
      };
    }));
  }, [user]);

  const handleDelete = useCallback((post_id: string) => {
    if (!user) return;
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deletePost(post_id, user.user_id);
        setPosts(prev => prev.filter(p => p.post_id !== post_id));
      }},
    ]);
  }, [user]);

  const handleReply = useCallback(async (post_id: string, text: string) => {
    if (!user) return;
    await addReply(post_id, user.user_id, user.username, text).catch(() => {});
  }, [user]);

  const displayed = feedMode === 'friends'
    ? posts.filter(p => p.user_id !== user?.user_id)
    : posts;

  if (loading) return <ActivityIndicator color={Colors.accent} style={{ marginTop: 48 }} />;

  return (
    <>
      {/* Feed mode toggle */}
      <View style={styles.feedToggle}>
        {(['all', 'friends'] as FeedMode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.feedToggleBtn, feedMode === m && styles.feedToggleBtnActive]}
            onPress={() => setFeedMode(m)}
          >
            <Text style={[styles.feedToggleText, feedMode === m && styles.feedToggleTextActive]}>
              {m === 'all' ? 'For You' : 'Following'}
            </Text>
            {feedMode === m && <View style={styles.feedToggleIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={p => p.post_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Colors.accent} />}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            currentUserId={user?.user_id ?? ''}
            isFirst={index < 3}
            onLike={() => handleLike(item.post_id)}
            onDelete={() => handleDelete(item.post_id)}
            onReply={(text) => handleReply(item.post_id, text)}
            onPressProfile={setProfileSheetId}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyDesc}>Be the first to share what you watched.</Text>
            {user && (
              <TouchableOpacity style={styles.emptyBtn} onPress={onCompose}>
                <Text style={styles.emptyBtnText}>Write a post</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {profileSheetId && (
        <UserProfileSheet
          userId={profileSheetId}
          currentUserId={user?.user_id ?? ''}
          onClose={() => setProfileSheetId(null)}
        />
      )}
    </>
  );
}

// ── Friends tab ───────────────────────────────────────────────────────────────
function FriendsTab({ user }: { user: CurrentUser | null }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends]   = useState<FriendCard[]>([]);
  const [loading, setLoading]   = useState(true);
  const [profileSheetId, setProfileSheetId] = useState<string | null>(null);

  // Find-people search
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<UserPublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo]     = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      getFriendRequests(user.user_id).catch(() => []),
      getFriends(user.user_id).catch(() => []),
    ]).then(async ([r, f]) => {
      setRequests(r);
      setFriends(f);          // show names immediately
      setLoading(false);
      // Enrich with real avatars + bios from public profiles
      const enriched = await Promise.all(
        f.map(async fr => {
          const p = await getUserPublicProfile(fr.friend_id).catch(() => null);
          return p
            ? { ...fr, avatarUrl: p.avatarUrl ?? fr.avatarUrl, bio: p.bio, displayName: p.displayName }
            : fr;
        })
      );
      setFriends(enriched);
    });
  }, [user?.user_id]);

  useEffect(() => { load(); }, [load]);

  // Debounced user search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!user || !query.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const r = await searchUsers(query.trim(), user.user_id).catch(() => []);
      setResults(r);
      setSearching(false);
    }, 300);
  }, [query, user?.user_id]);

  const friendIds = useMemo(() => new Set(friends.map(f => f.friend_id)), [friends]);

  const handleAdd = async (target: UserPublicProfile) => {
    if (!user) return;
    setSentTo(prev => new Set(prev).add(target.user_id));
    await sendFriendRequest(target.user_id, user.user_id, user.username).catch(() => {
      setSentTo(prev => { const n = new Set(prev); n.delete(target.user_id); return n; });
    });
  };

  const handleAccept = async (req: any) => {
    if (!user) return;
    await acceptFriendRequest(user.user_id, user.username, req.from_user_id, req.from_username).catch(() => {});
    setRequests(p => p.filter(r => r.from_user_id !== req.from_user_id));
    setFriends(p => [{ friend_id: req.from_user_id, friend_username: req.from_username, avatarUrl: req.avatarUrl, since: new Date().toISOString() }, ...p]);
  };

  const handleDecline = async (req: any) => {
    if (!user) return;
    await rejectFriendRequest(user.user_id, req.from_user_id).catch(() => {});
    setRequests(p => p.filter(r => r.from_user_id !== req.from_user_id));
  };

  if (loading) return <ActivityIndicator color={Colors.accent} style={{ marginTop: 48 }} />;

  return (
    <View style={{ flex: 1 }}>
      {/* Find people */}
      <View style={styles.friendSearchWrap}>
        <View style={[styles.friendSearchBar, query.length > 0 && styles.friendSearchBarActive]}>
          <Ionicons name="search-outline" size={17} color={query.length > 0 ? Colors.textMuted : Colors.textFaint} />
          <TextInput
            style={styles.friendSearchInput}
            placeholder="Find people by username"
            placeholderTextColor={Colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim().length > 0 ? (
        /* ── User search results ── */
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {searching ? (
            <ActivityIndicator color={Colors.textFaint} style={{ marginTop: 32 }} />
          ) : results.length === 0 ? (
            <Text style={styles.emptyDesc}>No users match "{query.trim()}".</Text>
          ) : results.map(u => {
            const isFriend = friendIds.has(u.user_id);
            const isSent   = sentTo.has(u.user_id);
            return (
              <View key={u.user_id} style={styles.userRow}>
                <TouchableOpacity style={styles.userRowMain} onPress={() => setProfileSheetId(u.user_id)} activeOpacity={0.7}>
                  <Avatar uri={u.avatarUrl} name={u.username} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>{u.displayName || u.username}</Text>
                    <Text style={styles.userHandle}>@{u.username}</Text>
                  </View>
                </TouchableOpacity>
                {isFriend ? (
                  <View style={styles.statusPill}>
                    <Ionicons name="checkmark" size={13} color={Colors.textMuted} />
                    <Text style={styles.statusPillText}>Friends</Text>
                  </View>
                ) : isSent ? (
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>Requested</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addPill} onPress={() => handleAdd(u)}>
                    <Ionicons name="person-add" size={13} color="#0A0A0A" />
                    <Text style={styles.addPillText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* ── Requests + friends list ── */
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {requests.length > 0 && (
            <View style={styles.friendsSection}>
              <Text style={styles.sectionLabel}>Requests · {requests.length}</Text>
              {requests.map(req => (
                <View key={req.from_user_id} style={styles.requestCard}>
                  <TouchableOpacity onPress={() => setProfileSheetId(req.from_user_id)}>
                    <Avatar uri={req.avatarUrl} name={req.from_username} size={44} />
                  </TouchableOpacity>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{req.from_username}</Text>
                    <Text style={styles.requestHandle}>wants to be friends</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleDecline(req)}>
                      <Ionicons name="close" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req)}>
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.friendsSection}>
            <Text style={styles.sectionLabel}>Friends{friends.length ? ` · ${friends.length}` : ''}</Text>
            {friends.length === 0 ? (
              <View style={styles.friendsEmpty}>
                <Ionicons name="people-outline" size={38} color={Colors.textFaint} />
                <Text style={styles.friendsEmptyText}>No friends yet</Text>
                <Text style={styles.emptyDesc}>Search above to find people and send requests.</Text>
              </View>
            ) : friends.map(f => (
              <TouchableOpacity key={f.friend_id} style={styles.friendRow} onPress={() => setProfileSheetId(f.friend_id)} activeOpacity={0.7}>
                <Avatar uri={f.avatarUrl} name={f.friend_username} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>{f.displayName || f.friend_username}</Text>
                  <Text style={styles.userHandle}>@{f.friend_username}</Text>
                  {!!f.bio && <Text style={styles.friendBio} numberOfLines={2}>{f.bio}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} style={{ marginTop: 2 }} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {profileSheetId && user && (
        <UserProfileSheet
          userId={profileSheetId}
          currentUserId={user.user_id}
          onClose={() => setProfileSheetId(null)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  screenTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  composeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, borderRadius: 20, paddingLeft: 10, paddingRight: 14, paddingVertical: 7 },
  composeBtnText: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)' },
  tabPillActive: { backgroundColor: '#fff' },
  tabPillText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  tabPillTextActive: { color: '#0A0A0A', fontWeight: '700' },

  feedToggle: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  feedToggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 13, position: 'relative' },
  feedToggleBtnActive: {},
  feedToggleText: { fontSize: 14, fontWeight: '600', color: Colors.textFaint },
  feedToggleTextActive: { color: Colors.textPrimary },
  feedToggleIndicator: { position: 'absolute', bottom: 0, height: 2, width: 36, backgroundColor: Colors.accent, borderRadius: 1 },

  // Post card
  postCard: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  repostBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginLeft: 48 },
  repostText: { color: Colors.textFaint, fontSize: 12 },
  postRow: { flexDirection: 'row', gap: 12 },
  avatarCol: { alignItems: 'center' },
  threadLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 6, marginBottom: 4, borderRadius: 1, minHeight: 20 },
  postBody: { flex: 1, paddingBottom: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6, flexWrap: 'wrap' },
  postDisplayName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  postHandle: { color: Colors.textFaint, fontSize: 13 },
  postDot: { color: Colors.textFaint, fontSize: 13 },
  postTime: { color: Colors.textFaint, fontSize: 13, flex: 1 },
  deleteBtn: { padding: 4 },

  movieMedia: { marginBottom: 10 },
  moviePosterLarge: { width: POSTER_W, height: POSTER_H, borderRadius: 14, backgroundColor: Colors.bgCard },
  moviePosterEmpty: { alignItems: 'center', justifyContent: 'center' },
  movieTitleLarge: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 10, lineHeight: 20 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  ratingNum: { color: Colors.textFaint, fontSize: 12, marginLeft: 5, fontWeight: '600' },

  postMessage: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22, marginBottom: 10 },

  quotedPost: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  quotedHandle: { color: Colors.textFaint, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  quotedMessage: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },

  actionBar: { flexDirection: 'row', gap: 24, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  actionCount: { color: Colors.textFaint, fontSize: 13 },

  replyComposer: { marginTop: 10, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  replyInput: { color: Colors.textPrimary, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  replySubmit: { alignSelf: 'flex-end', backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7, marginTop: 8 },
  replySubmitText: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },

  repliesWrap: { marginTop: 8 },
  replyRow: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  replyContent: { flex: 1 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  replyUsername: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  replyTime: { color: Colors.textFaint, fontSize: 12 },
  replyText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 19 },

  // Compose
  composeBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  composeSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, minHeight: 220, borderTopWidth: 1, borderColor: Colors.border, maxHeight: '92%' },
  composeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cancelBtn: { color: Colors.textMuted, fontSize: 16 },
  postBtn: { backgroundColor: Colors.accent, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  postBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 14 },
  composeBody: { flexDirection: 'row', gap: 12 },
  composeInput: { flex: 1, color: Colors.textPrimary, fontSize: 16, textAlignVertical: 'top', minHeight: 80 },

  // Mention suggestions
  mentionList: { backgroundColor: Colors.bgElevated, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mentionText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },

  // Tagged movie
  taggedMovie: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 10, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  taggedPoster: { width: 36, height: 54, borderRadius: 6 },
  taggedTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  taggedYear: { color: Colors.textFaint, fontSize: 12, marginTop: 1 },

  // Movie search panel
  movieSearchPanel: { marginTop: 8, backgroundColor: Colors.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', maxHeight: 280 },
  movieSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  movieSearchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  movieResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  movieResultPoster: { width: 30, height: 45, borderRadius: 5 },
  movieResultTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  movieResultYear: { color: Colors.textFaint, fontSize: 11, marginTop: 1 },

  // Rating
  ratingPicker: { marginTop: 8, backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  ratingBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  ratingBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  ratingBtnText: { color: Colors.textFaint, fontSize: 13, fontWeight: '700' },

  // Toolbar
  composeToolbar: { flexDirection: 'row', gap: 4, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  toolbarBtnActive: { backgroundColor: `${Colors.accent}15` },
  toolbarLabel: { color: Colors.textFaint, fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
  emptyBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 14 },

  // Friends — find people
  friendSearchWrap:   { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  friendSearchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 10 },
  friendSearchBarActive: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.09)' },
  friendSearchInput:  { flex: 1, color: Colors.textPrimary, fontSize: 15, padding: 0 },

  friendsSection:     { paddingHorizontal: 16, marginTop: 8 },
  sectionLabel:       { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginTop: 8 },

  // User row (search results & friends list)
  userRow:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  userRowMain:        { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  friendRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  friendBio:          { color: Colors.textMuted, fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  userName:           { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  userHandle:         { color: Colors.textFaint, fontSize: 13, marginTop: 1 },
  addPill:            { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  addPillText:        { color: '#0A0A0A', fontSize: 13, fontWeight: '700' },
  statusPill:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  statusPillText:     { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },

  // Requests
  requestCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 12, marginBottom: 8 },
  requestInfo:        { flex: 1 },
  requestName:        { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  requestHandle:      { color: Colors.textFaint, fontSize: 13, marginTop: 1 },
  requestActions:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rejectBtn:          { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  acceptBtn:          { backgroundColor: Colors.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  acceptText:         { color: '#0A0A0A', fontSize: 13, fontWeight: '700' },

  friendsEmpty:       { alignItems: 'center', paddingTop: 40, paddingHorizontal: 30, gap: 8 },
  friendsEmptyText:   { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 4 },
});
