import type {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
  OpenF1Driver,
} from '../f1-live/f1-live.types';
import {
  countryCodesForDriver,
  flagCdnUrl,
  normalize,
  resolveDriverHeadshotUrl,
  teamColor,
} from '../drivers/drivers-shared';
import { FLAG_MAP } from '../../data/sports.data';
import { f1TeamCarImageUrl, f1TeamShowcaseImageUrl } from '../constructors/constructors-media';

export type ClSortKey = 'pts' | 'wins' | 'podiums' | 'poles';

export interface ClDriverRow {
  pos: number;
  num: number | null;
  driverId: string;
  name: string;
  first: string;
  last: string;
  natAlpha2: string;
  flagEmoji: string;
  flagUrl: string;
  country: string;
  team: string;
  teamColor: string;
  teamShort: string;
  constructorId: string | null;
  pts: number;
  wins: number;
  podiums: number;
  poles: number;
  gap: string;
  change: number;
  headshotUrl: string;
  cumPts: number[];
  barPct: number;
}

export interface ClConstructorRow {
  pos: number;
  team: string;
  teamColor: string;
  constructorId: string | null;
  /** Render lateral del monoplaza (F1.com 2026). */
  carImageUrl: string | null;
  /** Logo oficial si no hay asset de coche. */
  logoImageUrl: string | null;
  pts: number;
  wins: number;
  drivers: string[];
  barPct: number;
  pctLabel: string;
}

const NAT_COUNTRY: Record<string, string> = {
  British: 'Reino Unido',
  Dutch: 'Países Bajos',
  Monegasque: 'Mónaco',
  Spanish: 'España',
  Australian: 'Australia',
  Italian: 'Italia',
  French: 'Francia',
  German: 'Alemania',
  Japanese: 'Japón',
  Thai: 'Tailandia',
  Mexican: 'México',
  Canadian: 'Canadá',
  Finnish: 'Finlandia',
  Chinese: 'China',
  Brazilian: 'Brasil',
  'New Zealander': 'Nueva Zelanda',
  Argentine: 'Argentina',
  American: 'Estados Unidos',
  Danish: 'Dinamarca',
  Austrian: 'Austria',
  Swiss: 'Suiza',
  Swedish: 'Suecia',
};

function teamShort(team: string): string {
  const n = normalize(team);
  if (n.includes('red bull')) return 'Red Bull';
  if (n.includes('racing bulls') || n === 'rb') return 'RB';
  if (n.includes('aston')) return 'Aston Martin';
  if (n.includes('mercedes')) return 'Mercedes';
  if (n.includes('ferrari')) return 'Ferrari';
  if (n.includes('mclaren')) return 'McLaren';
  if (n.includes('williams')) return 'Williams';
  if (n.includes('alpine')) return 'Alpine';
  if (n.includes('haas')) return 'Haas';
  if (n.includes('sauber') || n.includes('kick')) return 'Sauber';
  if (n.includes('audi')) return 'Audi';
  if (n.includes('cadillac')) return 'Cadillac';
  const words = team.trim().split(/\s+/);
  return words[0] ?? team;
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: parts[0].toUpperCase() };
  const last = parts.pop()!;
  return { first: parts.join(' '), last: last.toUpperCase() };
}

function driverAbbrev(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? name;
  return last
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .slice(0, 3)
    .toUpperCase();
}

function matchOpenF1(
  j: JolpikaDriverStanding,
  open: OpenF1Driver[],
): OpenF1Driver | undefined {
  if (!open.length) return undefined;
  const jn = normalize(j.driver);
  const jTeam = normalize(j.team);
  const jLast = jn.split(/\s+/).pop() ?? '';
  const exact = open.find(o => normalize(o.fullName) === jn);
  if (exact) return exact;
  return open.find(o => {
    const fn = normalize(o.fullName);
    const oLast = fn.split(/\s+/).pop() ?? '';
    return oLast === jLast && normalize(o.teamName) === jTeam;
  });
}

interface RaceAgg {
  racePts: number[];
  podiums: number;
  poles: number;
}

function aggregateRaces(
  races: JolpikaRaceResult[],
  driverIds: string[],
): Map<string, RaceAgg> {
  const map = new Map<string, RaceAgg>();
  for (const id of driverIds) {
    map.set(id, { racePts: [], podiums: 0, poles: 0 });
  }

  const sorted = [...races].sort((a, b) => a.round - b.round);
  for (const race of sorted) {
    for (const id of driverIds) {
      const agg = map.get(id)!;
      const row = race.results.find(
        r => (r.driverId ?? '').trim().toLowerCase() === id.toLowerCase(),
      );
      const pts = row && Number.isFinite(row.points) ? row.points : 0;
      agg.racePts.push(pts);
      if (row) {
        if (row.position > 0 && row.position <= 3) agg.podiums += 1;
        if (row.grid === 1) agg.poles += 1;
      }
    }
  }
  return map;
}

function cumulative(points: number[]): number[] {
  let sum = 0;
  return points.map(p => {
    sum += p;
    return sum;
  });
}

