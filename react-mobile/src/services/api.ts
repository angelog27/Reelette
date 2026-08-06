/**
 * API service — mirrors REACT PAGES/src/app/services/api.ts
 * Key differences from web:
 *  - localStorage → AsyncStorage (via src/lib/storage.ts)
 *  - import.meta.env → process.env.EXPO_PUBLIC_*
 *  - Cache helpers imported from storage.ts
 */
import { auth } from './firebase';
import { storage, fromCache, fromCachePersisted, bustCache, bustCachePrefix } from '../lib/storage';
import type {
  Movie, CurrentUser, UserProfile, UserPublicProfile,
  WatchedMovie, FeedPost, PostReply, Friend, FriendRequest,
  MovieGroup, GroupMessage, Conversation, DirectMessage,
  RouletteSpin, MovieRanking, AppNotification, NotifPrefs,
  AIRecommendationRow, DiscoverFilters,
} from '../types';

export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://reelette-api.onrender.com') + '/api';

// ── TTLs ─────────────────────────────────────────────────────────────────────
const TTL = {
  TRENDING:   5  * 60 * 1000,
  CATALOG:    30 * 60 * 1000,
  MOVIE:      30 * 60 * 1000,
  USER:       10 * 60 * 1000,
  FEED:       2  * 60 * 1000,
  SHORT:      90 * 1000,
};

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function getIdToken(): Promise<string | null> {
  try {
    const user = auth?.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

// ── User storage ──────────────────────────────────────────────────────────────
const USER_KEY = 'reelette_user';
const SERVICES_KEY = 'reelette_services';

export async function saveUser(user: CurrentUser): Promise<void> {
  await storage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<CurrentUser | null> {
  const raw = await storage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function clearUser(): Promise<void> {
  await storage.removeItem(USER_KEY);
  await storage.removeItem('reelette_firebase_token');
}

export async function getServices(): Promise<Record<string, boolean>> {
  const raw = await storage.getItem(SERVICES_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function saveServices(services: Record<string, boolean>): Promise<void> {
  await storage.setItem(SERVICES_KEY, JSON.stringify(services));
}

export async function clearServices(): Promise<void> {
  await storage.removeItem(SERVICES_KEY);
}

// ── Time helper ───────────────────────────────────────────────────────────────
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

// ── Authentication ────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Login failed');
  return res.json();
}

export async function register(email: string, password: string, username: string) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Registration failed');
  return res.json();
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function loginWithOAuth(provider: string, firebaseUser: { uid: string; email: string | null; displayName: string | null }) {
  const res = await fetch(`${BASE_URL}/auth/oauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName }),
  });
  if (!res.ok) throw new Error('OAuth login failed');
  return res.json();
}

// ── Movies ────────────────────────────────────────────────────────────────────
export function getTrendingMovies(window: 'week' | 'day' = 'week'): Promise<Movie[]> {
  return fromCache(`trending_${window}`, TTL.TRENDING, async () => {
    const res = await fetch(`${BASE_URL}/movies/trending?window=${window}`);
    const d = await res.json();
    return (d.movies ?? d) as Movie[];
  });
}

export function getTopRatedMovies(page = 1): Promise<Movie[]> {
  return fromCache(`toprated_${page}`, TTL.CATALOG, async () => {
    const res = await fetch(`${BASE_URL}/movies/top-rated?page=${page}`);
    const d = await res.json();
    return (d.movies ?? d) as Movie[];
  });
}

export function getNewReleases(): Promise<Movie[]> {
  return fromCache('new_releases', TTL.CATALOG, async () => {
    const res = await fetch(`${BASE_URL}/movies/upcoming`);
    const d = await res.json();
    return (d.movies ?? d) as Movie[];
  });
}

export function searchMovies(query: string, page = 1): Promise<Movie[]> {
  return fromCache(`search_m_${query}_${page}`, TTL.SHORT, async () => {
    const res = await fetch(`${BASE_URL}/movies/search?q=${encodeURIComponent(query)}&page=${page}`);
    const d = await res.json();
    return (d.movies ?? d) as Movie[];
  });
}

export function searchShows(query: string, page = 1): Promise<Movie[]> {
  return fromCache(`search_s_${query}_${page}`, TTL.SHORT, async () => {
    const res = await fetch(`${BASE_URL}/shows/search?q=${encodeURIComponent(query)}&page=${page}`);
    const d = await res.json();
    return (d.shows ?? d) as Movie[];
  });
}

export function discoverMovies(filters: DiscoverFilters = {}): Promise<Movie[]> {
  const key = `discover_m_${JSON.stringify(Object.fromEntries(Object.entries(filters).sort()))}`;
  return fromCache(key, TTL.CATALOG, async () => {
    try {
      const res = await fetch(`${BASE_URL}/movies/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      if (!res.ok) return [];
      const d = await res.json();
      return (d.movies ?? []) as Movie[];
    } catch { return []; }
  });
}

export function discoverShows(filters: DiscoverFilters = {}): Promise<Movie[]> {
  const key = `discover_s_${JSON.stringify(Object.fromEntries(Object.entries(filters).sort()))}`;
  return fromCache(key, TTL.CATALOG, async () => {
    try {
      const res = await fetch(`${BASE_URL}/shows/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      if (!res.ok) return [];
      const d = await res.json();
      return (d.shows ?? d.movies ?? []) as Movie[];
    } catch { return []; }
  });
}

export function getMovieDetails(movie_id: string): Promise<Record<string, unknown>> {
  return fromCachePersisted(`movie_${movie_id}`, TTL.MOVIE, 24 * 60 * 60 * 1000, async () => {
    const res = await fetch(`${BASE_URL}/movies/${movie_id}`);
    return res.json();
  });
}

export function getShowDetails(show_id: string): Promise<Record<string, unknown>> {
  return fromCachePersisted(`show_${show_id}`, TTL.MOVIE, 24 * 60 * 60 * 1000, async () => {
    const res = await fetch(`${BASE_URL}/shows/${show_id}`);
    return res.json();
  });
}

export function getMovieRecommendations(movie_id: string): Promise<Movie[]> {
  return fromCache(`recs_${movie_id}`, TTL.CATALOG, async () => {
    const res = await fetch(`${BASE_URL}/movies/${movie_id}/recommendations`);
    const d = await res.json();
    return (d.movies ?? d) as Movie[];
  });
}

export function getAIRecommendations(): Promise<AIRecommendationRow[]> {
  return fromCache('ai_recs', TTL.CATALOG, async () => {
    const res = await authedFetch(`${BASE_URL}/movies/ai-recommendations`);
    const d = await res.json();
    return (d.rows ?? d) as AIRecommendationRow[];
  });
}

// ── Watched & Watchlist ───────────────────────────────────────────────────────
export async function getWatchedMovies(user_id: string, limit = 50, cursor?: string): Promise<WatchedMovie[]> {
  const qs = new URLSearchParams({ limit: String(limit), ...(cursor ? { cursor } : {}) }).toString();
  const res = await authedFetch(`${BASE_URL}/watched/${user_id}?${qs}`);
  const d = await res.json();
  const items = (d.movies ?? d) as any[];
  if (!Array.isArray(items)) return [];
  // Normalise media_type so the shows tab works regardless of which field the backend populates
  return items.map(item => ({
    ...item,
    media_type: item.media_type ?? (item.type === 'show' ? 'show' : item.type === 'movie' ? 'movie' : undefined),
  })) as WatchedMovie[];
}

export function getWatchedMovie(user_id: string, movie_id: string): Promise<WatchedMovie | null> {
  // Short-lived cache: keeps repeated movie-detail opens + friends'-activity lookups fast.
  return fromCache(`watched_one_${user_id}_${movie_id}`, TTL.SHORT, async () => {
    try {
      const res = await authedFetch(`${BASE_URL}/watched/${user_id}/${movie_id}`);
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  });
}

export async function addWatchedMovie(
  user_id: string,
  movie: Movie,
  user_rating: number,
  comment = ''
): Promise<void> {
  await authedFetch(`${BASE_URL}/watched/${user_id}`, {
    method: 'POST',
    body: JSON.stringify({
      movie_id: movie.id,
      movie_title: movie.title,
      user_rating,
      comment,
      poster: movie.poster,
      media_type: movie.type ?? (movie as any).media_type ?? 'movie',
    }),
  });
  await bustCache(`watched_one_${user_id}_${movie.id}`);
}

export async function updateWatchedMovie(
  user_id: string,
  movie_id: string,
  rating: number,
  comment: string
): Promise<void> {
  await authedFetch(`${BASE_URL}/watched/${user_id}/${movie_id}`, {
    method: 'PUT',
    body: JSON.stringify({ user_rating: rating, comment }),
  });
  await bustCache(`watched_one_${user_id}_${movie_id}`);
}

export async function getWatchLater(user_id: string): Promise<string[]> {
  try {
    const res = await authedFetch(`${BASE_URL}/watchlist/${user_id}`);
    if (!res.ok) return [];
    const d = await res.json();
    const result = d.movies ?? d.movie_ids ?? [];
    return Array.isArray(result) ? result : [];
  } catch { return []; }
}

export async function watchMovieLater(user_id: string, movie_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/watchlist/${user_id}/${movie_id}`, { method: 'POST' });
}

export async function removeFromWatchLater(user_id: string, movie_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/watchlist/${user_id}/${movie_id}`, { method: 'DELETE' });
}

// ── Social Feed ───────────────────────────────────────────────────────────────
const _feedCache = new Map<string, FeedPost>();

function mergeFeedPosts(posts: FeedPost[]) {
  posts.forEach(p => _feedCache.set(p.post_id, p));
}

export function sortedFeedPosts(): FeedPost[] {
  return [..._feedCache.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getFeed(limit = 30): Promise<FeedPost[]> {
  const res = await authedFetch(`${BASE_URL}/feed?limit=${limit}`);
  const d = await res.json();
  const posts = (d.posts ?? d) as FeedPost[];
  mergeFeedPosts(posts);
  return sortedFeedPosts();
}

export async function createPost(payload: {
  user_id: string; username: string; message: string;
  movie_id?: string; movie_title?: string; movie_poster?: string; rating?: number;
}): Promise<void> {
  await authedFetch(`${BASE_URL}/feed`, { method: 'POST', body: JSON.stringify(payload) });
  bustCache('feed');
}

export async function likePost(post_id: string, user_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/feed/${post_id}/like`, { method: 'POST', body: JSON.stringify({ user_id }) });
}

export async function deletePost(post_id: string, user_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/feed/${post_id}`, { method: 'DELETE', body: JSON.stringify({ user_id }) });
  _feedCache.delete(post_id);
}

export async function getReplies(post_id: string): Promise<PostReply[]> {
  const res = await authedFetch(`${BASE_URL}/feed/${post_id}/replies`);
  const d = await res.json();
  return (d.replies ?? d) as PostReply[];
}

export async function addReply(post_id: string, user_id: string, username: string, message: string): Promise<void> {
  await authedFetch(`${BASE_URL}/feed/${post_id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ user_id, username, message }),
  });
}

// ── User Profile ──────────────────────────────────────────────────────────────
export async function getUserProfile(user_id: string): Promise<UserProfile> {
  const res = await authedFetch(`${BASE_URL}/user/${user_id}`);
  return res.json();
}

export async function getUserPublicProfile(user_id: string): Promise<UserPublicProfile | null> {
  return fromCachePersisted(`pub_${user_id}`, TTL.USER, TTL.USER * 3, async () => {
    const res = await fetch(`${BASE_URL}/user/${user_id}/public`);
    if (!res.ok) return null;
    return res.json();
  });
}

export async function updateUserProfile(user_id: string, data: Partial<UserProfile>): Promise<void> {
  await authedFetch(`${BASE_URL}/user/${user_id}`, { method: 'PUT', body: JSON.stringify(data) });
  await bustCachePrefix(`pub_${user_id}`);
}

export async function updateUserAvatar(user_id: string, avatar_url: string): Promise<void> {
  await authedFetch(`${BASE_URL}/user/${user_id}/avatar`, { method: 'PUT', body: JSON.stringify({ avatar_url }) });
}

export async function updateLastSeen(user_id: string): Promise<void> {
  authedFetch(`${BASE_URL}/user/${user_id}/lastseen`, { method: 'PUT' }).catch(() => {});
}

export async function deleteUserAccount(user_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/user/${user_id}`, { method: 'DELETE' });
}

export async function searchUsers(query: string, excludeUserId: string): Promise<UserPublicProfile[]> {
  const res = await authedFetch(`${BASE_URL}/users/search?q=${encodeURIComponent(query)}&exclude=${excludeUserId}`);
  const d = await res.json();
  return (d.users ?? d) as UserPublicProfile[];
}

// ── Streaming Services ────────────────────────────────────────────────────────
export async function getUserStreaming(user_id: string): Promise<Record<string, boolean>> {
  const res = await authedFetch(`${BASE_URL}/user/${user_id}/streaming`);
  return res.json();
}

export async function updateUserStreaming(user_id: string, services: Record<string, boolean>): Promise<void> {
  await authedFetch(`${BASE_URL}/user/${user_id}/streaming`, { method: 'PUT', body: JSON.stringify(services) });
  await saveServices(services);
}

// ── Friends ───────────────────────────────────────────────────────────────────
export async function getFriends(user_id: string): Promise<Friend[]> {
  const res = await authedFetch(`${BASE_URL}/friends/${user_id}`);
  const d = await res.json();
  return (d.friends ?? d) as Friend[];
}

export async function getFriendRequests(user_id: string): Promise<FriendRequest[]> {
  const res = await authedFetch(`${BASE_URL}/friends/${user_id}/requests`);
  const d = await res.json();
  return (d.requests ?? d) as FriendRequest[];
}

export async function sendFriendRequest(
  to_user_id: string, from_user_id: string, from_username: string, from_avatar?: string
): Promise<void> {
  await authedFetch(`${BASE_URL}/friends/request`, {
    method: 'POST',
    body: JSON.stringify({ to_user_id, from_user_id, from_username, from_avatar }),
  });
}

export async function acceptFriendRequest(
  user_id: string, user_username: string, from_id: string, from_username: string
): Promise<void> {
  await authedFetch(`${BASE_URL}/friends/accept`, {
    method: 'POST',
    body: JSON.stringify({ user_id, user_username, from_id, from_username }),
  });
}

export async function rejectFriendRequest(user_id: string, from_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/friends/reject`, {
    method: 'POST',
    body: JSON.stringify({ user_id, from_id }),
  });
}

export async function removeFriend(user_id: string, friend_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/friends/${user_id}/${friend_id}`, { method: 'DELETE' });
}

// ── Groups ────────────────────────────────────────────────────────────────────
export async function createGroup(name: string, description: string, creator_id: string, creator_username: string): Promise<MovieGroup> {
  const res = await authedFetch(`${BASE_URL}/groups`, {
    method: 'POST',
    body: JSON.stringify({ name, description, creator_id, creator_username }),
  });
  return res.json();
}

export async function getGroup(group_id: string): Promise<MovieGroup | null> {
  try {
    const res = await authedFetch(`${BASE_URL}/groups/${group_id}`);
    return res.json();
  } catch { return null; }
}

export async function getUserGroups(user_id: string): Promise<MovieGroup[]> {
  const res = await authedFetch(`${BASE_URL}/groups/user/${user_id}`);
  const d = await res.json();
  return (d.groups ?? d) as MovieGroup[];
}

export async function addToGroupWatchlist(group_id: string, movie_id: string, movie_title: string, user_id: string, username: string, movie_poster?: string): Promise<void> {
  await authedFetch(`${BASE_URL}/groups/${group_id}/watchlist`, {
    method: 'POST',
    body: JSON.stringify({ movie_id, movie_title, movie_poster, user_id, username }),
  });
}

export async function removeFromGroupWatchlist(group_id: string, movie_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/groups/${group_id}/watchlist/${movie_id}`, { method: 'DELETE' });
}

