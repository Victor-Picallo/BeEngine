import { JOLPICA_F1_ENABLED } from '../../config/env.js';
import { jolpicaClient } from '../../external/jolpica/jolpica.client.js';
import f1Mock from '../../data/f1/f1.data.js';
import { F1_CONSTRUCTORS_GRID_2026 } from '../../data/f1/f1ConstructorsGrid2026.js';
import {
  F1_LAST_COMPLETED_ROUND,
  F1_RACE_RESULTS_2026,
} from '../../data/f1/f1RaceResults2026.js';
import {
  fetchLiveConstructorStandings,
  warmConstructorStandingsCache,
} from './constructorStandingsStore.js';
import {
  fetchLiveDriverStandings,
  warmDriverStandingsCache,
} from './driverStandingsStore.js';
import { resolveLastRaceImageUrl } from '../shared/lastRaceImage.service.js';

export { warmConstructorStandingsCache, warmDriverStandingsCache };

// ── Normalizers ───────────────────────────────────────────

const normalizeCalendar = (raw, lastCompletedRound = 0) => {
  const races = raw?.MRData?.RaceTable?.Races ?? [];
  return races.map((r) => {
    const round = parseInt(r.round, 10);
    return {
      round,
      raceName: r.raceName,
      circuitName: r.Circuit.circuitName,
      locality: r.Circuit.Location.locality,
      country: r.Circuit.Location.country,
      date: r.date,
      time: r.time ?? null,
      resultsAvailable:
        lastCompletedRound > 0 && round <= lastCompletedRound,
    };
  });
};

const normalizeLastRace = (raw) => {
  const race = raw?.MRData?.RaceTable?.Races?.[0];
  if (!race) return null;
  return {
    raceName: race.raceName,
    round: parseInt(race.round, 10),
    circuitName: race.Circuit.circuitName,
    date: race.date,
    results: (race.Results ?? []).map((r) => ({
      position: parseInt(r.position, 10),
      driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
      driverId: r.Driver?.driverId ?? null,
      team: r.Constructor.name,
      constructorId: r.Constructor?.constructorId ?? null,
      grid: parseInt(r.grid, 10),
      laps: parseInt(r.laps, 10),
      status: r.status,
      points: parseFloat(r.points),
      time: r.Time?.time ?? null,
    })),
  };
};

const normalizeRaceResults = (raw) => {
  const race = raw?.MRData?.RaceTable?.Races?.[0];
  if (!race) return null;
  return {
    raceName: race.raceName,
    round: parseInt(race.round, 10),
    circuitName: race.Circuit.circuitName,
    date: race.date,
    results: (race.Results ?? []).map((r) => ({
      position: parseInt(r.position, 10),
      driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
      driverId: r.Driver?.driverId ?? null,
      team: r.Constructor.name,
      constructorId: r.Constructor?.constructorId ?? null,
      grid: parseInt(r.grid, 10),
      laps: parseInt(r.laps, 10),
      status: r.status,
      points: parseFloat(r.points),
      time: r.Time?.time ?? null,
    })),
  };
};

// ── Fallbacks ─────────────────────────────────────────────

const MOCK_DRIVER_ID = {
  'M. Verstappen': 'max_verstappen',
  'L. Hamilton': 'hamilton',
  'C. Leclerc': 'leclerc',
  'L. Norris': 'norris',
  'C. Sainz': 'sainz',
  'G. Russell': 'russell',
  'F. Alonso': 'alonso',
  'O. Piastri': 'piastri',
};

const TEAM_TO_CONSTRUCTOR_ID = {
  ...Object.fromEntries(F1_CONSTRUCTORS_GRID_2026.map((c) => [c.team, c.constructorId])),
  'Red Bull': 'red_bull',
};

const fallbackDriverStandings = () =>
  f1Mock.standings.map((d) => ({
    pos: d.pos,
    driver: d.driver,
    driverId: MOCK_DRIVER_ID[d.driver] ?? 'unknown',
    team: d.team,
    points: d.points,
    wins: 0,
    nationality: d.nationality,
  }));

