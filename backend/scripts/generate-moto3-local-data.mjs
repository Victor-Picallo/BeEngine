/**
 * Genera datos locales Moto3 2026 desde Pulse.
 * Uso: node scripts/generate-moto3-local-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getDriverStandings,
  getOfficialTeamsGrid,
  getCalendar,
  getLastRace,
  getRaceResultsByRound,
} from '../src/services/motogp/pulseLive.service.js';
import { resolveMoto3TeamLogoUrl } from '../src/data/moto3/moto3TeamLogos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../src/data/moto3');

const splitName = (full) => {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { givenName: parts[0] ?? '', familyName: '' };
  return { givenName: parts.slice(0, -1).join(' '), familyName: parts[parts.length - 1] };
};

const [drivers, teams, calendar, lastRace] = await Promise.all([
  getDriverStandings('moto3'),
  getOfficialTeamsGrid('moto3'),
  getCalendar('moto3'),
  getLastRace('moto3'),
]);

const lastCompleted = Math.max(
  0,
  ...calendar.items.filter((r) => r.status === 'FINISHED').map((r) => r.round),
);

const raceResults = {};
for (let r = 1; r <= lastCompleted; r += 1) {
  try {
    const race = await getRaceResultsByRound(r, 'race', 'moto3');
    if (race?.results?.length) {
      raceResults[r] = {
        round: race.round,
        raceName: race.raceName,
        circuitName: race.circuitName,
        date: race.date,
        results: race.results.map((x) => ({
          position: x.position,
          driverId: x.driverId,
          driver: x.driver,
          team: x.team,
          constructorId: x.constructorId,
          grid: x.grid ?? 0,
          laps: x.laps ?? 0,
          status: x.status ?? 'Finished',
          points: x.points ?? 0,
          time: x.time ?? null,
        })),
      };
    }
  } catch {
    /* skip round */
  }
}

const driverGrid = drivers.items.map((d, i) => {
  const { givenName, familyName } = splitName(d.driver);
  return {
    driverId: d.driverId,
    givenName,
    familyName,
    driver: d.driver,
    team: d.team,
    constructorId: d.constructorId,
    nationality: d.nationality,
    gridOrder: i + 1,
    headshotUrl: d.headshotUrl ?? null,
    teamId: d.teamId ?? null,
    teamColor: d.teamColor ?? null,
  };
});

const driverPoints = Object.fromEntries(drivers.items.map((d) => [d.driverId, d.points]));

const constructorGrid = teams.items.map((t, i) => ({
  team: t.team,
  constructorId: t.constructorId,
  teamId: t.teamId ?? null,
  nationality: t.nationality ?? '',
  gridOrder: i + 1,
  teamColor: t.teamColor ?? null,
  logoUrl:
    resolveMoto3TeamLogoUrl(t.teamId, t.constructorId, t.team) ?? t.logoUrl ?? null,
  bikeImageUrl: t.bikeImageUrl ?? null,
}));

const constructorPoints = Object.fromEntries(
  teams.items.map((t) => [t.constructorId, t.points]),
);

const portraits = Object.fromEntries(
  driverGrid.filter((d) => d.headshotUrl).map((d) => [d.driverId, d.headshotUrl]),
);

const teamAssets = Object.fromEntries(
  constructorGrid
    .filter((t) => t.logoUrl || t.bikeImageUrl)
    .map((t) => [
      t.constructorId,
      { logoUrl: t.logoUrl, bikeImageUrl: t.bikeImageUrl, teamColor: t.teamColor },
    ]),
);

fs.mkdirSync(dataDir, { recursive: true });

const write = (name, body) => fs.writeFileSync(path.join(dataDir, name), body, 'utf8');

write(
  'moto3DriversGrid2026.js',
  `/** Parrilla Moto3 2026 — snapshot BeEngine. Regenerar: node scripts/generate-moto3-local-data.mjs */
export const MOTO3_DRIVERS_GRID_2026 = ${JSON.stringify(driverGrid, null, 2)};
export const MOTO3_DRIVER_POINTS_2026 = ${JSON.stringify(driverPoints, null, 2)};
`,
);

write(
  'moto3ConstructorsGrid2026.js',
  `/** Equipos oficiales Moto3 2026 — snapshot BeEngine. */
export const MOTO3_CONSTRUCTORS_GRID_2026 = ${JSON.stringify(constructorGrid, null, 2)};
export const MOTO3_CONSTRUCTOR_POINTS_2026 = ${JSON.stringify(constructorPoints, null, 2)};
`,
);

write(
  'moto3Calendar2026.js',
  `/** Calendario Moto3 2026 (mismos GP que MotoGP). */
export const MOTO3_CALENDAR_2026 = ${JSON.stringify(
    calendar.items.map(
      ({
        round,
        raceName,
        circuitName,
        locality,
        country,
        date,
        time,
        status,
        eventId,
        circuitSvgUrl,
        circuitImageUrl,
        circuitId,
      }) => ({
        round,
        raceName,
        circuitName,
        locality,
        country,
        date,
        time,
        status,
        eventId,
        circuitId: circuitId ?? null,
        circuitSvgUrl: circuitSvgUrl ?? null,
        circuitImageUrl: circuitImageUrl ?? null,
      }),
    ),
    null,
    2,
  )};
export const MOTO3_LAST_COMPLETED_ROUND = ${lastCompleted};
`,
);

write(
  'moto3DriverPortraits.js',
  `export const MOTO3_DRIVER_PORTRAIT_URL = ${JSON.stringify(portraits, null, 2)};
`,
);

write(
  'moto3TeamAssets.js',
  `export const MOTO3_TEAM_ASSETS = ${JSON.stringify(teamAssets, null, 2)};
`,
);

write(
  'moto3RaceResults2026.js',
  `export const MOTO3_RACE_RESULTS_2026 = ${JSON.stringify(raceResults, null, 2)};
`,
);

const fePortrait = path.resolve(
  __dirname,
  '../../frontend/src/app/features/moto3/moto3-portraits.data.ts',
);
fs.mkdirSync(path.dirname(fePortrait), { recursive: true });
fs.writeFileSync(
  fePortrait,
  `/** Auto-generated — node scripts/generate-moto3-local-data.mjs */
export const MOTO3_DRIVER_PORTRAIT_URL: Record<string, string> = ${JSON.stringify(portraits, null, 2)};
`,
  'utf8',
);

console.log(
  'OK',
  driverGrid.length,
  'drivers',
  constructorGrid.length,
  'teams',
  calendar.items.length,
  'races',
  Object.keys(raceResults).length,
  'result rounds',
  'last',
  lastCompleted,
);
