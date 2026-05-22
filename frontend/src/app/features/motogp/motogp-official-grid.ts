import type { MotogpTeamStanding } from './motogp.types';
import { resolveOfficialTeamSlug } from './motogp-media';

export interface MotogpPulseTeam {
  teamId: string;
  constructorId: string;
  name: string;
  color?: string | null;
  logoUrl?: string | null;
  bikeImageUrl?: string | null;
}

/** 11 equipos Pulse + puntos agregados desde clasificación por nombre patrocinado. */
export function mergeOfficialTeamsGrid(
  teams: MotogpPulseTeam[],
  standings: MotogpTeamStanding[],
): MotogpTeamStanding[] {
  const statsBySlug = new Map<string, { points: number; wins: number }>();
  for (const row of standings) {
    const slug = resolveOfficialTeamSlug(row.constructorId, row.teamId, row.team);
    if (!slug) continue;
    const cur = statsBySlug.get(slug) ?? { points: 0, wins: 0 };
    cur.points += row.points ?? 0;
    cur.wins += row.wins ?? 0;
    statsBySlug.set(slug, cur);
  }

  return teams
    .map((t) => {
      const stats = statsBySlug.get(t.constructorId) ?? { points: 0, wins: 0 };
      return {
        pos: 0,
        team: t.name,
        constructorId: t.constructorId,
        teamId: t.teamId,
        points: stats.points,
        wins: stats.wins,
        nationality: '',
        teamColor: t.color ?? null,
        logoUrl: t.logoUrl ?? null,
        bikeImageUrl: t.bikeImageUrl ?? null,
      };
    })
    .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
    .map((row, i) => ({ ...row, pos: i + 1 }));
}
