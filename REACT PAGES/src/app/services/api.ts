export const BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000') + '/api';


// ── Simple in-memory TTL cache ───────────────────────────────────
// Caches stable/global data (movie catalogs, movie details) to avoid
// redundant network hits on every tab visit.

const _cache = new Map<string, { data: unknown; expires: number }>();

function fromCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data as T);
  return fn().then((data) => {
    _cache.set(key, { data, expires: Date.now() + ttlMs });
    return data;
  });
}

/** Manually bust a cache key (call after user mutations that affect cached data). */
export function bustCache(key: string) {
  _cache.delete(key);
}

const TTL = {
  CATALOG: 5 * 60 * 1000,   // 5 min — popular / trending / top-rated
  MOVIE:   10 * 60 * 1000,  // 10 min — individual movie details (TMDB data)
};


// ── Types ────────────────────────────────────────────────────────


export interface Movie {
  id: string;
  title: string;
  year: number;
  genres: string[];
  rating: number;
  poster: string;
  backdrop?: string;
  overview?: string;
  streamingService: string;
}


export interface FeedPost {
  post_id: string;
  user_id: string;
  username: string;
  avatarUrl?: string;
  message: string;
  movie_title: string;
  movie_id: string;
  movie_poster?: string;
  rating: number;
  likes: number;
  liked_by: string[];
  created_at: string;
  reply_count?: number;
}


export interface CurrentUser {
  user_id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}


// Maps Firebase service keys → friendly display names (must match badge in MovieCard)
export const SERVICE_DISPLAY: Record<string, string> = {
  netflix:     'Netflix',
  hulu:        'Hulu',
  disneyPlus:  'Disney+',
  hboMax:      'Max',
  amazonPrime: 'Prime Video',
  appleTV:     'Apple TV+',
  paramount:   'Paramount+',
  peacock:     'Peacock',
};


// ── Local user storage ───────────────────────────────────────────


export function saveUser(user: CurrentUser) {
  localStorage.setItem('reelette_user', JSON.stringify(user));
}


export function getUser(): CurrentUser | null {
  const raw = localStorage.getItem('reelette_user');
  return raw ? JSON.parse(raw) : null;
}


export function clearUser() {
  localStorage.removeItem('reelette_user');
}


export function clearServices() {
  localStorage.removeItem('reelette_services');
}


/** Cache the user's streaming service prefs locally */
export function saveServices(services: Record<string, boolean>) {
  localStorage.setItem('reelette_services', JSON.stringify(services));
}


export function getServices(): Record<string, boolean> {
  const raw = localStorage.getItem('reelette_services');
  return raw ? JSON.parse(raw) : {};
}


/** Returns true if the user has at least one service enabled */
export function hasServicesConfigured(services: Record<string, boolean>): boolean {
  return Object.values(services).some(Boolean);
}


// ── Auth ─────────────────────────────────────────────────────────


export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}


export async function register(email: string, password: string, username: string) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });
  return res.json();
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return res.json();
}

// ── User streaming services ──────────────────────────────────────


export async function getUserStreaming(user_id: string): Promise<Record<string, boolean>> {
  const res = await fetch(`${BASE_URL}/user/${user_id}/streaming`);
  return res.json();
}


export async function updateUserStreaming(user_id: string, services: Record<string, boolean>) {
  const res = await fetch(`${BASE_URL}/user/${user_id}/streaming`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(services),
  });
  return res.json();
}


// ── Movies ───────────────────────────────────────────────────────


export function getPopularMovies(page = 1): Promise<Movie[]> {
  return fromCache(`popular:${page}`, TTL.CATALOG, async () => {
    const res = await fetch(`${BASE_URL}/movies/popular?page=${page}`);
    const data = await res.json();
    return data.movies ?? [];
  });
}


export function getTrendingMovies(window = 'week'): Promise<Movie[]> {
  return fromCache(`trending:${window}`, TTL.CATALOG, async () => {
    const res = await fetch(`${BASE_URL}/movies/trending?window=${window}`);
    const data = await res.json();
    return data.movies ?? [];
  });
}


