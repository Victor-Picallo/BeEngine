/**
 * Sincroniza mocks F3 (puntos + resultados carrera) desde la web FIA.
 * Uso: node scripts/sync-f3-data.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createFiaFeederApi } from '../src/services/shared/fiaFeederApi.service.js';
import { F3_DRIVERS_GRID_2026 } from '../src/data/f3/f3DriversGrid2026.js';
import { F3_CONSTRUCTORS_GRID_2026 } from '../src/data/f3/f3ConstructorsGrid2026.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = createFiaFeederApi({
  baseUrl: 'https://www.fiaformula3.com',
  seasonId: 183,
  driversGrid: F3_DRIVERS_GRID_2026,
  constructorsGrid: F3_CONSTRUCTORS_GRID_2026,
});

const normalizeTeam = (team, constructorId) => {
  const grid = F3_CONSTRUCTORS_GRID_2026.find((c) => c.constructorId === constructorId);
  return grid?.team ?? team;
};

const ds = await api.getDriverStandings();
const cs = await api.getConstructorStandings();
const cal = await api.getCalendar();
const completed = cal.items.filter((r) => r.resultsAvailable).map((r) => r.round);

const driverPts = Object.fromEntries(ds.items.map((d) => [d.driverId, d.points]));
const teamPts = Object.fromEntries(cs.items.map((c) => [c.constructorId, c.points]));

/** @type {Record<number, object>} */
const races = {};
for (const round of completed) {
  const race = await api.getRaceResultsByRound(round);
  races[round] = {
    round: race.round,
    raceName: race.raceName,
    circuitName: race.circuitName,
    date: race.date,
    results: race.results.map((r) => ({
      position: r.position,
      driverId: r.driverId,
      driver: r.driver,
      team: normalizeTeam(r.team, r.constructorId),
      constructorId: r.constructorId,
      grid: r.grid,
      laps: r.laps,
      status: r.status,
      points: r.points,
      time: r.time,
    })),
  };
}

const lastRound = completed.length ? Math.max(...completed) : 0;

const driversPath = join(root, 'src/data/f3/f3DriversGrid2026.js');
let driversSrc = readFileSync(driversPath, 'utf8');
driversSrc = driversSrc.replace(
  /export const F3_DRIVER_POINTS_2026 = \{[\s\S]*?\};/,
  `export const F3_DRIVER_POINTS_2026 = ${formatObj(driverPts)};`,
);
writeFileSync(driversPath, driversSrc);

const teamsPath = join(root, 'src/data/f3/f3ConstructorsGrid2026.js');
let teamsSrc = readFileSync(teamsPath, 'utf8');
teamsSrc = teamsSrc.replace(
  /export const F3_CONSTRUCTOR_POINTS_2026 = \{[\s\S]*?\};/,
  `export const F3_CONSTRUCTOR_POINTS_2026 = ${formatObj(teamPts)};`,
);
writeFileSync(teamsPath, teamsSrc);

const calPath = join(root, 'src/data/f3/f3Calendar2026.js');
let calSrc = readFileSync(calPath, 'utf8');
calSrc = calSrc.replace(
  /export const F3_LAST_COMPLETED_ROUND = \d+;/,
  `export const F3_LAST_COMPLETED_ROUND = ${lastRound};`,
);
writeFileSync(calPath, calSrc);

const racesPath = join(root, 'src/data/f3/f3RaceResults2026.js');
const racesBody = Object.entries(races)
  .map(([k, v]) => `  ${k}: ${formatRace(v)},`)
  .join('\n');
const racesSrc = `/**
 * Resultados F3 2026 (feature race) — sincronizado desde FIA (${new Date().toISOString().slice(0, 10)}).
 * @typedef {{ position: number, driverId: string, driver: string, team: string, constructorId: string, grid: number, laps: number, status: string, points: number, time: string | null }} F3ResultRow
 * @typedef {{ round: number, raceName: string, circuitName: string, date: string, results: F3ResultRow[] }} F3RaceResult
 */

/** @type {Record<number, F3RaceResult>} */
export const F3_RACE_RESULTS_2026 = {
${racesBody}
};
`;
writeFileSync(racesPath, racesSrc);

console.log(
  `F3 sync OK — rounds ${completed.join(', ') || 'none'}, leader ${ds.items[0]?.driver ?? '—'} (${ds.items[0]?.points ?? 0} pts)`,
);

function formatObj(obj) {
  const lines = Object.entries(obj).map(([k, v]) => `  ${k}: ${v},`);
  return `{\n${lines.join('\n')}\n}`;
}

function formatRace(race) {
  const rows = race.results
    .map(
      (r) =>
        `      { position: ${r.position}, driverId: '${r.driverId}', driver: '${esc(r.driver)}', team: '${esc(r.team)}', constructorId: '${r.constructorId}', grid: ${r.grid}, laps: ${r.laps}, status: '${r.status}', points: ${r.points}, time: ${r.time ? `'${esc(r.time)}'` : 'null'} },`,
    )
    .join('\n');
  return `{
    round: ${race.round},
    raceName: '${esc(race.raceName)}',
    circuitName: '${esc(race.circuitName)}',
    date: '${race.date}',
    results: [
${rows}
    ],
  }`;
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