export async function spinGroupRoulette(group_id: string): Promise<{ movie_id: string; movie_title: string; movie_poster?: string }> {
  const res = await authedFetch(`${BASE_URL}/groups/${group_id}/spin`, { method: 'POST' });
  return res.json();
}

export async function getGroupChat(group_id: string): Promise<GroupMessage[]> {
  const res = await authedFetch(`${BASE_URL}/groups/${group_id}/chat`);
  const d = await res.json();
  return (d.messages ?? d) as GroupMessage[];
}

export async function sendGroupMessage(group_id: string, sender_id: string, sender_username: string, text: string): Promise<void> {
  await authedFetch(`${BASE_URL}/groups/${group_id}/chat`, {
    method: 'POST',
    body: JSON.stringify({ sender_id, sender_username, text }),
  });
}

// ── Direct Messages ───────────────────────────────────────────────────────────
export async function getConversations(user_id: string): Promise<Conversation[]> {
  const res = await authedFetch(`${BASE_URL}/messages/${user_id}/conversations`);
  const d = await res.json();
  return (d.conversations ?? d) as Conversation[];
}

export async function openConversation(uid1: string, uid2: string, username1: string, username2: string): Promise<string> {
  const res = await authedFetch(`${BASE_URL}/messages/conversation`, {
    method: 'POST',
    body: JSON.stringify({ uid1, uid2, username1, username2 }),
  });
  const d = await res.json();
  return d.conversation_id as string;
}

