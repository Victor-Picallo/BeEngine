import { teamColor } from '../drivers/drivers-shared';
import { moto3TeamLogoUrl } from './moto3-media';
import type { Moto3TeamStanding } from './moto3.types';

export interface Moto3TeamClRow {
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

const driverAbbrev = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
};

export function buildMoto3TeamRows(
  standings: Moto3TeamStanding[],
  driverTeams: { team: string; driver: string }[],
): Moto3TeamClRow[] {
  if (!standings.length) return [];
  const maxPts = standings[0]?.points ?? 1;
  const byTeam = new Map<string, string[]>();
  for (const d of driverTeams) {
    const key = d.team.trim().toLowerCase();
    const list = byTeam.get(key) ?? [];
    list.push(driverAbbrev(d.driver));
    byTeam.set(key, list);
  }

  return standings.map((c) => ({
    pos: c.pos,
    team: c.team,
    teamColor: teamColor(c.team, c.teamColor),
    constructorId: c.constructorId?.trim() || null,
    logoImageUrl: moto3TeamLogoUrl(c.constructorId, c.teamId, c.logoUrl, c.team),
    pts: c.points,
    wins: c.wins,
    drivers: (byTeam.get(c.team.trim().toLowerCase()) ?? []).slice(0, 2),
    barPct: maxPts > 0 ? (c.points / maxPts) * 100 : 0,
    pctLabel: maxPts > 0 ? ((c.points / maxPts) * 100).toFixed(0) : '0',
  }));
}
