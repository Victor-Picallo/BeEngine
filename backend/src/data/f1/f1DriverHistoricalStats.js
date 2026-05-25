/**
 * Palmarés de pilotos hasta el cierre de 2025 (BeEngine).
 * La temporada en curso se suma vía clasificación actual de Jolpica.
 */

export const DRIVER_HISTORICAL_THROUGH_SEASON = 2025;

/** @type {Record<string, { championships: number, stats: object, maxCareerPts: number, debut: string }>} */
export const DRIVER_HISTORICAL_STATS = {
  max_verstappen: {
    championships: 3,
    stats: { wins: 63, podiums: 115, poles: 44, fastestLaps: 32, races: 208, points: 2700, winsCurrentSeason: 0 },
    maxCareerPts: 454,
    debut: 'Australian Grand Prix 2015',
  },
  hamilton: {
    championships: 7,
    stats: { wins: 105, podiums: 202, poles: 104, fastestLaps: 35, races: 380, points: 4800, winsCurrentSeason: 0 },
    maxCareerPts: 413,
    debut: 'Australian Grand Prix 2007',
  },
  leclerc: {
    championships: 0,
    stats: { wins: 8, podiums: 42, poles: 26, fastestLaps: 8, races: 155, points: 1350, winsCurrentSeason: 0 },
    maxCareerPts: 308,
    debut: 'Australian Grand Prix 2018',
  },
  norris: {
    championships: 0,
    stats: { wins: 5, podiums: 22, poles: 6, fastestLaps: 4, races: 138, points: 950, winsCurrentSeason: 0 },
    maxCareerPts: 369,
    debut: 'Australian Grand Prix 2019',
  },
  piastri: {
    championships: 0,
    stats: { wins: 6, podiums: 18, poles: 5, fastestLaps: 3, races: 68, points: 550, winsCurrentSeason: 0 },
    maxCareerPts: 369,
    debut: 'Bahrain Grand Prix 2023',
  },
  russell: {
    championships: 0,
    stats: { wins: 2, podiums: 14, poles: 3, fastestLaps: 2, races: 128, points: 680, winsCurrentSeason: 0 },
    maxCareerPts: 273,
    debut: 'Australian Grand Prix 2019',
  },
  antonelli: {
    championships: 0,
    stats: { wins: 0, podiums: 2, poles: 0, fastestLaps: 0, races: 4, points: 12, winsCurrentSeason: 0 },
    maxCareerPts: 12,
    debut: 'Italian Grand Prix 2024',
  },
  alonso: {
    championships: 2,
    stats: { wins: 32, podiums: 110, poles: 24, fastestLaps: 18, races: 400, points: 2300, winsCurrentSeason: 0 },
    maxCareerPts: 333,
    debut: 'Australian Grand Prix 2001',
  },
  sainz: {
    championships: 0,
    stats: { wins: 3, podiums: 24, poles: 6, fastestLaps: 2, races: 198, points: 1100, winsCurrentSeason: 0 },
    maxCareerPts: 290,
    debut: 'Australian Grand Prix 2015',
  },
  albon: {
    championships: 0,
    stats: { wins: 0, podiums: 2, poles: 0, fastestLaps: 0, races: 118, points: 280, winsCurrentSeason: 0 },
    maxCareerPts: 105,
    debut: 'Belgian Grand Prix 2019',
  },
  gasly: {
    championships: 0,
    stats: { wins: 1, podiums: 4, poles: 0, fastestLaps: 0, races: 148, points: 420, winsCurrentSeason: 0 },
    maxCareerPts: 181,
    debut: 'Malaysian Grand Prix 2017',
  },
  ocon: {
    championships: 0,
    stats: { wins: 1, podiums: 3, poles: 0, fastestLaps: 0, races: 148, points: 380, winsCurrentSeason: 0 },
    maxCareerPts: 187,
    debut: 'Belgian Grand Prix 2016',
  },
  bottas: {
    championships: 0,
    stats: { wins: 10, podiums: 68, poles: 20, fastestLaps: 10, races: 248, points: 1850, winsCurrentSeason: 0 },
    maxCareerPts: 413,
    debut: 'Australian Grand Prix 2013',
  },
  perez: {
    championships: 0,
    stats: { wins: 6, podiums: 38, poles: 3, fastestLaps: 4, races: 278, points: 1650, winsCurrentSeason: 0 },
    maxCareerPts: 305,
    debut: 'Australian Grand Prix 2011',
  },
  stroll: {
    championships: 0,
    stats: { wins: 0, podiums: 3, poles: 1, fastestLaps: 0, races: 178, points: 280, winsCurrentSeason: 0 },
    maxCareerPts: 187,
    debut: 'Australian Grand Prix 2017',
  },
  hulkenberg: {
    championships: 0,
    stats: { wins: 0, podiums: 0, poles: 1, fastestLaps: 0, races: 218, points: 580, winsCurrentSeason: 0 },
    maxCareerPts: 185,
    debut: 'Bahrain Grand Prix 2010',
  },
  lawson: {
    championships: 0,
    stats: { wins: 0, podiums: 0, poles: 0, fastestLaps: 0, races: 28, points: 45, winsCurrentSeason: 0 },
    maxCareerPts: 45,
    debut: 'Belgian Grand Prix 2023',
  },
  arvid_lindblad: {
    championships: 0,
    stats: { wins: 0, podiums: 0, poles: 0, fastestLaps: 0, races: 0, points: 0, winsCurrentSeason: 0 },
    maxCareerPts: 1,
    debut: '—',
  },
  bearman: {
    championships: 0,
    stats: { wins: 0, podiums: 0, poles: 0, fastestLaps: 0, races: 4, points: 6, winsCurrentSeason: 0 },
    maxCareerPts: 6,
    debut: 'Saudi Arabian Grand Prix 2024',
  },
  bortoleto: {
    championships: 0,
    stats: { wins: 0, podiums: 0, poles: 0, fastestLaps: 0, races: 0, points: 0, winsCurrentSeason: 0 },
    maxCareerPts: 1,
    debut: '—',
  },
  colapinto: {
    championships: 0,
    stats: { wins: 0, podiums: 0, poles: 0, fastestLaps: 0, races: 8, points: 5, winsCurrentSeason: 0 },
    maxCareerPts: 5,
    debut: 'Azerbaijan Grand Prix 2024',
  },
};