export async function getDirectMessages(conversation_id: string): Promise<DirectMessage[]> {
  const res = await authedFetch(`${BASE_URL}/messages/${conversation_id}`);
  const d = await res.json();
  return (d.messages ?? d) as DirectMessage[];
}

export async function sendDirectMessage(conversation_id: string, sender_id: string, text: string): Promise<void> {
  await authedFetch(`${BASE_URL}/messages/${conversation_id}`, {
    method: 'POST',
    body: JSON.stringify({ sender_id, text }),
  });
}

// ── Roulette ──────────────────────────────────────────────────────────────────
export async function logRouletteSpin(user_id: string, movie_id: string, title: string, poster_url: string): Promise<void> {
  authedFetch(`${BASE_URL}/roulette/${user_id}/spin`, {
    method: 'POST',
    body: JSON.stringify({ movie_id, title, poster_url }),
  }).catch(() => {});
}

export async function getRouletteHistory(user_id: string, limit = 20): Promise<RouletteSpin[]> {
  const res = await authedFetch(`${BASE_URL}/roulette/${user_id}/history?limit=${limit}`);
  const d = await res.json();
  return (d.spins ?? d) as RouletteSpin[];
}

export async function getSmartSpinStatus(): Promise<{ available: boolean; hoursUntilReset: number }> {
  return fromCache('smart_spin_status', TTL.SHORT, async () => {
    const res = await authedFetch(`${BASE_URL}/roulette/smart-spin/status`);
    return res.json();
  });
}

