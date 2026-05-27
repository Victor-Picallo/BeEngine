import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

/** @param {{ displayName?: string, driver?: { givenName?: string | null, familyName?: string | null } }} entry */
export function namesFromDriverEntry(entry) {
  const given = entry.driver?.givenName?.trim();
  const family = entry.driver?.familyName?.trim();
  if (given || family) {
    return { givenName: given ?? '', familyName: family ?? '' };
  }
  const parts = String(entry.displayName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) {
    return { givenName: parts[0] ?? '', familyName: '' };
  }
  return {
    givenName: parts.slice(0, -1).join(' '),
    familyName: parts[parts.length - 1],
  };
}

/** @param {import('@prisma/client').DriverSeasonEntry & { driver?: { nationality?: string | null, headshotUrl?: string | null } }} entry */
export function mapConstructorProfileDriver(entry) {
  const { givenName, familyName } = namesFromDriverEntry(entry);
  const code = familyName.slice(0, 3).toUpperCase() || givenName.slice(0, 3).toUpperCase();
  return {
    driverId: entry.driverId,
    givenName,
    familyName,
    code,
    number: null,
    nationality: entry.driver?.nationality ?? '',
    headshotUrl: toPublicMediaUrl(entry.headshotUrl ?? entry.driver?.headshotUrl),
  };
}

/**
 * @param {Array<{ driverId: string }>} drivers — orden grid (P1 equipo, P2 equipo)
 * @param {number} maxRound
 * @param {(round: number) => string} gpLabel
 * @param {(round: number) => Promise<{ results: Array<{ driverId: string, position: number, points: number }> }>} getRaceResultsByRound
 */
export async function buildFeederConstructorSeasonRows(drivers, maxRound, gpLabel, getRaceResultsByRound) {
  const rows = [];
  let cumPts = 0;
  for (let r = 1; r <= maxRound; r += 1) {
    try {
      const race = await getRaceResultsByRound(r);
      const positions = [];
      let points = 0;
      for (const d of drivers) {
        const result = race.results.find((x) => x.driverId === d.driverId);
        if (!result) continue;
        positions.push(result.position);
        points += result.points;
      }
      if (!positions.length && points <= 0) continue;
      cumPts += points;
      rows.push({
        round: r,
        gp: gpLabel(r),
        d1Pos: positions[0] ?? null,
        d2Pos: positions[1] ?? null,
        points,
        cumPts,
      });
    } catch {
      /* ronda sin datos */
    }
  }
  return rows;
}

export function buildFeederConstructorBio(teamName, nationality, seriesLabel, year) {
  const nat = nationality ? ` (${nationality})` : '';
  return (
    `${teamName}${nat} compite en ${seriesLabel} en la temporada ${year}. ` +
    `Los datos de carrera y clasificación se actualizan desde los resultados oficiales de la categoría.`
  );
}

export function buildFeederConstructorStats(standingRow, podiums = 0) {
  return {
    championships: 0,
    totalWins: standingRow?.wins ?? 0,
    totalPodiums: podiums,
    totalPoles: 0,
  };
}

export function buildFeederConstructorAggregates(profile) {
  const pts = profile.careerHistory?.map((h) => h.pts) ?? [];
  const maxCareerPts = pts.length ? Math.max(...pts) : profile.standing?.points ?? 0;
  return {
    stats: profile.stats,
    bioText: profile.bioText,
    maxCareerPts: maxCareerPts > 0 ? maxCareerPts : 1,
    partial: false,
  };
}
