import { teamColor } from '../drivers/drivers-shared';
import { motogpTeamLogoUrl, resolveOfficialTeamSlug } from './motogp-media';
import type { MotogpTeamStanding } from './motogp.types';

export interface MotogpTeamClRow {
  pos: number;
  team: string;
  teamColor: string;
  constructorId: string | null;
  logoImageUrl: string | null;
  pts: number;
  wins: number;
  drivers: string[];
  barPct: number;
  pctLabel: string;
}

const normalize = (s: string) => (s || '').toLowerCase().trim();

const driverAbbrev = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
};

export function buildMotogpTeamRows(
  standings: MotogpTeamStanding[],
  driverTeams: { team: string; driver: string }[],
): MotogpTeamClRow[] {
  if (!standings.length) return [];
  const maxPts = standings[0]?.points ?? 1;
  const byOfficialSlug = new Map<string, string[]>();
  for (const d of driverTeams) {
    const slug = resolveOfficialTeamSlug(null, null, d.team);
    if (!slug) continue;
    const list = byOfficialSlug.get(slug) ?? [];
    list.push(driverAbbrev(d.driver));
    byOfficialSlug.set(slug, list);
  }

  return standings.map((c) => {
    const constructorId = c.constructorId?.trim() || null;
    const slug =
      constructorId ??
      resolveOfficialTeamSlug(c.teamId, c.constructorId, c.team) ??
      '';
    return {
      pos: c.pos,
      team: c.team,
      teamColor: teamColor(c.team, c.teamColor),
      constructorId,
      logoImageUrl: motogpTeamLogoUrl(constructorId, c.teamId, c.logoUrl, c.team),
      pts: c.points,
      wins: c.wins,
      drivers: (byOfficialSlug.get(slug) ?? []).slice(0, 2),
      barPct: maxPts > 0 ? (c.points / maxPts) * 100 : 0,
      pctLabel: maxPts > 0 ? ((c.points / maxPts) * 100).toFixed(0) : '0',
    };
  });
}
