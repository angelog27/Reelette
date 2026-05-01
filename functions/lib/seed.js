"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = runSeed;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const config_1 = require("./config");
const tmdbClient_1 = require("./tmdbClient");
const PAGES_PER_CATEGORY = 5;
const PAGE_SIZE = 20;
const DELAY_MS = 300;
const MIN_REFRESH_DAYS = 14;
const BATCH_MAX = 490;
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}
function sixMonthsAgo() {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
}
async function lookupExportId(db, kind, name) {
    const col = kind === 'collection' ? 'tmdb_export_collections' : 'tmdb_export_companies';
    const snap = await db.collection(col).where('name', '==', name).limit(1).get();
    if (snap.empty) {
        logger.warn(`Export lookup: ${kind} "${name}" not found — run npm run import-exports first`);
        return null;
    }
    return snap.docs[0].data().id;
}
async function seedCategory(db, apiKey, service, category, exportIds) {
    const categoryRef = db
        .collection('services').doc(service.id)
        .collection('categories').doc(category.id);
    // ── Write-protection check ────────────────────────────────────────
    const catSnap = await categoryRef.get();
    if (catSnap.exists) {
        const ts = catSnap.data()?.last_refreshed;
        if (ts) {
            const daysSince = (Date.now() - ts.toMillis()) / 86400000;
            if (daysSince < MIN_REFRESH_DAYS) {
                logger.info(`Skipping ${service.id}/${category.id} — refreshed ${daysSince.toFixed(1)} days ago`);
                return;
            }
        }
    }
    // ── Build TMDB params ─────────────────────────────────────────────
    const params = {
        watch_region: 'US',
        with_watch_providers: service.providerId,
        'vote_count.gte': 50,
        sort_by: 'popularity.desc',
        language: 'en-US',
    };
    if (category.isNew) {
        params.sort_by = 'primary_release_date.desc';
        params['primary_release_date.gte'] = sixMonthsAgo();
    }
    if (category.extraParams) {
        Object.assign(params, category.extraParams);
    }
    // ── Fetch from TMDB ───────────────────────────────────────────────
    const allMovies = [];
    if (category.exportLookup?.kind === 'collection') {
        // Collections are fetched via /collection/{id} — discover doesn't support collection filtering
        const lookupKey = `collection:${category.exportLookup.name}`;
        const id = exportIds.get(lookupKey);
        if (id == null) {
            logger.error(`${service.id}/${category.id}: no export ID for "${category.exportLookup.name}" — skipping`);
            return;
        }
        try {
            const parts = await (0, tmdbClient_1.fetchCollection)(apiKey, id);
            allMovies.push(...parts);
            logger.info(`  ${service.id}/${category.id}: ${parts.length} collection parts`);
        }
        catch (err) {
            logger.error(`  ${service.id}/${category.id} collection fetch error:`, err);
        }
    }
    else {
        if (category.exportLookup?.kind === 'company') {
            const lookupKey = `company:${category.exportLookup.name}`;
            const id = exportIds.get(lookupKey);
            if (id == null) {
                logger.error(`${service.id}/${category.id}: no export ID for "${category.exportLookup.name}" — skipping`);
                return;
            }
            params['with_companies'] = id;
        }
        for (let page = 1; page <= PAGES_PER_CATEGORY; page++) {
            try {
                const results = await (0, tmdbClient_1.discoverPage)(apiKey, { ...params, page });
                allMovies.push(...results);
                logger.info(`  ${service.id}/${category.id} p${page}: ${results.length} results`);
                if (results.length < PAGE_SIZE)
                    break;
                if (page < PAGES_PER_CATEGORY)
                    await delay(DELAY_MS);
            }
            catch (err) {
                logger.error(`  ${service.id}/${category.id} p${page} error:`, err);
                break;
            }
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
        batch.set(moviesRef.doc(String(movie.id)), (0, tmdbClient_1.tmdbMovieToDoc)(movie));
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
        name: category.name,
        last_refreshed: admin.firestore.FieldValue.serverTimestamp(),
        total_movies: totalWritten,
    }, { merge: true });
    logger.info(`✓ ${service.id}/${category.id}: ${totalWritten} movies written`);
}
async function runSeed(apiKey) {
    const db = admin.firestore();
    // ── Pre-load all export IDs needed across all services ───────────
    const neededLookups = new Set();
    for (const svc of config_1.SERVICES) {
        for (const cat of svc.categories) {
            if (cat.exportLookup) {
                neededLookups.add(`${cat.exportLookup.kind}:${cat.exportLookup.name}`);
            }
        }
    }
    const exportIds = new Map();
    for (const lookupKey of neededLookups) {
        const colonIdx = lookupKey.indexOf(':');
        const kind = lookupKey.slice(0, colonIdx);
        const name = lookupKey.slice(colonIdx + 1);
        const id = await lookupExportId(db, kind, name);
        if (id != null)
            exportIds.set(lookupKey, id);
    }
    logger.info(`Loaded ${exportIds.size}/${neededLookups.size} export IDs`);
    // ── Seed each service ─────────────────────────────────────────────
    for (const service of config_1.SERVICES) {
        logger.info(`\n=== ${service.name} (provider ${service.providerId}) ===`);
        for (const category of service.categories) {
            try {
                await seedCategory(db, apiKey, service, category, exportIds);
                await delay(DELAY_MS);
            }
            catch (err) {
                logger.error(`Failed ${service.id}/${category.id}:`, err);
            }
        }
        // Update service-level metadata after all categories
        await db.collection('services').doc(service.id).set({
            name: service.name,
            provider_id: service.providerId,
            last_refreshed: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    logger.info('\n=== Seed complete ===');
}
//# sourceMappingURL=seed.js.map