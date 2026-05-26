import { success } from '../utils/response.js';
import { NODE_ENV, DB_ENABLED } from '../config/env.js';
import { storageConfigured } from '../lib/supabaseStorage.js';
import { prisma } from '../lib/prisma.js';
import {
  getLastSuccessfulSyncBySeries,
  getLastSyncBySeries,
} from '../repositories/db/syncRun.repository.js';

async function checkDb() {
  if (!DB_ENABLED || !prisma) return { ok: false, error: 'DATABASE_URL not set' };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export const getHealth = async (_req, res) => {
  const db = await checkDb();
  let lastSync = null;
  let lastSyncDetail = null;

  if (db.ok) {
    try {
      [lastSync, lastSyncDetail] = await Promise.all([
        getLastSuccessfulSyncBySeries(),
        getLastSyncBySeries(),
      ]);
    } catch {
      /* sync_runs opcional si falla lectura */
    }
  }

  success(res, {
    status: 'ok',
    uptime: process.uptime(),
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    db,
    storage: { configured: storageConfigured() },
    lastSync,
    lastSyncRuns: lastSyncDetail,
  });
};