function standingRanksAfterRaces(
  races: JolpikaRaceResult[],
  driverIds: string[],
): Map<string, number>[] {
  const sorted = [...races].sort((a, b) => a.round - b.round);
  const cum = new Map<string, number>();
  for (const id of driverIds) cum.set(id, 0);

  const ranksPerRace: Map<string, number>[] = [];

  for (const race of sorted) {
    for (const id of driverIds) {
      const row = race.results.find(
        r => (r.driverId ?? '').trim().toLowerCase() === id.toLowerCase(),
      );
      cum.set(id, (cum.get(id) ?? 0) + (row?.points ?? 0));
    }
    const ordered = [...driverIds].sort((a, b) => (cum.get(b) ?? 0) - (cum.get(a) ?? 0));
    const rankMap = new Map<string, number>();
    ordered.forEach((id, i) => rankMap.set(id, i + 1));
    ranksPerRace.push(rankMap);
  }
  return ranksPerRace;
}

export function buildDriverRows(
  standings: JolpikaDriverStanding[],
  openf1: OpenF1Driver[],
  races: JolpikaRaceResult[],
  options?: { headshotSize?: 'card' | 'large' },
): ClDriverRow[] {
  if (!standings.length) return [];

  const leaderPts = standings[0]?.points ?? 1;
  const ids = standings.map(s => (s.driverId ?? '').trim()).filter(Boolean);
  const agg = aggregateRaces(races, ids);
  const rankHistory = standingRanksAfterRaces(races, ids);
  const lastRanks = rankHistory[rankHistory.length - 1];
  const prevRanks = rankHistory.length > 1 ? rankHistory[rankHistory.length - 2] : null;

  return standings.map(s => {
    const id = (s.driverId ?? '').trim();
    const o = matchOpenF1(s, openf1);
    const { alpha2 } = countryCodesForDriver(s, o);
    const { first, last } = splitName(s.driver);
    const raceAgg = id ? agg.get(id) : undefined;
    const cum = cumulative(raceAgg?.racePts ?? []);
    const curRank = lastRanks?.get(id) ?? s.pos;
    const prevRank = prevRanks?.get(id) ?? curRank;
    const gapPts = leaderPts - s.points;

    return {
      pos: s.pos,
      num: o?.driverNumber ?? null,
      driverId: id,
      name: s.driver,
      first,
      last,
      natAlpha2: alpha2,
      flagEmoji: FLAG_MAP[alpha2] ?? '',
      flagUrl: flagCdnUrl(alpha2),
      country: NAT_COUNTRY[s.nationality] ?? s.nationality,
      team: s.team,
      teamColor: teamColor(s.team),
      teamShort: teamShort(s.team),
      constructorId: null,
      pts: s.points,
      wins: s.wins,
      podiums: raceAgg?.podiums ?? 0,
      poles: raceAgg?.poles ?? 0,
      gap: gapPts <= 0 ? '—' : `-${Math.round(gapPts)}`,
      change: prevRanks ? prevRank - curRank : 0,
      headshotUrl: resolveDriverHeadshotUrl(id, s.driver, o?.headshotUrl, {
        size: options?.headshotSize ?? 'card',
      }),
      cumPts: cum.length ? cum : [s.points],
      barPct: leaderPts > 0 ? (s.points / leaderPts) * 100 : 0,
    };
  });
}

export function buildConstructorRows(
  standings: JolpikaConstructorStanding[],
  driverStandings: JolpikaDriverStanding[],
): ClConstructorRow[] {
  if (!standings.length) return [];
  const maxPts = standings[0]?.points ?? 1;

  const byTeam = new Map<string, string[]>();
  for (const d of driverStandings) {
    const key = normalize(d.team);
    const list = byTeam.get(key) ?? [];
    list.push(driverAbbrev(d.driver));
    byTeam.set(key, list);
  }

  return standings.map(c => {
    const key = normalize(c.team);
    const constructorId = c.constructorId?.trim() || null;
    const carImageUrl = constructorId ? f1TeamCarImageUrl(constructorId) : null;
    const logoImageUrl =
      constructorId && !carImageUrl ? f1TeamShowcaseImageUrl(constructorId) : null;

    return {
      pos: c.pos,
      team: c.team,
      teamColor: teamColor(c.team),
      constructorId,
      carImageUrl,
      logoImageUrl,
      pts: c.points,
      wins: c.wins,
      drivers: (byTeam.get(key) ?? []).slice(0, 2),
      barPct: maxPts > 0 ? (c.points / maxPts) * 100 : 0,
      pctLabel: maxPts > 0 ? ((c.points / maxPts) * 100).toFixed(0) : '0',
    };
  });
}

export function sparklinePoints(values: number[], width = 76, height = 28): string {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  if (values.length === 1) {
    const y = height - (values[0] / max) * height;
    return `0,${y} ${width},${y}`;
  }
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(' ');
}

export function sparklineLastDot(
  values: number[],
  width = 76,
  height = 28,
): { cx: number; cy: number } | null {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const i = values.length - 1;
  const x = values.length === 1 ? width : (i / (values.length - 1)) * width;
  const y = height - (values[i] / max) * height;
  return { cx: x, cy: y };
}

export function gpLabel(race: JolpikaCalendarRace): string {
  const c = (race.country || race.locality || race.raceName || '').trim();
  if (c.length <= 4) return c.toUpperCase().slice(0, 3);
  return c
    .split(/\s+/)[0]
    .slice(0, 3)
    .toUpperCase();
}

export function seasonProgress(
  calendar: JolpikaCalendarRace[],
  lastRace: JolpikaLastRace | null,
): { done: number; total: number } {
  const total = calendar.length || 24;
  const done = lastRace?.round ?? 0;
  return { done, total };
}
