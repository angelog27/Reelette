import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { runSeed } from './seed';

admin.initializeApp();

const tmdbApiKey = defineString('TMDB_API_KEY');

// Runs on the 1st and 15th of every month at midnight UTC
export const scheduledSeed = onSchedule(
  {
    schedule:       '0 0 1,15 * *',
    timeZone:       'UTC',
    timeoutSeconds: 540,
    memory:         '512MiB',
  },
  async () => {
    logger.info('Scheduled catalog seed starting…');
    await runSeed(tmdbApiKey.value());
    logger.info('Scheduled catalog seed complete');
  },
);

// HTTP trigger — call manually to seed on demand
// Usage: firebase functions:shell → seedNow({})
// Or:    curl -X POST https://<region>-reelette-project.cloudfunctions.net/seedNow
export const seedNow = onRequest(
  { timeoutSeconds: 540, memory: '512MiB' },
  async (_req, res) => {
    logger.info('Manual seed trigger received');
    try {
      await runSeed(tmdbApiKey.value());
      res.json({ success: true, message: 'Seed completed successfully' });
    } catch (err) {
      logger.error('Seed failed:', err);
      res.status(500).json({ success: false, error: String(err) });
    }
  },
);
