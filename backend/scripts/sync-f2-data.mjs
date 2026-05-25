/**
 * Sincroniza mocks F2 (puntos + resultados carrera) desde la web FIA.
 * Uso: node scripts/sync-f2-data.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createFiaFeederApi } from '../src/services/shared/fiaFeederApi.service.js';
import { F2_DRIVERS_GRID_2026 } from '../src/data/f2/f2DriversGrid2026.js';
import { F2_CONSTRUCTORS_GRID_2026 } from '../src/data/f2/f2ConstructorsGrid2026.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = createFiaFeederApi({
  baseUrl: 'https://www.fiaformula2.com',
  seasonId: 183,
  driversGrid: F2_DRIVERS_GRID_2026,
  constructorsGrid: F2_CONSTRUCTORS_GRID_2026,
});

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
      team: r.team.replace('Hitech TGR', 'Hitech'),
      constructorId: r.constructorId.replace('hitech_tgr', 'hitech'),
      grid: r.grid,
      laps: r.laps,
      status: r.status,
      points: r.points,
      time: r.time,
    })),
  };
}

const lastRound = completed.length ? Math.max(...completed) : 0;

const driversPath = join(root, 'src/data/f2/f2DriversGrid2026.js');
let driversSrc = readFileSync(driversPath, 'utf8');
driversSrc = driversSrc.replace(
  /export const F2_DRIVER_POINTS_2026 = \{[\s\S]*?\};/,
  `export const F2_DRIVER_POINTS_2026 = ${formatObj(driverPts)};`,
);
writeFileSync(driversPath, driversSrc);

const teamsPath = join(root, 'src/data/f2/f2ConstructorsGrid2026.js');
let teamsSrc = readFileSync(teamsPath, 'utf8');
teamsSrc = teamsSrc.replace(
  /export const F2_CONSTRUCTOR_POINTS_2026 = \{[\s\S]*?\};/,
  `export const F2_CONSTRUCTOR_POINTS_2026 = ${formatObj(teamPts)};`,
);
writeFileSync(teamsPath, teamsSrc);

const calPath = join(root, 'src/data/f2/f2Calendar2026.js');
let calSrc = readFileSync(calPath, 'utf8');
calSrc = calSrc.replace(
  /export const F2_LAST_COMPLETED_ROUND = \d+;/,
  `export const F2_LAST_COMPLETED_ROUND = ${lastRound};`,
);
writeFileSync(calPath, calSrc);

const racesPath = join(root, 'src/data/f2/f2RaceResults2026.js');
const racesBody = Object.entries(races)
  .map(([k, v]) => `  ${k}: ${formatRace(v)},`)
  .join('\n');
const racesSrc = `/**
 * Resultados F2 2026 (feature race) — sincronizado desde FIA (${new Date().toISOString().slice(0, 10)}).
 * @typedef {{ position: number, driverId: string, driver: string, team: string, constructorId: string, grid: number, laps: number, status: string, points: number, time: string | null }} F2ResultRow
 * @typedef {{ round: number, raceName: string, circuitName: string, date: string, results: F2ResultRow[] }} F2RaceResult
 */

/** @type {Record<number, F2RaceResult>} */
export const F2_RACE_RESULTS_2026 = {
${racesBody}
};
`;
writeFileSync(racesPath, racesSrc);

console.log(
  `F2 sync OK — rounds ${completed.join(', ')}, leader ${ds.items[0]?.driver} (${ds.items[0]?.points} pts)`,
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