const fallbackConstructorStandings = () =>
  f1Mock.constructors.map((c) => ({
    pos: c.pos,
    team: c.team,
    constructorId:
      TEAM_TO_CONSTRUCTOR_ID[c.team] ??
      (c.team.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'unknown'),
    points: c.points,
    wins: 0,
    nationality: 'Unknown',
  }));

const fallbackCalendar = () => {
  const nr = f1Mock.nextRace;
  const [date, time] = nr.date.split('T');
  return [
    {
      round: nr.round,
      raceName: nr.name,
      circuitName: nr.circuit,
      locality: nr.location.split(',')[0].trim(),
      country: nr.location.split(',').pop().trim(),
      date,
      time: time?.replace('Z', '') ?? null,
      resultsAvailable: false,
    },
  ];
};

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
  const race = F1_RACE_RESULTS_2026[F1_LAST_COMPLETED_ROUND];
  if (!race) throw new Error('No last F1 race data');
  return mapRacePayload(race);
};

const fallbackRaceResults = (round) => {
  const race = F1_RACE_RESULTS_2026[round];
  if (!race) throw new Error(`No F1 race results for round ${round}`);
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

const fetchLastCompletedRound = async () => {
  try {
    const raw = await jolpicaClient.get('/current/last/results.json');
    return parseInt(raw?.MRData?.RaceTable?.Races?.[0]?.round ?? 0, 10) || 0;
  } catch {
    return 0;
  }
};

// ── Public service ────────────────────────────────────────

export const getDriverStandings = async () => {
  if (!JOLPICA_F1_ENABLED) return { items: fallbackDriverStandings() };
  try {
    const items = await fetchLiveDriverStandings();
    return { items };
  } catch {
    return { items: fallbackDriverStandings() };
  }
};

export const getConstructorStandings = async () => {
  if (!JOLPICA_F1_ENABLED) return { items: fallbackConstructorStandings() };
  try {
    const items = await fetchLiveConstructorStandings();
    return { items };
  } catch {
    return { items: fallbackConstructorStandings() };
  }
};

export const getCalendar = async () => {
  if (!JOLPICA_F1_ENABLED) return { items: fallbackCalendar() };
  try {
    const [raw, lastRound] = await Promise.all([
      jolpicaClient.get('/current/races.json'),
      fetchLastCompletedRound(),
    ]);
    return { items: normalizeCalendar(raw, lastRound) };
  } catch {
    const items = fallbackCalendar();
    return {
      items: items.map((r) => ({
        ...r,
        resultsAvailable:
          F1_LAST_COMPLETED_ROUND > 0 && r.round <= F1_LAST_COMPLETED_ROUND,
      })),
    };
  }
};

export const getLastRace = async () => {
  if (!JOLPICA_F1_ENABLED) return fallbackLastRace();
  try {
    const raw = await jolpicaClient.get('/current/last/results.json');
    const data = normalizeLastRace(raw);
    if (!data) throw new Error('No last race data available');
    let imageUrl = null;
    try {
      imageUrl = await resolveLastRaceImageUrl(data);
    } catch {
      /* imagen opcional */
    }
    return { ...data, imageUrl };
  } catch {
    return fallbackLastRace();
  }
};

export const getRaceResultsByRound = async (round) => {
  const cleanRound = Number.parseInt(round, 10);
  if (!Number.isInteger(cleanRound) || cleanRound < 1) {
    throw new Error('Invalid race round');
  }

  if (!JOLPICA_F1_ENABLED) return fallbackRaceResults(cleanRound);
  try {
    const raw = await jolpicaClient.get(`/current/${cleanRound}/results.json`);
    const data = normalizeRaceResults(raw);
    if (!data) throw new Error(`No race results available for round ${cleanRound}`);
    return data;
  } catch {
    return fallbackRaceResults(cleanRound);
  }
};
