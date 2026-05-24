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

// HTTP trigger — call manually to seed on demand (requires Firebase ID token from a project admin)
// Usage: curl -X POST -H "Authorization: Bearer <id_token>" \
//          https://<region>-reelette-project.cloudfunctions.net/seedNow
export const seedNow = onRequest(
  { timeoutSeconds: 540, memory: '512MiB' },
  async (req, res) => {
    // Verify that the caller is an authenticated Firebase user
    const authHeader = req.headers.authorization ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

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
