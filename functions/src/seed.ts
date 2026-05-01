import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { SERVICES, ServiceDef, CategoryDef } from './config';
import { discoverPage, tmdbMovieToDoc, TmdbMovie } from './tmdbClient';

const PAGES_PER_CATEGORY  = 5;
const PAGE_SIZE            = 20;
const DELAY_MS             = 300;
const MIN_REFRESH_DAYS     = 14;
const BATCH_MAX            = 490;

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function sixMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().split('T')[0];
}

async function lookupExportId(
  db: admin.firestore.Firestore,
  kind: 'collection' | 'company',
  name: string,
): Promise<number | null> {
  const col = kind === 'collection' ? 'tmdb_export_collections' : 'tmdb_export_companies';
  const snap = await db.collection(col).where('name', '==', name).limit(1).get();
  if (snap.empty) {
    logger.warn(`Export lookup: ${kind} "${name}" not found — run npm run import-exports first`);
    return null;
  }
  return snap.docs[0].data().id as number;
}

async function seedCategory(
  db: admin.firestore.Firestore,
  apiKey: string,
  service: ServiceDef,
  category: CategoryDef,
  exportIds: Map<string, number>,
): Promise<void> {
  const categoryRef = db
    .collection('services').doc(service.id)
    .collection('categories').doc(category.id);

  // ── Write-protection check ────────────────────────────────────────
  const catSnap = await categoryRef.get();
  if (catSnap.exists) {
    const ts = catSnap.data()?.last_refreshed as admin.firestore.Timestamp | undefined;
    if (ts) {
      const daysSince = (Date.now() - ts.toMillis()) / 86_400_000;
      if (daysSince < MIN_REFRESH_DAYS) {
        logger.info(`Skipping ${service.id}/${category.id} — refreshed ${daysSince.toFixed(1)} days ago`);
        return;
      }
    }
  }

  // ── Build TMDB params ─────────────────────────────────────────────
  const params: Record<string, string | number> = {
    watch_region:         'US',
    with_watch_providers: service.providerId,
    'vote_count.gte':     50,
    sort_by:              'popularity.desc',
    language:             'en-US',
  };

  if (category.isNew) {
    params.sort_by = 'primary_release_date.desc';
    params['primary_release_date.gte'] = sixMonthsAgo();
  }

  if (category.extraParams) {
    Object.assign(params, category.extraParams);
  }

  if (category.exportLookup) {
    const lookupKey = `${category.exportLookup.kind}:${category.exportLookup.name}`;
    const id = exportIds.get(lookupKey);
    if (id == null) {
      logger.error(`${service.id}/${category.id}: no export ID for "${category.exportLookup.name}" — skipping`);
      return;
    }
    const paramKey = category.exportLookup.kind === 'collection' ? 'with_collection' : 'with_companies';
    params[paramKey] = id;
  }

  // ── Fetch from TMDB ───────────────────────────────────────────────
  const allMovies: TmdbMovie[] = [];
  for (let page = 1; page <= PAGES_PER_CATEGORY; page++) {
    try {
      const results = await discoverPage(apiKey, { ...params, page });
      allMovies.push(...results);
      logger.info(`  ${service.id}/${category.id} p${page}: ${results.length} results`);
      if (results.length < PAGE_SIZE) break;
      if (page < PAGES_PER_CATEGORY) await delay(DELAY_MS);
    } catch (err) {
      logger.error(`  ${service.id}/${category.id} p${page} error:`, err);
      break;
    }
  }

  if (!allMovies.length) {
    logger.warn(`${service.id}/${category.id}: 0 movies returned — skipping write`);
    return;
  }

  // ── Batch write movies to Firestore ───────────────────────────────
  const moviesRef = categoryRef.collection('movies');
  let batch = db.batch();
  let ops = 0;
  let totalWritten = 0;

  for (const movie of allMovies) {
    batch.set(moviesRef.doc(String(movie.id)), tmdbMovieToDoc(movie));
    ops++;
    totalWritten++;
    if (ops >= BATCH_MAX) {
      await batch.commit();
      logger.info(`  Committed batch of ${ops} docs for ${service.id}/${category.id}`);
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
    logger.info(`  Final batch: ${ops} docs for ${service.id}/${category.id}`);
  }

  // ── Update category metadata ──────────────────────────────────────
  await categoryRef.set({
    name:          category.name,
    last_refreshed: admin.firestore.FieldValue.serverTimestamp(),
    total_movies:  totalWritten,
  }, { merge: true });

  logger.info(`✓ ${service.id}/${category.id}: ${totalWritten} movies written`);
}

export async function runSeed(apiKey: string): Promise<void> {
  const db = admin.firestore();

  // ── Pre-load all export IDs needed across all services ───────────
  const neededLookups = new Set<string>();
  for (const svc of SERVICES) {
    for (const cat of svc.categories) {
      if (cat.exportLookup) {
        neededLookups.add(`${cat.exportLookup.kind}:${cat.exportLookup.name}`);
      }
    }
  }

  const exportIds = new Map<string, number>();
  for (const lookupKey of neededLookups) {
    const colonIdx = lookupKey.indexOf(':');
    const kind = lookupKey.slice(0, colonIdx) as 'collection' | 'company';
    const name = lookupKey.slice(colonIdx + 1);
    const id = await lookupExportId(db, kind, name);
    if (id != null) exportIds.set(lookupKey, id);
  }
  logger.info(`Loaded ${exportIds.size}/${neededLookups.size} export IDs`);

  // ── Seed each service ─────────────────────────────────────────────
  for (const service of SERVICES) {
    logger.info(`\n=== ${service.name} (provider ${service.providerId}) ===`);

    for (const category of service.categories) {
      try {
        await seedCategory(db, apiKey, service, category, exportIds);
        await delay(DELAY_MS);
      } catch (err) {
        logger.error(`Failed ${service.id}/${category.id}:`, err);
      }
    }

    // Update service-level metadata after all categories
    await db.collection('services').doc(service.id).set({
      name:          service.name,
      provider_id:   service.providerId,
      last_refreshed: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  logger.info('\n=== Seed complete ===');
}
