import { getDrivers } from './openf1.service.js';

const normalize = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function hiResHeadshot(url) {
  if (!url) return null;
  if (url.includes('.transform/')) {
    return url.replace(/\.transform\/\d+col\//, '.transform/8col/');
  }
  return url;
}

/**
 * Retrato oficial del ganador vía OpenF1 (misma fuente que la web de pilotos).
 * @param {{ driver: string, driverId?: string }} winner
 * @returns {Promise<string | null>}
 */
export async function resolveWinnerHeadshotUrl(winner) {
  if (!winner?.driver) return null;
  const target = normalize(winner.driver);
  const id = (winner.driverId || '').trim().toLowerCase();

  try {
    const drivers = await getDrivers('latest');
    for (const d of drivers) {
      const full = normalize(d.fullName);
      const last = target.split(' ').pop();
      const match =
        full === target ||
        (last && full.endsWith(last) && full.includes(target.split(' ')[0])) ||
        (id && normalize(d.broadcastName).replace(/\s+/g, '_') === id);
      if (match && d.headshotUrl) return hiResHeadshot(d.headshotUrl);
    }
  } catch {
    /* OpenF1 opcional */
  }
  return null;
}
