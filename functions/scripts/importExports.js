/**
 * One-time script: reads TMDB daily export files, finds the target
 * collections and companies, and writes them to Firestore.
 *
 * Run from the functions/ directory:
 *   npm run import-exports
 */

const admin    = require('firebase-admin');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const serviceAccount = require('../../firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Target names ──────────────────────────────────────────────────

const TARGET_COLLECTIONS = new Set([
  'Star Wars Collection',
  'Marvel Cinematic Universe',
  'Pixar Collection',
  'DC Extended Universe',
  'James Bond Collection',
  'The Fast and the Furious Collection',
  'Mission: Impossible Collection',
  'The Conjuring Collection',
]);

const TARGET_COMPANIES = new Set([
  'Marvel Studios',
  'Lucasfilm',
  'Pixar',
  'Walt Disney Pictures',
  'DC Studios',
  'Blumhouse Productions',
  'A24',
  'Netflix Productions',
  'Apple Studios',
]);

// ── Helpers ───────────────────────────────────────────────────────

async function scanFile(filePath, targetSet, firestoreCollection) {
  console.log(`\nScanning: ${path.basename(filePath)}`);
  const found = [];

  const rl = readline.createInterface({
    input:     fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (targetSet.has(obj.name)) {
        found.push({ id: obj.id, name: obj.name });
        console.log(`  ✓ Found: "${obj.name}"  →  id=${obj.id}`);
      }
    } catch {
      // malformed line — skip
    }
  }

  if (!found.length) {
    console.log('  No matches found.');
    return found;
  }

  const batch = db.batch();
  for (const item of found) {
    batch.set(
      db.collection(firestoreCollection).doc(String(item.id)),
      { id: item.id, name: item.name },
    );
  }
  await batch.commit();
  console.log(`  Wrote ${found.length} doc(s) to Firestore/${firestoreCollection}`);
  return found;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const reactPagesDir = path.resolve(__dirname, '../../REACT PAGES');

  const allFiles      = fs.readdirSync(reactPagesDir);
  const collectionsFile = allFiles.find(f => f.startsWith('collection_ids'));
  const companiesFile   = allFiles.find(f => f.startsWith('production_company_ids'));

  if (!collectionsFile) {
    console.error('ERROR: collection_ids_*.json not found in REACT PAGES/');
    process.exit(1);
  }
  if (!companiesFile) {
    console.error('ERROR: production_company_ids_*.json not found in REACT PAGES/');
    process.exit(1);
  }

  const collections = await scanFile(
    path.join(reactPagesDir, collectionsFile),
    TARGET_COLLECTIONS,
    'tmdb_export_collections',
  );

  const companies = await scanFile(
    path.join(reactPagesDir, companiesFile),
    TARGET_COMPANIES,
    'tmdb_export_companies',
  );

  console.log('\n=== Import complete ===');
  console.log('Collections:', collections.map(c => `${c.name}=${c.id}`).join(', ') || 'none');
  console.log('Companies:',   companies.map(c => `${c.name}=${c.id}`).join(', ') || 'none');

  const missing = [
    ...[...TARGET_COLLECTIONS].filter(n => !collections.find(c => c.name === n)),
    ...[...TARGET_COMPANIES  ].filter(n => !companies  .find(c => c.name === n)),
  ];
  if (missing.length) {
    console.warn('\nWARNING — not found in export files:', missing.join(', '));
    console.warn('These categories will be skipped during seeding.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