export function getTopRatedMovies(page = 1): Promise<Movie[]> {
  return fromCache(`toprated:${page}`, TTL.CATALOG, async () => {
    const res = await fetch(`${BASE_URL}/movies/top_rated?page=${page}`);
    const data = await res.json();
    return data.movies ?? [];
  });
}


export function getUpcomingMovies(page = 1): Promise<Movie[]> {
  return fromCache(`upcoming:${page}`, TTL.CATALOG, async () => {
    try {
      const res = await fetch(`${BASE_URL}/movies/upcoming?page=${page}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.movies ?? [];
    } catch { return []; }
  });
}


export function getNowPlayingMovies(page = 1): Promise<Movie[]> {
  return fromCache(`nowplaying:${page}`, TTL.CATALOG, async () => {
    try {
      const res = await fetch(`${BASE_URL}/movies/now_playing?page=${page}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.movies ?? [];
    } catch { return []; }
  });
}


export function getMovieRecommendations(movie_id: string): Promise<Movie[]> {
  return fromCache(`recommendations:${movie_id}`, TTL.CATALOG, async () => {
    try {
      const res = await fetch(`${BASE_URL}/movies/${movie_id}/recommendations`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.movies ?? [];
    } catch { return []; }
  });
}


export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  const res = await fetch(`${BASE_URL}/movies/search?q=${encodeURIComponent(query)}&page=${page}`);
  const data = await res.json();
  return data.movies ?? [];
}


export function discoverMovies(filters: {
  genre_id?: string;
  year_from?: string;
  year_to?: string;
  min_rating?: number;
  actor?: string;
  director?: string;
  sort_by?: string;
  services_filter?: Record<string, boolean>;
  page?: number;
}): Promise<Movie[]> {
  // Stable cache key regardless of property insertion order
  const key = `discover:${JSON.stringify(Object.fromEntries(Object.entries(filters).sort()))}`;
  return fromCache(key, TTL.CATALOG, async () => {
    const res = await fetch(`${BASE_URL}/movies/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    });
    const data = await res.json();
    return data.movies ?? [];
  });
}


export function getMovieDetails(movie_id: string): Promise<Record<string, unknown>> {
  return fromCache(`movie:${movie_id}`, TTL.MOVIE, async () => {
    const res = await fetch(`${BASE_URL}/movies/${movie_id}`);
    return res.json();
  });
}

// Returns the first flatrate streaming service name for a movie, or '' if none.
// Cached for 6 hours to match the backend provider TTL.
export function getMovieProvider(movie_id: string): Promise<string> {
  return fromCache(`provider:${movie_id}`, 6 * 60 * 60 * 1000, async () => {
    try {
      const res = await fetch(`${BASE_URL}/movies/${movie_id}/providers`);
      const data = await res.json();
      const flatrate: { provider_id: number; provider_name: string }[] = data?.flatrate ?? [];
      const NAMES: Record<number, string> = {
        8: 'Netflix', 15: 'Hulu', 337: 'Disney+', 1899: 'Max',
        9: 'Prime Video', 350: 'Apple TV+', 531: 'Paramount+', 386: 'Peacock',
      };
      for (const p of flatrate) {
        const name = NAMES[p.provider_id];
        if (name) return name;
      }
    } catch { /* ignore */ }
    return '';
  });
}


// Returns the TMDB profile photo URL for an actor/director by name, or null.
export function getPersonPhoto(name: string): Promise<string | null> {
  return fromCache(`person:${name}`, 24 * 60 * 60 * 1000, async () => {
    try {
      const res = await fetch(`${BASE_URL}/person/search?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      return data.profile_path
        ? `https://image.tmdb.org/t/p/w185${data.profile_path}`
        : null;
    } catch { return null; }
  });
}


// ── Watched Movies ───────────────────────────────────────────────


export interface WatchedMovie {
  movie_id: string;
  title: string;
  year: number;
  tmdb_rating: number;
  overview: string;
  poster: string;
  director: string;
  actors: string[];
  genres: string[];
  services: string[];
  user_rating: number;
  comment: string;
  watched_at: string;
}


export async function getWatchedMovies(user_id: string): Promise<WatchedMovie[]> {
  const res = await fetch(`${BASE_URL}/watched/${user_id}`);
  const data = await res.json();
  return data.movies ?? [];
}


export function getWatchedMovie(user_id: string, movie_id: string): Promise<(WatchedMovie & { watched: boolean }) | null> {
  return fromCache(`watched_check:${user_id}:${movie_id}`, 5 * 60 * 1000, async () => {
    const res = await fetch(`${BASE_URL}/watched/${user_id}/${movie_id}`);
    const data = await res.json();
    return data.watched ? data : null;
  });
}


export async function addWatchedMovie(
  user_id: string,
  movie: {
    movie_id: string; title: string; year: number; rating: number;
    overview: string; poster: string; director: string;
    actors: string[]; genres: string[]; services: string[];
  },
  user_rating: number,
  comment: string
) {
  bustCache(`watched_check:${user_id}:${movie.movie_id}`);
  const res = await fetch(`${BASE_URL}/watched/${user_id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie, user_rating, comment }),
  });
  return res.json();
}


export async function updateWatchedMovie(user_id: string, movie_id: string, rating: number, comment: string) {
  bustCache(`watched_check:${user_id}:${movie_id}`);
  const res = await fetch(`${BASE_URL}/watched/${user_id}/${movie_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
  });
  return res.json();
}

export function getWatchLater(user_id: string): Promise<string[]> {
  return fromCache(`watchlist:${user_id}`, 5 * 60 * 1000, async () => {
    const res = await fetch(`${BASE_URL}/watchlist/${user_id}`);
    const data = await res.json();
    return data.movies ?? [];
  });
}

export async function watchMovieLater(user_id: string, movie_id: string) {
  bustCache(`watchlist:${user_id}`);
  const res = await fetch(`${BASE_URL}/watchlist/${user_id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie_id }),
  });
  return res.json();
}

export async function removeFromWatchLater(user_id: string, movie_id: string) {
  bustCache(`watchlist:${user_id}`);
  const res = await fetch(`${BASE_URL}/watchlist/${user_id}/${movie_id}`, {
    method: 'DELETE',
  });
  return res.json();
}


// ── Social Feed ──────────────────────────────────────────────────


export async function getFeed(limit = 20): Promise<FeedPost[]> {
  const res = await fetch(`${BASE_URL}/feed?limit=${limit}`);
  const data = await res.json();
  return data.posts ?? [];
}


export async function createPost(payload: {
  user_id: string;
  username: string;
  message: string;
  movie_title: string;
  movie_id?: string;
  movie_poster?: string;
  rating?: number;
}) {
  const res = await fetch(`${BASE_URL}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}


export async function likePost(post_id: string, user_id: string) {
  const res = await fetch(`${BASE_URL}/feed/${post_id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  });
  return res.json();
}


export async function deletePost(post_id: string, user_id: string) {
  const res = await fetch(`${BASE_URL}/feed/${post_id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  });
  return res.json();
}


export interface PostReply {
  reply_id: string;
  user_id: string;
  username: string;
  avatarUrl?: string;
  message: string;
  created_at: string;
}

export async function getReplies(post_id: string): Promise<PostReply[]> {
  const res = await fetch(`${BASE_URL}/feed/${post_id}/replies`);
  const data = await res.json();
  return data.replies ?? [];
}

export async function addReply(post_id: string, user_id: string, username: string, message: string) {
  const res = await fetch(`${BASE_URL}/feed/${post_id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, username, message }),
  });
  return res.json();
}


// ── User Profile ─────────────────────────────────────────────────

export interface UserProfile {
  user_id?: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  createdAt?: string;
  streamingServices?: Record<string, boolean>;
}

export async function getUserProfile(user_id: string): Promise<UserProfile | null> {
  const res = await fetch(`${BASE_URL}/user/${user_id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateUserAvatar(user_id: string, avatar_url: string) {
  const res = await fetch(`${BASE_URL}/user/${user_id}/avatar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar_url }),
  });
  return res.json();
}

export async function updateLastSeen(user_id: string) {
  // Fire-and-forget heartbeat — no need to await the result
  fetch(`${BASE_URL}/user/${user_id}/lastseen`, { method: 'PUT' }).catch(() => {});
}

export interface UserPublicProfile {
  user_id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  createdAt?: string;
  lastSeen?: string;
  watchedCount: number;
  watchlistCount: number;
  friendsCount: number;
  showMyStuffPublicly: boolean;
  showOnlineStatus: boolean;
}

export async function getUserPublicProfile(user_id: string): Promise<UserPublicProfile | null> {
  const res = await fetch(`${BASE_URL}/user/${user_id}/public`);
  if (!res.ok) return null;
  return res.json();
}

export interface MemberProfile {
  user_id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  lastSeen?: string;
}

export async function getGroupMemberProfiles(group_id: string): Promise<MemberProfile[]> {
  const res = await fetch(`${BASE_URL}/groups/${group_id}/members/profiles`);
  const data = await res.json();
  return data.profiles ?? [];
}

export interface MemberServiceEntry {
  username: string;
  services: Record<string, boolean>;
}

export async function getGroupMemberServices(group_id: string): Promise<Record<string, MemberServiceEntry>> {
  const res = await fetch(`${BASE_URL}/groups/${group_id}/members/services`);
  const data = await res.json();
  return data.services ?? {};
}

export async function saveSocialSettings(user_id: string, settings: { showOnlineStatus: boolean; showMyStuffPublicly: boolean }) {
  const res = await fetch(`${BASE_URL}/user/${user_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ socialSettings: settings }),
  });
  return res.json();
}

export async function updateUserProfile(user_id: string, data: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'username'>>) {
  const res = await fetch(`${BASE_URL}/user/${user_id}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function searchUsers(query: string, excludeUserId?: string): Promise<{ user_id: string; username: string; displayName: string }[]> {
  const params = new URLSearchParams({ q: query });
  if (excludeUserId) params.set('exclude', excludeUserId);
  const res = await fetch(`${BASE_URL}/users/search?${params}`);
  const data = await res.json();
  return data.users ?? [];
}

// ── Friends ──────────────────────────────────────────────────────

export interface Friend {
  friend_id: string;
  friend_username: string;
  avatarUrl?: string;
  since: string;
}

export interface FriendRequest {
  from_user_id: string;
  from_username: string;
  avatarUrl?: string;
  status: string;
  created_at: string;
}

export async function getFriends(user_id: string): Promise<Friend[]> {
  const res = await fetch(`${BASE_URL}/friends/${user_id}`);
  const data = await res.json();
  return data.friends ?? [];
}

export async function getFriendRequests(user_id: string): Promise<FriendRequest[]> {
  const res = await fetch(`${BASE_URL}/friends/${user_id}/requests`);
  const data = await res.json();
  return data.requests ?? [];
}

export async function sendFriendRequest(to_user_id: string, from_user_id: string, from_username: string, from_avatarUrl?: string) {
  const res = await fetch(`${BASE_URL}/friends/${to_user_id}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_user_id, from_username, from_avatarUrl }),
  });
  return res.json();
}

