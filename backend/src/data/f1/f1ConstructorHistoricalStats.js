/**
 * Totales históricos de constructores (campeonatos + victorias en GP).
 * Cifras hasta el cierre de la temporada 2025; la temporada en curso se suma vía Jolpica
 * (`standing.wins`, fila del año en historial, o agregados completos).
 * Actualizar manualmente al cierre de cada temporada.
 */

export const HISTORICAL_STATS_THROUGH_SEASON = 2025;

/** @typedef {{ championships: number, totalWins: number, totalPodiums: number, totalPoles: number, maxCareerPts: number }} ConstructorHistoricalStats */

/** @type {Record<string, ConstructorHistoricalStats>} */
export const CONSTRUCTOR_HISTORICAL_STATS = {
  ferrari: {
    championships: 16,
    totalWins: 243,
    totalPodiums: 800,
    totalPoles: 243,
    maxCareerPts: 950,
  },
  mclaren: {
    championships: 9,
    totalWins: 183,
    totalPodiums: 485,
    totalPoles: 155,
    maxCareerPts: 833,
  },
  mercedes: {
    championships: 8,
    totalWins: 125,
    totalPodiums: 280,
    totalPoles: 136,
    maxCareerPts: 765,
  },
  red_bull: {
    championships: 6,
    totalWins: 118,
    totalPodiums: 230,
    totalPoles: 95,
    maxCareerPts: 860,
  },
  williams: {
    championships: 9,
    totalWins: 114,
    totalPodiums: 312,
    totalPoles: 128,
    maxCareerPts: 187,
  },
  rb: {
    championships: 0,
    totalWins: 2,
    totalPodiums: 12,
    totalPoles: 1,
    maxCareerPts: 187,
  },
  racing_bulls: {
    championships: 0,
    totalWins: 2,
    totalPodiums: 12,
    totalPoles: 1,
    maxCareerPts: 187,
  },
  aston_martin: {
    championships: 0,
    totalWins: 0,
    totalPodiums: 8,
    totalPoles: 1,
    maxCareerPts: 342,
  },
  haas: {
    championships: 0,
    totalWins: 0,
    totalPodiums: 2,
    totalPoles: 1,
    maxCareerPts: 93,
  },
  alpine: {
    championships: 2,
    totalWins: 21,
    totalPodiums: 85,
    totalPoles: 20,
    maxCareerPts: 213,
  },
  audi: {
    championships: 0,
    totalWins: 0,
    totalPodiums: 0,
    totalPoles: 0,
    maxCareerPts: 1,
  },
  cadillac: {
    championships: 0,
    totalWins: 0,
    totalPodiums: 0,
    totalPoles: 0,
    maxCareerPts: 1,
  },
};

export function getConstructorHistoricalStats(constructorId) {
  const id = String(constructorId || '').trim().toLowerCase();
  const hit = CONSTRUCTOR_HISTORICAL_STATS[id];
  if (!hit) return null;
  return {
    stats: {
      championships: hit.championships,
      totalWins: hit.totalWins,
      totalPodiums: hit.totalPodiums,
      totalPoles: hit.totalPoles,
    },
    maxCareerPts: hit.maxCareerPts,
    throughSeason: HISTORICAL_STATS_THROUGH_SEASON,
  };
}

/**
 * Combina palmarés hasta 2025 + temporada actual (standing / fila del año).
 * @param {{ stats: object, maxCareerPts: number }} historical
 * @param {{ standing?: { wins?: number } | null, seasonYear?: number, currentYearRow?: { year: number, wins?: number, titleWon?: boolean } | null }} live
 */
export function mergeHistoricalWithLive(historical, live = {}) {
  if (!historical?.stats) return null;

  const stats = { ...historical.stats };
  const seasonYear = live.seasonYear ?? new Date().getUTCFullYear();
  const standingWins = Math.max(0, parseInt(String(live.standing?.wins ?? '0'), 10) || 0);
  const row = live.currentYearRow;
  const rowWins =
    row && row.year === seasonYear ? Math.max(0, parseInt(String(row.wins ?? '0'), 10) || 0) : 0;

  stats.totalWins = historical.stats.totalWins + Math.max(standingWins, rowWins);

  if (row?.year === seasonYear && row.titleWon) {
    stats.championships = historical.stats.championships + 1;
  }

  return {
    stats,
    maxCareerPts: historical.maxCareerPts,
  };
}
