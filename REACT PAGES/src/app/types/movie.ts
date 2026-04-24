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

export interface SocialPost {
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
