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
exports.seedNow = exports.scheduledSeed = void 0;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const seed_1 = require("./seed");
admin.initializeApp();
const tmdbApiKey = (0, params_1.defineString)('TMDB_API_KEY');
// Runs on the 1st and 15th of every month at midnight UTC
exports.scheduledSeed = (0, scheduler_1.onSchedule)({
    schedule: '0 0 1,15 * *',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
}, async () => {
    logger.info('Scheduled catalog seed starting…');
    await (0, seed_1.runSeed)(tmdbApiKey.value());
    logger.info('Scheduled catalog seed complete');
});
// HTTP trigger — call manually to seed on demand
// Usage: firebase functions:shell → seedNow({})
// Or:    curl -X POST https://<region>-reelette-project.cloudfunctions.net/seedNow
exports.seedNow = (0, https_1.onRequest)({ timeoutSeconds: 540, memory: '512MiB' }, async (_req, res) => {
    logger.info('Manual seed trigger received');
    try {
        await (0, seed_1.runSeed)(tmdbApiKey.value());
        res.json({ success: true, message: 'Seed completed successfully' });
    }
    catch (err) {
        logger.error('Seed failed:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
//# sourceMappingURL=index.js.map