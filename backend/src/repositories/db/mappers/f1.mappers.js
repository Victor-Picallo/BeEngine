import { toPublicMediaUrl } from '../../../lib/supabaseStorage.js';

/** @param {import('../../../generated/prisma/index.js').Event} e */
export function eventToCalendarRow(e) {
  return {
    round: e.round,
    raceName: e.raceName,
    circuitName: e.circuitName ?? '',
    locality: e.locality ?? '',
    country: e.country ?? '',
    date: e.date ?? '',
    time: e.time ?? null,
    resultsAvailable: e.resultsAvailable === true,
    circuitId: e.circuitId ?? null,
    circuitImageUrl: toPublicMediaUrl(e.circuitImageUrl) ?? toPublicMediaUrl(e.circuitSvgUrl),
    circuitSvgUrl: toPublicMediaUrl(e.circuitSvgUrl),
  };
}

/** @param {import('../../../generated/prisma/index.js').DriverStanding & { driver: import('../../../generated/prisma/index.js').Driver }} row */
export function driverStandingToApi(row) {
  const d = row.driver;
  const name =
    d.givenName && d.familyName
      ? `${d.givenName} ${d.familyName}`.trim()
      : d.givenName || d.familyName || row.driverId;
  return {
    pos: row.position,
    driver: name,
    driverId: row.driverId,
    team: '',
    points: row.points,
    wins: row.wins,
    nationality: d.nationality ?? '',
  };
}

/** @param {import('../../../generated/prisma/index.js').ConstructorStanding & { constructor: import('../../../generated/prisma/index.js').Constructor }} row */
export function constructorStandingToApi(row) {
  const c = row.constructor;
  return {
    pos: row.position,
    team: c.id,
    constructorId: row.constructorId,
    points: row.points,
    wins: row.wins,
    nationality: '',
  };
}

/** Merge grid entries with standings rows (misma idea que driverStandingsStore). */
export function mergeDriverStandingsWithGrid(standings, gridEntries) {
  const byId = new Map(standings.map((s) => [s.driverId, s]));
  const norm = (s) =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

  let items = gridEntries.map((g) => {
    const hit = byId.get(g.driverId);
    if (hit) {
      return {
        ...hit,
        driver: hit.driver || g.displayName,
        team: hit.team || g.teamName,
        nationality: hit.nationality || g.nationality || '',
      };
    }
    return {
      pos: g.gridOrder ?? 99,
      driver: g.displayName,
      driverId: g.driverId,
      team: g.teamName,
      points: 0,
      wins: 0,
      nationality: g.nationality ?? '',
    };
  });

  if (standings.length) {
    items = items.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.driver.localeCompare(b.driver);
    });
    items = items.map((row, i) => ({ ...row, pos: i + 1 }));
  }

  return items;
}

/** @param {object} payload session_results.payload */
export function sessionPayloadToLastRace(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload;
}
