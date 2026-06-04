/** Respuesta en vivo (Jolpica, Pulse Live, etc.), no caché DB. */
export function isLiveProfileSource(source: string | undefined): boolean {
  return Boolean(source && source !== 'db' && source !== 'empty');
}

export function careerEnrichingAfterDbEmission(profile: {
  careerHistoryPagination?: { totalYears?: number } | null;
  careerHistory: unknown[];
}): boolean {
  return (
    Boolean(profile.careerHistoryPagination) ||
    profile.careerHistory.length <= 1
  );
}

export interface DriverProfileHybrid {
  source: string;
  headshotUrl?: string | null;
  statsSource?: 'local' | 'live' | 'api';
  stats: {
    wins: number;
    podiums: number;
    poles: number;
    fastestLaps: number;
    races: number;
    points: number;
    winsCurrentSeason: number;
  };
  championships: number;
  debut: string;
  aggregatesPending?: boolean;
}

export function mergeDbWithLiveDriverProfile<T extends DriverProfileHybrid>(
  db: T,
  live: T,
): T {
  const keepDbStats = db.statsSource === 'api' && !live.aggregatesPending;
  return {
    ...live,
    headshotUrl: live.headshotUrl ?? db.headshotUrl,
    stats: keepDbStats ? db.stats : live.stats,
    championships: keepDbStats ? db.championships : live.championships,
    debut: live.debut?.trim() ? live.debut : db.debut,
    aggregatesPending: live.aggregatesPending ?? false,
    statsSource: keepDbStats ? 'api' : live.statsSource ?? 'live',
  };
}

export interface TeamProfileHybrid {
  source: string;
  logoUrl?: string | null;
  bikeImageUrl?: string | null;
  teamColor?: string | null;
  statsSource?: string;
  stats: {
    championships: number;
    totalWins: number;
    totalPodiums: number;
    totalPoles: number;
    championshipYears?: number[];
  };
  bioText: string;
  aggregatesPending?: boolean;
}

export function mergeDbWithLiveTeamProfile<T extends TeamProfileHybrid>(
  db: T,
  live: T,
): T {
  const keepDbStats = db.statsSource === 'api' && !live.aggregatesPending;
  return {
    ...live,
    logoUrl: live.logoUrl ?? db.logoUrl,
    bikeImageUrl: live.bikeImageUrl ?? db.bikeImageUrl,
    teamColor: live.teamColor ?? db.teamColor,
    stats: keepDbStats ? db.stats : live.stats,
    bioText: live.bioText?.trim() ? live.bioText : db.bioText,
    aggregatesPending: live.aggregatesPending ?? false,
    statsSource: keepDbStats ? db.statsSource : live.statsSource,
  };
}
