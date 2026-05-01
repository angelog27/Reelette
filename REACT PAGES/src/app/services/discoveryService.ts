import { db } from '../lib/firebase';
import {
  collection, query, limit, orderBy, startAfter,
  getDocs, type QueryDocumentSnapshot, type DocumentData,
} from 'firebase/firestore';
import type { Movie } from './api';

const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const PAGE_SIZE    = 20;
const MAX_PAGES    = 5;

// ── TMDB genre ID → display name ──────────────────────────────────

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

// ── localStorage helpers ──────────────────────────────────────────

function lsKey(svcId: string, catId: string)   { return `reelette_${svcId}_${catId}`; }
function lsTsKey(svcId: string, catId: string) { return `reelette_${svcId}_${catId}_timestamp`; }

function lsRead(svcId: string, catId: string): Movie[] | null {
  try {
    const ts = localStorage.getItem(lsTsKey(svcId, catId));
    if (!ts || Date.now() - parseInt(ts, 10) > CACHE_TTL_MS) return null;
    const raw = localStorage.getItem(lsKey(svcId, catId));
    return raw ? (JSON.parse(raw) as Movie[]) : null;
  } catch { return null; }
}

function lsWrite(svcId: string, catId: string, movies: Movie[]) {
  try {
    localStorage.setItem(lsKey(svcId, catId), JSON.stringify(movies));
    localStorage.setItem(lsTsKey(svcId, catId), Date.now().toString());
  } catch {}
}

// ── Firestore doc → Movie ─────────────────────────────────────────

function docToMovie(doc: QueryDocumentSnapshot<DocumentData>): Movie {
  const d = doc.data();
  const genreIds: number[] = d.genre_ids ?? [];
  return {
    id:             d.tmdb_id ?? doc.id,
    title:          d.title ?? '',
    year:           d.year ?? 0,
    genres:         genreIds.map(id => GENRE_MAP[id]).filter(Boolean),
    rating:         d.rating ?? 0,
    poster:         d.poster_url ?? '',
    backdrop:       d.backdrop_url ?? '',
    overview:       d.overview ?? '',
    streamingService: '',
  };
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Returns up to MAX_PAGES × PAGE_SIZE movies for a service category.
 *
 * Layer 1 — localStorage (14-day TTL):  served instantly on cache hit.
 * Layer 2/3 — Firestore:  only read when localStorage is empty/expired.
 *   Paginated 20 at a time; each page is also written to localStorage
 *   so subsequent partial loads are fast.
 */
export async function getServiceCategoryMovies(
  serviceId: string,
  categoryId: string,
): Promise<Movie[]> {
  // Layer 1: localStorage
  const cached = lsRead(serviceId, categoryId);
  if (cached) return cached;

  // Layer 2+3: Firestore (only if cache miss)
  const moviesRef  = collection(db, 'services', serviceId, 'categories', categoryId, 'movies');
  const allMovies: Movie[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const q = cursor
      ? query(moviesRef, orderBy('popularity', 'desc'), limit(PAGE_SIZE), startAfter(cursor))
      : query(moviesRef, orderBy('popularity', 'desc'), limit(PAGE_SIZE));

    const snap = await getDocs(q);
    if (snap.empty) break;

    const pageMovies = snap.docs.map(docToMovie);
    allMovies.push(...pageMovies);

    // Cache each page as it loads (layer 2 spec)
    lsWrite(serviceId, `${categoryId}_p${page}`, pageMovies);

    cursor = snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot<DocumentData>;
    if (pageMovies.length < PAGE_SIZE) break;
  }

  // Layer 1: write the full result
  if (allMovies.length > 0) lsWrite(serviceId, categoryId, allMovies);

  return allMovies;
}
