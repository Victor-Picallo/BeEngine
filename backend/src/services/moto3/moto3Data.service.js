/**
 * Datos locales Moto3 2026 — fallback si Pulse Live falla.
 * Regenerar: node scripts/generate-moto3-local-data.mjs
 */
import {
  MOTO3_DRIVERS_GRID_2026,
  MOTO3_DRIVER_POINTS_2026,
} from '../../data/moto3/moto3DriversGrid2026.js';
import {
  MOTO3_CONSTRUCTORS_GRID_2026,
  MOTO3_CONSTRUCTOR_POINTS_2026,
} from '../../data/moto3/moto3ConstructorsGrid2026.js';
import {
  MOTO3_CALENDAR_2026,
  MOTO3_LAST_COMPLETED_ROUND,
} from '../../data/moto3/moto3Calendar2026.js';
import { MOTO3_RACE_RESULTS_2026 } from '../../data/moto3/moto3RaceResults2026.js';
import { MOTO3_DRIVER_PORTRAIT_URL } from '../../data/moto3/moto3DriverPortraits.js';
import { MOTO3_TEAM_ASSETS } from '../../data/moto3/moto3TeamAssets.js';
import { resolveMoto3TeamLogoUrl } from '../../data/moto3/moto3TeamLogos.js';

const winsForDriver = (driverId) => {
  let w = 0;
  for (const race of Object.values(MOTO3_RACE_RESULTS_2026)) {
    if (race.results?.some((r) => r.driverId === driverId && r.position === 1)) w += 1;
  }
  return w;
};

const winsForTeam = (constructorId) => {
  let w = 0;
  for (const race of Object.values(MOTO3_RACE_RESULTS_2026)) {
    if (race.results?.some((r) => r.constructorId === constructorId && r.position === 1)) w += 1;
  }
  return w;
};

const enrichDriverRow = (row) => {
  const local = MOTO3_DRIVERS_GRID_2026.find((d) => d.driverId === row.driverId);
  const assets = local?.constructorId ? MOTO3_TEAM_ASSETS[local.constructorId] : null;
  const logoUrl =
    row.logoUrl ??
    resolveMoto3TeamLogoUrl(
      row.teamId ?? local?.teamId,
      row.constructorId ?? local?.constructorId,
      row.team ?? local?.team,
    );
  return {
    ...row,
    team: row.team ?? local?.team ?? '—',
    constructorId: row.constructorId ?? local?.constructorId ?? '',
    nationality: row.nationality ?? local?.nationality ?? '',
    headshotUrl:
      row.headshotUrl ?? MOTO3_DRIVER_PORTRAIT_URL[row.driverId] ?? local?.headshotUrl ?? null,
    teamColor: row.teamColor ?? assets?.teamColor ?? local?.teamColor ?? null,
    teamId: row.teamId ?? local?.teamId ?? null,
    logoUrl: logoUrl ?? assets?.logoUrl ?? null,
    bikeImageUrl: row.bikeImageUrl ?? assets?.bikeImageUrl ?? null,
  };
};

const enrichTeamRow = (row) => {
  const local = MOTO3_CONSTRUCTORS_GRID_2026.find(
    (t) => t.constructorId === row.constructorId || t.team === row.team,
  );
  const assets = MOTO3_TEAM_ASSETS[row.constructorId] ?? null;
  return {
    ...row,
    team: row.team ?? local?.team ?? '—',
    constructorId: row.constructorId ?? local?.constructorId ?? '',
    teamId: row.teamId ?? local?.teamId ?? null,
    teamColor: row.teamColor ?? assets?.teamColor ?? local?.teamColor ?? null,
    logoUrl:
      row.logoUrl ??
      resolveMoto3TeamLogoUrl(row.teamId, row.constructorId, row.team) ??
      assets?.logoUrl ??
      null,
    bikeImageUrl: row.bikeImageUrl ?? assets?.bikeImageUrl ?? null,
  };
};

export const enrichMoto3DriverStandings = (items) => (items ?? []).map(enrichDriverRow);

export const enrichMoto3TeamStandings = (items) => (items ?? []).map(enrichTeamRow);

