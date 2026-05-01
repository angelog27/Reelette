/**
 * Local seed runner — builds TypeScript then executes the seed.
 * Reads TMDB_API_KEY from root config.py or TMDB_API_KEY env var.
 *
 * Run from the functions/ directory:
 *   npm run seed-now
 *
 * Or set TMDB_API_KEY first:
 *   TMDB_API_KEY=your_key node scripts/runSeed.js
 */

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ── Resolve TMDB API key ──────────────────────────────────────────

let apiKey = process.env.TMDB_API_KEY;

if (!apiKey) {
  // Fall back: parse it out of config.py
  const configPath = path.resolve(__dirname, '../../config.py');
  if (fs.existsSync(configPath)) {
    const src = fs.readFileSync(configPath, 'utf8');
    const m = src.match(/TMDB_API_KEY\s*=\s*["']([^"']+)["']/);
    if (m) apiKey = m[1];
  }
}

if (!apiKey) {
  console.error(
    'ERROR: TMDB_API_KEY not found.\n' +
    'Set it via env var or ensure config.py has TMDB_API_KEY = "..."',
  );
  process.exit(1);
}

// ── Init Firebase admin ───────────────────────────────────────────

const serviceAccount = require('../../firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// ── Run seed (uses compiled JS from lib/) ─────────────────────────

const { runSeed } = require('../lib/seed');

console.log('Starting manual catalog seed…');
runSeed(apiKey)
  .then(() => { console.log('Seed complete.'); process.exit(0); })
  .catch(err => { console.error('Seed failed:', err); process.exit(1); });
