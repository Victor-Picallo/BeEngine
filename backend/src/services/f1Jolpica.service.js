import { jolpicaClient } from '../external/jolpica/jolpica.client.js';
import f1Mock from '../data/f1.data.js';
import {
  getConstructorStandingsResponse,
  warmConstructorStandingsCache,
} from './f1ConstructorStandingsStore.js';
import {
  getDriverStandingsResponse,
  warmDriverStandingsCache,
} from './f1DriverStandingsStore.js';

// ── Normalizers ───────────────────────────────────────────

const normalizeCalendar = (raw) => {
  const races = raw?.MRData?.RaceTable?.Races ?? [];
  return races.map((r) => ({
    round:       parseInt(r.round),
    raceName:    r.raceName,
    circuitName: r.Circuit.circuitName,
    locality:    r.Circuit.Location.locality,
    country:     r.Circuit.Location.country,
    date:        r.date,
    time:        r.time ?? null,
  }));
};

const normalizeLastRace = (raw) => {
  const race = raw?.MRData?.RaceTable?.Races?.[0];
  if (!race) return null;
  return {
    raceName:    race.raceName,
    round:       parseInt(race.round),
    circuitName: race.Circuit.circuitName,
    date:        race.date,
    results:     (race.Results ?? []).map((r) => ({
      position: parseInt(r.position),
      driver:   `${r.Driver.givenName} ${r.Driver.familyName}`,
      team:     r.Constructor.name,
      grid:     parseInt(r.grid),
      laps:     parseInt(r.laps),
      status:   r.status,
      points:   parseFloat(r.points),
      time:     r.Time?.time ?? null,
    })),
  };
};

const normalizeRaceResults = (raw) => {
  const race = raw?.MRData?.RaceTable?.Races?.[0];
  if (!race) return null;
  return {
    raceName:    race.raceName,
    round:       parseInt(race.round),
    circuitName: race.Circuit.circuitName,
    date:        race.date,
    results:     (race.Results ?? []).map((r) => ({
      position: parseInt(r.position),
      driver:   `${r.Driver.givenName} ${r.Driver.familyName}`,
      team:     r.Constructor.name,
      grid:     parseInt(r.grid),
      laps:     parseInt(r.laps),
      status:   r.status,
      points:   parseFloat(r.points),
      time:     r.Time?.time ?? null,
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

const fallbackDriverStandings = () =>
  f1Mock.standings.map((d) => ({
    pos:         d.pos,
    driver:      d.driver,
    driverId:    MOCK_DRIVER_ID[d.driver] ?? 'unknown',
    team:        d.team,
    points:      d.points,
    wins:        0,
    nationality: d.nationality,
  }));

const fallbackConstructorStandings = () =>
  f1Mock.constructors.map((c) => ({
    pos:            c.pos,
    team:           c.team,
    constructorId: c.team
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_|_$/g, '') || 'unknown',
    points:         c.points,
    wins:           0,
    nationality:    'Unknown',
  }));

const fallbackCalendar = () => {
  const nr = f1Mock.nextRace;
  const [date, time] = nr.date.split('T');
  return [{
    round:       nr.round,
    raceName:    nr.name,
    circuitName: nr.circuit,
    locality:    nr.location.split(',')[0].trim(),
    country:     nr.location.split(',').pop().trim(),
    date,
    time:        time?.replace('Z', '') ?? null,
  }];
};

// ── Public service ────────────────────────────────────────

/** Listado de pilotos: grid local al instante; puntos vía caché Jolpica en segundo plano. */
export const getDriverStandings = async () => getDriverStandingsResponse();

/** Listado de escuderías: grid local al instante; puntos vía caché Jolpica en segundo plano. */
export const getConstructorStandings = async () => getConstructorStandingsResponse();

export { warmConstructorStandingsCache, warmDriverStandingsCache };

export const getCalendar = async () => {
  try {
    const raw = await jolpicaClient.get('/current/races.json');
    return { source: 'external', items: normalizeCalendar(raw) };
  } catch {
    return { source: 'mock', items: fallbackCalendar() };
  }
};

export const getLastRace = async () => {
  const raw = await jolpicaClient.get('/current/last/results.json');
  const data = normalizeLastRace(raw);
  if (!data) throw new Error('No last race data available');
  return { source: 'external', ...data };
};

export const getRaceResultsByRound = async (round) => {
  const cleanRound = Number.parseInt(round, 10);
  if (!Number.isInteger(cleanRound) || cleanRound < 1) {
    throw new Error('Invalid race round');
  }

  const raw = await jolpicaClient.get(`/current/${cleanRound}/results.json`);
  const data = normalizeRaceResults(raw);
  if (!data) throw new Error(`No race results available for round ${cleanRound}`);
  return { source: 'external', ...data };
};
