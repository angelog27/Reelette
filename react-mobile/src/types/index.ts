// ── Shared types — mirrors REACT PAGES/src/app/services/api.ts ─────────────

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
  type?: 'movie' | 'show';
  seasons?: number;
  media_type?: 'movie' | 'show';
}

export interface CurrentUser {
  user_id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

export interface UserProfile extends CurrentUser {
  displayName: string;
  bio?: string;
  createdAt?: string;
  streamingServices?: Record<string, boolean>;
}

export interface UserPublicProfile {
  user_id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  profileBannerUrl?: string | null;
  themeId?: string;
  watchedCount: number;
  watchlistCount: number;
  friendsCount: number;
  showMyStuffPublicly: boolean;
  showOnlineStatus: boolean;
  lastSeen?: string;
}

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
  media_type?: 'movie' | 'show';
}

export interface FeedPost {
  post_id: string;
  user_id: string;
  username: string;
  displayName?: string;
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
  is_repost?: boolean;
  repost_of?: string;
  original_user_id?: string;
  original_username?: string;
  original_message?: string;
  original_rating?: number;
  original_created_at?: string;
}

export interface PostReply {
  reply_id: string;
  user_id: string;
  username: string;
  avatarUrl?: string;
  message: string;
  created_at: string;
  likes: number;
  liked_by: string[];
  dislikes: number;
  disliked_by: string[];
}

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

export interface GroupMovie {
  movie_id: string;
  movie_title: string;
  movie_poster?: string;
  added_by: string;
  added_by_username: string;
  added_at: string;
}

export interface GroupMessage {
  message_id: string;
  sender_id: string;
  sender_username: string;
  text: string;
  sent_at: string;
}

export interface Conversation {
  conversation_id: string;
  participants: string[];
  usernames: Record<string, string>;
  last_message: string;
  last_sender_id: string;
  updated_at: string;
  unread: Record<string, number>;
}

export interface DirectMessage {
  message_id: string;
  sender_id: string;
  text: string;
  sent_at: string;
}

export interface RouletteSpin {
  movie_id: string;
  movie_title: string;
  poster_url: string;
  spun_at: string;
}

export interface MovieRanking {
  ranking_id: string;
  user_id: string;
  username: string;
  title: string;
  description: string;
  movies: RankingMovie[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface RankingMovie {
  movie_id: string;
  movie_title: string;
  movie_poster: string;
  rank: number;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'post_like'
  | 'post_reply'
  | 'friend_watched'
  | 'group_invite'
  | 'group_message';

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
    message_preview?: string;
  };
  read: boolean;
  created_at: string;
}

export interface NotifPrefs {
  inApp: {
    friendActivity: boolean;
    groupChat: boolean;
    newPost: boolean;
    newMovieAlerts: boolean;
  };
  email: {
    friendActivity: boolean;
    groupChat: boolean;
    newPost: boolean;
    newMovieAlerts: boolean;
  };
}

export interface AIRecommendationRow {
  label: string;
  movies: Movie[];
}

export interface DiscoverFilters {
  genre_id?: string;
  sort_by?: string;
  min_rating?: number;
  year_from?: string;
  year_to?: string;
  services_filter?: Record<string, boolean>;
  with_companies?: string;
  with_keywords?: string;
}