export async function doSmartSpin(preferences: string[], mood: string, genre: string): Promise<{ movie: Movie; reason: string; groqPowered: boolean }> {
  const res = await authedFetch(`${BASE_URL}/roulette/smart-spin`, {
    method: 'POST',
    body: JSON.stringify({ preferences, mood, genre }),
  });
  return res.json();
}

// ── Rankings ──────────────────────────────────────────────────────────────────
export async function getUserRankings(user_id: string): Promise<MovieRanking[]> {
  const res = await authedFetch(`${BASE_URL}/rankings/${user_id}`);
  const d = await res.json();
  return (d.rankings ?? d) as MovieRanking[];
}

export async function createRanking(payload: {
  user_id: string; username: string; title: string;
  description: string; movies: Array<{ movie_id: string; movie_title: string; movie_poster: string }>;
  is_public: boolean;
}): Promise<void> {
  await authedFetch(`${BASE_URL}/rankings`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateRanking(ranking_id: string, payload: Partial<MovieRanking>): Promise<void> {
  await authedFetch(`${BASE_URL}/rankings/${ranking_id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteRanking(ranking_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/rankings/${ranking_id}`, { method: 'DELETE' });
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function getNotifications(user_id: string): Promise<AppNotification[]> {
  const res = await authedFetch(`${BASE_URL}/notifications/${user_id}`);
  const d = await res.json();
  return (d.notifications ?? d) as AppNotification[];
}

export async function markNotificationRead(user_id: string, notification_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/notifications/${user_id}/${notification_id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead(user_id: string): Promise<void> {
  await authedFetch(`${BASE_URL}/notifications/${user_id}/read-all`, { method: 'PUT' });
}

export async function getNotifPrefs(user_id: string): Promise<NotifPrefs> {
  const res = await authedFetch(`${BASE_URL}/notifications/${user_id}/prefs`);
  return res.json();
}

export async function saveNotifPrefs(user_id: string, prefs: NotifPrefs): Promise<void> {
  await authedFetch(`${BASE_URL}/notifications/${user_id}/prefs`, { method: 'PUT', body: JSON.stringify(prefs) });
}

// Re-export cache utilities for use in screens
export { bustCache, bustCachePrefix };