const DRIVER_HISTORICAL_ALIASES = {
  lindblad: 'arvid_lindblad',
};

export function getDriverHistoricalStats(driverId) {
  let id = String(driverId || '').trim().toLowerCase();
  id = DRIVER_HISTORICAL_ALIASES[id] ?? id;
  const hit = DRIVER_HISTORICAL_STATS[id];
  if (!hit) return null;
  return {
    championships: hit.championships,
    stats: { ...hit.stats },
    maxCareerPts: hit.maxCareerPts,
    debut: hit.debut,
  };
}

/**
 * @param {ReturnType<typeof getDriverHistoricalStats>} historical
 * @param {{ standing?: { wins?: number, points?: number } | null, seasonYear?: number, currentYearRow?: { year: number, titleWon?: boolean } | null }} live
 */
export function mergeDriverHistoricalWithLive(historical, live = {}) {
  if (!historical) return null;

  let championships = historical.championships;
  const stats = { ...historical.stats };
  const seasonYear = live.seasonYear ?? new Date().getUTCFullYear();
  const standingWins = Math.max(0, parseInt(String(live.standing?.wins ?? '0'), 10) || 0);
  const standingPts = parseFloat(live.standing?.points ?? '0') || 0;

  stats.wins = historical.stats.wins + standingWins;
  stats.points = Math.round((historical.stats.points + standingPts) * 10) / 10;
  stats.winsCurrentSeason = standingWins;

  if (live.currentYearRow?.year === seasonYear && live.currentYearRow.titleWon) {
    championships += 1;
  }

  return { championships, stats, maxCareerPts: historical.maxCareerPts };
}