export async function acceptFriendRequest(user_id: string, user_username: string, from_id: string, from_username: string, from_avatarUrl?: string) {
  const res = await fetch(`${BASE_URL}/friends/${user_id}/request/${from_id}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_username, from_username, from_avatarUrl }),
  });
  return res.json();
}

export async function rejectFriendRequest(user_id: string, from_id: string, from_username: string, from_avatarUrl?: string) {
  const res = await fetch(`${BASE_URL}/friends/${user_id}/request/${from_id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_username, from_avatarUrl }),
  });
  return res.json();
}

export async function removeFriend(user_id: string, friend_id: string) {
  const res = await fetch(`${BASE_URL}/friends/${user_id}/${friend_id}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ── Groups ───────────────────────────────────────────────────────

export interface GroupMovie {
  movie_id: string;
  movie_title: string;
  movie_poster?: string;
  added_by: string;
  added_by_username: string;
  added_at: string;
}

export interface MovieGroup {
  group_id: string;
  name: string;
  description: string;
  created_by: string;
  created_by_username: string;
  members: string[];
  member_usernames: Record<string, string>;
  watchlist: GroupMovie[];
  created_at: string;
}

export async function createGroup(name: string, description: string, creator_id: string, creator_username: string) {
  const res = await fetch(`${BASE_URL}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, creator_id, creator_username }),
  });
  return res.json();
}

