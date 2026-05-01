/**
 * Seeds max/dc/movies by searching TMDB for DC titles directly.
 * Run: node scripts/seedDC.js
 */

const admin = require('firebase-admin');
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');

// ── Init ──────────────────────────────────────────────────────────

const serviceAccount = require('../../firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Resolve TMDB key from config.py
let API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  const src = fs.readFileSync(path.resolve(__dirname, '../../config.py'), 'utf8');
  const m = src.match(/TMDB_API_KEY\s*=\s*["']([^"']+)["']/);
  if (m) API_KEY = m[1];
}
if (!API_KEY) { console.error('TMDB_API_KEY not found'); process.exit(1); }

const TMDB   = 'https://api.themoviedb.org/3';
const DELAY  = 250;
const MIN_VOTES = 50;

const SEARCH_TERMS = [
  'Batman', 'Superman', 'Wonder Woman', 'Aquaman',
  'The Flash', 'Joker', 'Shazam', 'Justice League',
  'Suicide Squad', 'Black Adam', 'Green Lantern',
  'Birds of Prey', 'Blue Beetle', 'Harley Quinn',
  'Watchmen', 'V for Vendetta', 'Constantine',
  'Man of Steel', 'Zack Snyder',
];

// ── Helpers ───────────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function search(term) {
  const res = await axios.get(`${TMDB}/search/movie`, {
    params: { api_key: API_KEY, query: term, language: 'en-US', page: 1 },
    timeout: 10_000,
  });
  return (res.data.results ?? []).filter(m => m.vote_count >= MIN_VOTES);
}

function toDoc(m) {
  const year = m.release_date ? parseInt(m.release_date.split('-')[0], 10) : 0;
  return {
    tmdb_id:      String(m.id),
    title:        m.title ?? '',
    year,
    poster_url:   m.poster_path   ? `https://image.tmdb.org/t/p/w500${m.poster_path}`   : '',
    backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : '',
    rating:       m.vote_average ?? 0,
    vote_count:   m.vote_count ?? 0,
    overview:     m.overview ?? '',
    genre_ids:    m.genre_ids ?? [],
    popularity:   m.popularity ?? 0,
    collection_id: m.belongs_to_collection?.id ?? null,
  };
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const seen   = new Map(); // tmdb_id → doc
  let   total  = 0;

  for (const term of SEARCH_TERMS) {
    try {
      const results = await search(term);
      for (const m of results) {
        if (!seen.has(m.id)) {
          seen.set(m.id, toDoc(m));
          total++;
        }
      }
      console.log(`"${term}" → ${results.length} results  (unique so far: ${total})`);
    } catch (err) {
      console.error(`"${term}" search failed:`, err.message);
    }
    await delay(DELAY);
  }

  console.log(`\nWriting ${seen.size} unique movies to max/dc/movies…`);

  const moviesRef = db.collection('services').doc('max')
                      .collection('categories').doc('dc')
                      .collection('movies');

  const entries = [...seen.values()];
  let   batch   = db.batch();
  let   ops     = 0;

  for (const doc of entries) {
    batch.set(moviesRef.doc(doc.tmdb_id), doc);
    ops++;
    if (ops >= 490) {
      await batch.commit();
      console.log(`  Committed batch of ${ops}`);
      batch = db.batch();
      ops   = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
    console.log(`  Final batch: ${ops}`);
  }

  // Update category metadata
  await db.collection('services').doc('max')
          .collection('categories').doc('dc')
          .set({
            name:          'DC Universe',
            last_refreshed: admin.firestore.FieldValue.serverTimestamp(),
            total_movies:  seen.size,
          }, { merge: true });

  console.log(`\n✓ max/dc: ${seen.size} movies written`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
