import axios from 'axios';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  popularity: number;
  belongs_to_collection?: { id: number; name: string } | null;
}

export function tmdbMovieToDoc(m: TmdbMovie): Record<string, unknown> {
  const year = m.release_date ? parseInt(m.release_date.split('-')[0], 10) : 0;
  return {
    tmdb_id:      String(m.id),
    title:        m.title ?? '',
    year,
    poster_url:   m.poster_path   ? `https://image.tmdb.org/t/p/w500${m.poster_path}`   : '',
    backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : '',
    rating:       m.vote_average,
    vote_count:   m.vote_count,
    overview:     m.overview ?? '',
    genre_ids:    m.genre_ids ?? [],
    popularity:   m.popularity,
    collection_id: m.belongs_to_collection?.id ?? null,
  };
}

export async function discoverPage(
  apiKey: string,
  params: Record<string, string | number>,
): Promise<TmdbMovie[]> {
  const res = await axios.get<{ results: TmdbMovie[] }>(`${TMDB_BASE}/discover/movie`, {
    params: { api_key: apiKey, ...params },
    timeout: 15_000,
  });
  return res.data.results ?? [];
}

export async function fetchCollection(
  apiKey: string,
  collectionId: number,
): Promise<TmdbMovie[]> {
  const res = await axios.get<{ parts: TmdbMovie[] }>(`${TMDB_BASE}/collection/${collectionId}`, {
    params: { api_key: apiKey, language: 'en-US' },
    timeout: 15_000,
  });
  return (res.data.parts ?? []).filter(m => m.release_date);
}
