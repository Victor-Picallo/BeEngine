import { requirePrisma } from '../../lib/prisma.js';

const SERIES_IDS = ['f1', 'f2', 'f3', 'motogp', 'moto2', 'moto3'];

/** Último sync exitoso por serie (finishedAt ISO). */
export async function getLastSuccessfulSyncBySeries() {
  const prisma = requirePrisma();
  const out = {};
  for (const seriesId of SERIES_IDS) {
    const row = await prisma.syncRun.findFirst({
      where: { seriesId, status: 'success' },
      orderBy: { finishedAt: 'desc' },
    });
    out[seriesId] = row?.finishedAt?.toISOString() ?? null;
  }
  return out;
}

/** Último sync (cualquier estado) por serie. */
export async function getLastSyncBySeries() {
  const prisma = requirePrisma();
  const out = {};
  for (const seriesId of SERIES_IDS) {
    const row = await prisma.syncRun.findFirst({
      where: { seriesId },
      orderBy: { startedAt: 'desc' },
    });
    if (!row) {
      out[seriesId] = null;
      continue;
    }
    out[seriesId] = {
      status: row.status,
      source: row.source,
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
      error: row.error ?? null,
    };
  }
  return out;
}
