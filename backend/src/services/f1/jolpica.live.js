import { jolpicaClient } from '../../external/jolpica/jolpica.client.js';
import {
  normalizeCalendar,
  normalizeConstructorStandings,
  normalizeCurrentSeasonDrivers,
  normalizeDriverStandings,
  normalizeLastRace,
  normalizeRaceResults,
} from './jolpica.normalize.js';

const enrichDriverIds = (rows, seasonDrivers) => {
  if (!seasonDrivers.length) return rows;
  const normName = (s) =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  return rows.map((row) => {
    const id = (row.driverId ?? '').trim();
    if (id && id !== 'unknown') return row;
    const jn = normName(row.driver);
    const byName = seasonDrivers.find((s) => normName(s.fullName) === jn);
    if (byName?.driverId) return { ...row, driverId: byName.driverId };
    return row;
  });
};

export const fetchLastCompletedRound = async () => {
  try {
    const raw = await jolpicaClient.get('/current/last/results.json');
    return parseInt(raw?.MRData?.RaceTable?.Races?.[0]?.round ?? 0, 10) || 0;
  } catch {
    return 0;
  }
};

export const fetchLiveCalendar = async () => {
  const [raw, lastRound] = await Promise.all([
    jolpicaClient.get('/current/races.json'),
    fetchLastCompletedRound(),
  ]);
  return normalizeCalendar(raw, lastRound);
};

export const fetchLiveDriverStandings = async () => {
  const [rawStand, rawSeasonDrivers] = await Promise.all([
    jolpicaClient.get('/current/driverStandings.json', { timeoutMs: 12_000 }),
    jolpicaClient.get('/current/drivers.json', { timeoutMs: 12_000 }).catch(() => null),
  ]);
  let items = normalizeDriverStandings(rawStand);
  if (rawSeasonDrivers) {
    items = enrichDriverIds(items, normalizeCurrentSeasonDrivers(rawSeasonDrivers));
  }
  return items;
};

export const fetchLiveConstructorStandings = async () => {
  const raw = await jolpicaClient.get('/current/constructorStandings.json', {
    timeoutMs: 12_000,
  });
  return normalizeConstructorStandings(raw);
};

export const fetchLiveLastRace = async () => {
  const raw = await jolpicaClient.get('/current/last/results.json');
  const data = normalizeLastRace(raw);
  if (!data) throw new Error('No last race data available');
  return data;
};

export const fetchLiveRaceResultsByRound = async (round) => {
  const raw = await jolpicaClient.get(`/current/${round}/results.json`);
  const data = normalizeRaceResults(raw);
  if (!data) throw new Error(`No race results available for round ${round}`);
  return data;
};
