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

export const getDriverStandings = async () => {
  const items = [...F3_DRIVERS_GRID_2026]
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

  return { source: 'beengine-f3', items };
};

export const getConstructorStandings = async () => {
  const items = [...F3_CONSTRUCTORS_GRID_2026]
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

  return { source: 'beengine-f3', items };
};

export const getCalendar = async () => ({
  source: 'beengine-f3',
  items: [...F3_CALENDAR_2026],
});

export const getLastRace = async () => {
  const race = F3_RACE_RESULTS_2026[F3_LAST_COMPLETED_ROUND];
  if (!race) throw new Error('No last F3 race data');

  return {
    source: 'beengine-f3',
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
  };
};

export const getRaceResultsByRound = async (round) => {
  const cleanRound = Number.parseInt(round, 10);
  const race = F3_RACE_RESULTS_2026[cleanRound];
  if (!race) throw new Error(`No F3 race results for round ${cleanRound}`);

  return {
    source: 'beengine-f3',
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

export const findDriverGrid = (driverId) =>
  F3_DRIVERS_GRID_2026.find((d) => d.driverId === driverId) ?? null;

export const findConstructorGrid = (constructorId) =>
  F3_CONSTRUCTORS_GRID_2026.find((c) => c.constructorId === constructorId) ?? null;

const TEAM_TO_CONSTRUCTOR_ID = Object.fromEntries(
  F3_CONSTRUCTORS_GRID_2026.map((c) => [c.team, c.constructorId]),
);

export const getDriversForConstructor = (constructorId) =>
  F3_DRIVERS_GRID_2026.filter((d) => TEAM_TO_CONSTRUCTOR_ID[d.team] === constructorId);
