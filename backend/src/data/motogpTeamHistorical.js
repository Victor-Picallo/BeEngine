/**
 * Totales históricos por equipo (satélites / independientes) hasta 2025.
 * Complementa el escaneo Pulse Live; se fusiona con el máximo entre ambas fuentes.
 */

export const TEAM_HISTORICAL_THROUGH = 2025;

/** @type {Record<string, { totalWins: number, totalPodiums: number, totalPoles: number }>} */
export const MOTOGP_TEAM_HISTORICAL = {
  'bk8-gresini-racing-motogp': { totalWins: 15, totalPodiums: 59, totalPoles: 2 },
  'lcr-honda': { totalWins: 5, totalPodiums: 58, totalPoles: 4 },
  'pertamina-enduro-vr46-racing-team': { totalWins: 4, totalPodiums: 28, totalPoles: 3 },
  'prima-pramac-yamaha-motogp': { totalWins: 9, totalPodiums: 52, totalPoles: 1 },
  'red-bull-ktm-tech3': { totalWins: 2, totalPodiums: 38, totalPoles: 0 },
  'trackhouse-motogp-team': { totalWins: 2, totalPodiums: 18, totalPoles: 2 },
};

export const getTeamHistorical = (constructorId) => {
  const key = String(constructorId || '')
    .trim()
    .toLowerCase();
  return MOTOGP_TEAM_HISTORICAL[key] ?? null;
};
