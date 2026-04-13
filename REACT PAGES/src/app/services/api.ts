const BASE_URL = 'http://127.0.0.1:5000/api';


// ── Types ────────────────────────────────────────────────────────


export interface Movie {
  id: string;
  title: string;
  year: number;
  genres: string[];
  rating: number;
  poster: string;
  streamingService: string;
}


export interface FeedPost {
  post_id: string;
  user_id: string;
  username: string;
  message: string;
  movie_title: string;
  movie_id: string;
  rating: number;
  likes: number;
  liked_by: string[];
  created_at: string;
}


export interface CurrentUser {
  user_id: string;
  username: string;
  email: string;
}


export interface Notification {
  notification_id: string;
  user_id: string;
  type: 'like' | 'reply' | 'message';
  from_username: string;
  post_id: string;
  movie_title: string;
  message: string;
  conversation_id: string;
  conv_name: string;
  read: boolean;
  created_at: string;
}


export interface Conversation {
  conversation_id: string;
  type: 'dm' | 'group';
  name: string;
  members: string[];
  member_names: Record<string, string>;
  last_message: string;
  last_message_at: string | null;
  created_at: string;
  created_by: string;
}


export interface Message {
  message_id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: string;
}


export interface SearchUser {
  user_id: string;
  username: string;
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


export async function getPopularMovies(page = 1): Promise<Movie[]> {
  const res = await fetch(`${BASE_URL}/movies/popular?page=${page}`);
  const data = await res.json();
  return data.movies ?? [];
}


export async function getTrendingMovies(window = 'week'): Promise<Movie[]> {
  const res = await fetch(`${BASE_URL}/movies/trending?window=${window}`);
  const data = await res.json();
  return data.movies ?? [];
}


export async function getTopRatedMovies(page = 1): Promise<Movie[]> {
  const res = await fetch(`${BASE_URL}/movies/top_rated?page=${page}`);
  const data = await res.json();
  return data.movies ?? [];
}


export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  const res = await fetch(`${BASE_URL}/movies/search?q=${encodeURIComponent(query)}&page=${page}`);
  const data = await res.json();
  return data.movies ?? [];
}


export async function discoverMovies(filters: {
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
  const res = await fetch(`${BASE_URL}/movies/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
  const data = await res.json();
  return data.movies ?? [];
}


export async function getMovieDetails(movie_id: string) {
  const res = await fetch(`${BASE_URL}/movies/${movie_id}`);
  return res.json();
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


export async function getWatchedMovie(user_id: string, movie_id: string): Promise<(WatchedMovie & { watched: boolean }) | null> {
  const res = await fetch(`${BASE_URL}/watched/${user_id}/${movie_id}`);
  const data = await res.json();
  return data.watched ? data : null;
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
  const res = await fetch(`${BASE_URL}/watched/${user_id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie, user_rating, comment }),
  });
  return res.json();
}


export async function updateWatchedMovie(user_id: string, movie_id: string, rating: number, comment: string) {
  const res = await fetch(`${BASE_URL}/watched/${user_id}/${movie_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
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
  rating?: number;
}) {
  const res = await fetch(`${BASE_URL}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}


export async function likePost(post_id: string, user_id: string, username: string) {
  const res = await fetch(`${BASE_URL}/feed/${post_id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, username }),
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


// ── Notifications ────────────────────────────────────────────────


export async function getNotifications(user_id: string): Promise<Notification[]> {
  const res = await fetch(`${BASE_URL}/notifications/${user_id}`);
  const data = await res.json();
  return data.notifications ?? [];
}


export async function markAllNotificationsRead(user_id: string) {
  const res = await fetch(`${BASE_URL}/notifications/${user_id}/read-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}


// ── Messaging ────────────────────────────────────────────────────


export async function searchUsers(query: string, excludeUserId?: string): Promise<SearchUser[]> {
  const params = new URLSearchParams({ q: query });
  if (excludeUserId) params.set('exclude', excludeUserId);
  const res = await fetch(`${BASE_URL}/users/search?${params}`);
  const data = await res.json();
  return data.users ?? [];
}


export async function createDM(
  myId: string, myUsername: string,
  otherId: string, otherUsername: string,
) {
  const res = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'dm',
      creator_id: myId,
      creator_name: myUsername,
      members: [{ user_id: otherId, username: otherUsername }],
    }),
  });
  return res.json();
}


export async function createGroupChat(
  myId: string, myUsername: string,
  members: SearchUser[],
  name: string,
) {
  const res = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'group', creator_id: myId, creator_name: myUsername, members, name }),
  });
  return res.json();
}


export async function getConversations(user_id: string): Promise<Conversation[]> {
  const res = await fetch(`${BASE_URL}/conversations/${user_id}`);
  const data = await res.json();
  return data.conversations ?? [];
}


export async function getMessages(conversation_id: string): Promise<Message[]> {
  const res = await fetch(`${BASE_URL}/conversations/${conversation_id}/messages`);
  const data = await res.json();
  return data.messages ?? [];
}


export async function sendMessage(conversation_id: string, user_id: string, username: string, text: string) {
  const res = await fetch(`${BASE_URL}/conversations/${conversation_id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, username, text }),
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