export const fallbackMoto3DriverStandings = () =>
  [...MOTO3_DRIVERS_GRID_2026]
    .map((g) => ({
      pos: 0,
      driver: g.driver,
      driverId: g.driverId,
      team: g.team,
      constructorId: g.constructorId,
      points: MOTO3_DRIVER_POINTS_2026[g.driverId] ?? 0,
      wins: winsForDriver(g.driverId),
      nationality: g.nationality,
      teamColor: g.teamColor ?? MOTO3_TEAM_ASSETS[g.constructorId]?.teamColor ?? null,
      headshotUrl: MOTO3_DRIVER_PORTRAIT_URL[g.driverId] ?? g.headshotUrl ?? null,
      teamId: g.teamId ?? null,
      logoUrl:
        resolveMoto3TeamLogoUrl(g.teamId, g.constructorId, g.team) ??
        MOTO3_TEAM_ASSETS[g.constructorId]?.logoUrl ??
        null,
      bikeImageUrl: MOTO3_TEAM_ASSETS[g.constructorId]?.bikeImageUrl ?? null,
    }))
    .sort((a, b) => b.points - a.points || a.gridOrder - b.gridOrder)
    .map((row, i) => ({ ...row, pos: i + 1 }));

export const fallbackMoto3ConstructorStandings = () =>
  [...MOTO3_CONSTRUCTORS_GRID_2026]
    .map((g) => ({
      pos: 0,
      team: g.team,
      constructorId: g.constructorId,
      teamId: g.teamId,
      points: MOTO3_CONSTRUCTOR_POINTS_2026[g.constructorId] ?? 0,
      wins: winsForTeam(g.constructorId),
      nationality: g.nationality ?? '',
      teamColor: g.teamColor,
      logoUrl:
        resolveMoto3TeamLogoUrl(g.teamId, g.constructorId, g.team) ?? g.logoUrl ?? null,
      bikeImageUrl: g.bikeImageUrl ?? null,
    }))
    .sort((a, b) => b.points - a.points || a.gridOrder - b.gridOrder)
    .map((row, i) => ({ ...row, pos: i + 1 }));

export const fallbackMoto3OfficialTeamsGrid = () => fallbackMoto3ConstructorStandings();

export const fallbackMoto3Calendar = () =>
  MOTO3_CALENDAR_2026.map((race) => ({
    ...race,
    resultsAvailable: Boolean(MOTO3_RACE_RESULTS_2026[race.round]),
  }));

const mapRacePayload = (race) => ({
  round: race.round,
  raceName: race.raceName,
  circuitName: race.circuitName,
  date: race.date,
  results: (race.results ?? []).map((r) => ({
    position: r.position,
    driver: r.driver,
    driverId: r.driverId,
    team: r.team,
    constructorId: r.constructorId,
    grid: r.grid ?? 0,
    laps: r.laps ?? 0,
    status: r.status ?? 'Finished',
    points: r.points ?? 0,
    time: r.time ?? null,
  })),
});

export const fallbackMoto3LastRace = () => {
  const race = MOTO3_RACE_RESULTS_2026[MOTO3_LAST_COMPLETED_ROUND];
  if (!race) {
    return {
      raceName: '—',
      round: MOTO3_LAST_COMPLETED_ROUND,
      circuitName: '—',
      date: new Date().toISOString().slice(0, 10),
      results: [],
    };
  }
  return mapRacePayload(race);
};

export const fallbackMoto3RaceResults = (round) => {
  const race = MOTO3_RACE_RESULTS_2026[round];
  if (!race) throw new Error(`No local Moto3 race results for round ${round}`);
  return mapRacePayload(race);
};

export const findMoto3DriverGrid = (driverId) =>
  MOTO3_DRIVERS_GRID_2026.find((d) => d.driverId === driverId) ?? null;

export const findMoto3ConstructorGrid = (constructorId) =>
  MOTO3_CONSTRUCTORS_GRID_2026.find((c) => c.constructorId === constructorId) ?? null;

export { MOTO3_LAST_COMPLETED_ROUND, MOTO3_DRIVER_PORTRAIT_URL };