export async function getGroup(group_id: string): Promise<MovieGroup | null> {
  const res = await fetch(`${BASE_URL}/groups/${group_id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getUserGroups(user_id: string): Promise<MovieGroup[]> {
  const res = await fetch(`${BASE_URL}/user/${user_id}/groups`);
  const data = await res.json();
  return data.groups ?? [];
}

export async function addGroupMember(group_id: string, user_id: string, username: string) {
  const res = await fetch(`${BASE_URL}/groups/${group_id}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, username }),
  });
  return res.json();
}

export async function removeGroupMember(group_id: string, member_id: string) {
  const res = await fetch(`${BASE_URL}/groups/${group_id}/members/${member_id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function addToGroupWatchlist(group_id: string, movie_id: string, movie_title: string, user_id: string, username: string, movie_poster?: string) {
  const res = await fetch(`${BASE_URL}/groups/${group_id}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie_id, movie_title, movie_poster, user_id, username }),
  });
  return res.json();
}

export async function removeFromGroupWatchlist(group_id: string, movie_id: string) {
  const res = await fetch(`${BASE_URL}/groups/${group_id}/watchlist/${movie_id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function spinGroupReelette(group_id: string): Promise<{ success: boolean; movie?: GroupMovie; message?: string }> {
  const res = await fetch(`${BASE_URL}/groups/${group_id}/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function deleteGroup(group_id: string, user_id: string) {
  const res = await fetch(`${BASE_URL}/groups/${group_id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  });
  return res.json();
}


// ── Roulette Spin History ────────────────────────────────────────

export interface RouletteSpin {
  movie_id: string;
  movie_title: string;
  poster_url: string;
  spun_at: string;
}

export async function logRouletteSpin(
  user_id: string,
  avatarUrl: string | undefined,
  movie_id: string,
  movie_title: string,
  poster_url: string
): Promise<void> {
  await fetch(`${BASE_URL}/roulette/${user_id}/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie_id, movie_title, poster_url }),
  });
}

