import {
  FIA_F3_BASE_URL,
  FIA_F3_ENABLED,
  FIA_F3_SEASON_ID,
} from '../../config/env.js';
import { createFiaFeederApi } from '../shared/fiaFeederApi.service.js';
import {
  F3_DRIVERS_GRID_2026,
  F3_DRIVER_POINTS_2026,
} from '../../data/f3/f3DriversGrid2026.js';
import {
  F3_CONSTRUCTORS_GRID_2026,
  F3_CONSTRUCTOR_POINTS_2026,
} from '../../data/f3/f3ConstructorsGrid2026.js';
import {
  F3_CALENDAR_2026,
  F3_LAST_COMPLETED_ROUND,
} from '../../data/f3/f3Calendar2026.js';
import { F3_RACE_RESULTS_2026 } from '../../data/f3/f3RaceResults2026.js';

const fiaApi = createFiaFeederApi({
  baseUrl: FIA_F3_BASE_URL,
  seasonId: FIA_F3_SEASON_ID,
  driversGrid: F3_DRIVERS_GRID_2026,
  constructorsGrid: F3_CONSTRUCTORS_GRID_2026,
});

const stripInternal = (items) =>
  items.map(({ fiaRaceId, sprintDate, ...race }) => race);

const raceWindowFromLocal = (race) => {
  const start = race.date && race.time ? `${race.date}T${race.time}` : null;
  const end = start
    ? new Date(new Date(start).getTime() + 90 * 60 * 1000).toISOString()
    : null;
  return { raceSessionStart: start, raceSessionEnd: end };
};

const mapRaceResultsResponse = (race) => ({
  round: race.round,
  raceName: race.raceName,
  circuitName: race.circuitName,
  date: race.date,
  results: race.results,
  live: race.live === true,
  sessionPending: race.sessionPending === true,
});

const winsFromResults = (driverId) => {
  let w = 0;
  for (const race of Object.values(F3_RACE_RESULTS_2026)) {
    const win = race.results.find((r) => r.driverId === driverId && r.position === 1);
    if (win) w += 1;
  }
  return w;
};

const teamWins = (constructorId) => {
  let w = 0;
  for (const race of Object.values(F3_RACE_RESULTS_2026)) {
    const win = race.results.find((r) => r.constructorId === constructorId && r.position === 1);
    if (win) w += 1;
  }
  return w;
};

const fallbackDriverStandings = () =>
  [...F3_DRIVERS_GRID_2026]
    .map((g) => ({
      pos: 0,
      driver: g.driver,
      driverId: g.driverId,
      team: g.team,
      points: F3_DRIVER_POINTS_2026[g.driverId] ?? 0,
      wins: winsFromResults(g.driverId),
      nationality: g.nationality,
      gridOrder: g.gridOrder,
    }))
    .sort((a, b) => b.points - a.points || a.gridOrder - b.gridOrder)
    .map((row, i) => ({ ...row, pos: i + 1 }));

const fallbackConstructorStandings = () =>
  [...F3_CONSTRUCTORS_GRID_2026]
    .map((g) => ({
      pos: 0,
      team: g.team,
      constructorId: g.constructorId,
      points: F3_CONSTRUCTOR_POINTS_2026[g.constructorId] ?? 0,
      wins: teamWins(g.constructorId),
      nationality: g.nationality,
      gridOrder: g.gridOrder,
    }))
    .sort((a, b) => b.points - a.points || a.gridOrder - b.gridOrder)
    .map((row, i) => ({ ...row, pos: i + 1 }));

const fallbackCalendar = () =>
  F3_CALENDAR_2026.map((race) => {
    const { sprintDate: _s, ...base } = race;
    return {
      ...base,
      ...raceWindowFromLocal(race),
      resultsAvailable: Boolean(F3_RACE_RESULTS_2026[race.round]),
    };
  });

const mapRacePayload = (race) => ({
  round: race.round,
  raceName: race.raceName,
  circuitName: race.circuitName,
  date: race.date,
  imageUrl: null,
  results: race.results.map((r) => ({
    position: r.position,
    driver: r.driver,
    driverId: r.driverId,
    team: r.team,
    constructorId: r.constructorId,
    grid: r.grid,
    laps: r.laps,
    status: r.status,
    points: r.points,
    time: r.time,
  })),
});

const fallbackLastRace = () => {
  const race = F3_RACE_RESULTS_2026[F3_LAST_COMPLETED_ROUND];
  if (!race) throw new Error('No last F3 race data');
  return mapRacePayload(race);
};

const fallbackRaceResults = (round) => {
  const race = F3_RACE_RESULTS_2026[round];
  if (!race) throw new Error(`No F3 race results for round ${round}`);
  return {
    round: race.round,
    raceName: race.raceName,
    circuitName: race.circuitName,
    date: race.date,
    results: race.results.map((r) => ({
      position: r.position,
      driver: r.driver,
      driverId: r.driverId,
      team: r.team,
      constructorId: r.constructorId,
      grid: r.grid,
      laps: r.laps,
      status: r.status,
      points: r.points,
      time: r.time,
    })),
  };
};

/** Rondas con resultados publicados (FIA o, si falla la API, mocks locales). */
export const getMaxCompletedRound = async () => {
  const cal = await getCalendar();
  const rounds = cal.items.filter((r) => r.resultsAvailable).map((r) => r.round);
  return rounds.length ? Math.max(...rounds) : 0;
};

export const getDriverStandings = async () => {
  if (!FIA_F3_ENABLED) return { items: fallbackDriverStandings() };
  try {
    const { items } = await fiaApi.getDriverStandings();
    return { items };
  } catch {
    return { items: fallbackDriverStandings() };
  }
};

export const getConstructorStandings = async () => {
  if (!FIA_F3_ENABLED) return { items: fallbackConstructorStandings() };
  try {
    const { items } = await fiaApi.getConstructorStandings();
    return { items };
  } catch {
    return { items: fallbackConstructorStandings() };
  }
};

export const getCalendar = async () => {
  if (!FIA_F3_ENABLED) return { items: fallbackCalendar() };
  try {
    const { items } = await fiaApi.getCalendar();
    return { items: stripInternal(items) };
  } catch {
    return { items: fallbackCalendar() };
  }
};

export const getLastRace = async () => {
  if (!FIA_F3_ENABLED) return fallbackLastRace();
  try {
    const race = await fiaApi.getLastRace();
    return mapRacePayload(race);
  } catch {
    return fallbackLastRace();
  }
};

export const getRaceResultsByRound = async (round) => {
  const cleanRound = Number.parseInt(round, 10);
  if (!FIA_F3_ENABLED) return fallbackRaceResults(cleanRound);
  try {
    const race = await fiaApi.getRaceResultsByRound(cleanRound, { allowLive: true });
    return mapRaceResultsResponse(race);
  } catch {
    return fallbackRaceResults(cleanRound);
  }
};

export const findDriverGrid = (driverId) =>
  F3_DRIVERS_GRID_2026.find((d) => d.driverId === driverId) ?? null;

export const findConstructorGrid = (constructorId) =>
  F3_CONSTRUCTORS_GRID_2026.find((c) => c.constructorId === constructorId) ?? null;

const TEAM_TO_CONSTRUCTOR_ID = Object.fromEntries(
  F3_CONSTRUCTORS_GRID_2026.map((c) => [c.team, c.constructorId]),
);

export const getDriversForConstructor = (constructorId) =>
  F3_DRIVERS_GRID_2026.filter((d) => TEAM_TO_CONSTRUCTOR_ID[d.team] === constructorId);