export async function getRouletteHistory(user_id: string, limit = 10): Promise<RouletteSpin[]> {
  const res = await fetch(`${BASE_URL}/roulette/${user_id}/history?limit=${limit}`);
  const data = await res.json();
  return data.spins ?? [];
}

  export async function getfriendsRouletteHistory(user_id: string, limit = 1): Promise<{ friend_id: string; friend_username: string; avatarUrl?: string; spins: RouletteSpin[] }[]> {
    const res = await fetch(`${BASE_URL}/roulette/${user_id}/friends-history?limit=${limit}`);
    const data = await res.json();
    return data.friendsHistory ?? [];
}


// ── Notifications ────────────────────────────────────────────────

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'post_like'
  | 'post_reply'
  | 'friend_watched'
  | 'group_invite';

export interface AppNotification {
  notification_id: string;
  type: NotificationType;
  actor_user_id: string;
  actor_username: string;
  data: {
    movie_title?: string;
    movie_id?: string;
    movie_poster?: string;
    user_rating?: number;
    post_id?: string;
    group_id?: string;
    group_name?: string;
  };
  read: boolean;
  created_at: string;
}

export async function getNotifications(user_id: string): Promise<AppNotification[]> {
  const res = await fetch(`${BASE_URL}/user/${user_id}/notifications`);
  const data = await res.json();
  return data.notifications ?? [];
}

export async function markNotificationRead(user_id: string, notification_id: string) {
  const res = await fetch(`${BASE_URL}/user/${user_id}/notifications/${notification_id}/read`, {
    method: 'PUT',
  });
  return res.json();
}

export async function markAllNotificationsRead(user_id: string) {
  const res = await fetch(`${BASE_URL}/user/${user_id}/notifications/read-all`, {
    method: 'PUT',
  });
  return res.json();
}

// ── Helpers ──────────────────────────────────────────────────────


export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}



