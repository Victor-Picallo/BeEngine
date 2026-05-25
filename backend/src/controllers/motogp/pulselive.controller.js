import {
  getDriverStandings,
  getConstructorStandings,
  getOfficialTeamsGrid,
  getCalendar,
  getLastRace,
  getNextRaceSessions,
  getRaceResultsByRound,
  getRoundSessions,
  getWeekendSessions,
  fetchLiveTimingLite,
} from '../../services/motogp/pulseLive.service.js';
import { getMotogpLiveFeed } from '../../services/motogp/motogpLiveFeed.service.js';
import { getSessionWeather } from '../../services/motogp/motogpWeather.service.js';
import { getSessionSectors } from '../../services/motogp/motogpSectors.service.js';
import {
  getDriverProfile,
  getDriverProfileAggregates,
} from '../../services/motogp/motogpDriverProfile.service.js';
import {
  getConstructorProfile,
  getConstructorProfileAggregates,
} from '../../services/motogp/motogpConstructorProfile.service.js';
import { getRidersIndex } from '../../services/motogp/motogpRiders.service.js';
import { getCircuits, getCircuitById } from '../../services/motogp/motogpCircuits.service.js';
import { getTeamsIndex } from '../../services/motogp/motogpTeams.service.js';
import { success, error } from '../../utils/response.js';

const CACHE_STANDINGS = 'public, max-age=30, stale-while-revalidate=120';
const CACHE_LIVE = 'public, max-age=3, stale-while-revalidate=8';
const CACHE_CALENDAR = 'public, max-age=60, stale-while-revalidate=300';
const CACHE_PROFILE = 'public, max-age=60, stale-while-revalidate=300';

const getCategoryId = (req) => {
  const id = req.categoryId;
  if (id === 'moto2' || id === 'moto3') return id;
  return 'motogp';
};

export const driverStandings = async (req, res) => {
  try {
    const data = await getDriverStandings(getCategoryId(req));
    success(res, data, 200, { 'Cache-Control': CACHE_STANDINGS });
  } catch (err) {
    error(res, err.message);
  }
};

export const constructorStandings = async (req, res) => {
  try {
    const data = await getConstructorStandings(getCategoryId(req));
    success(res, data, 200, { 'Cache-Control': CACHE_STANDINGS });
  } catch (err) {
    error(res, err.message);
  }
};

/** Los 11 equipos del grid (Pulse /teams) con puntos agregados al equipo oficial. */
export const officialTeamsGrid = async (req, res) => {
  try {
    const data = await getOfficialTeamsGrid(getCategoryId(req));
    success(res, data, 200, { 'Cache-Control': CACHE_STANDINGS });
  } catch (err) {
    error(res, err.message);
  }
};

export const calendar = async (_req, res) => {
  try {
    const data = await getCalendar();
    success(res, data, 200, { 'Cache-Control': CACHE_CALENDAR });
  } catch (err) {
    error(res, err.message);
  }
};

export const lastRace = async (req, res) => {
  try {
    const data = await getLastRace(getCategoryId(req));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const nextRaceSessions = async (req, res) => {
  try {
    const data = await getNextRaceSessions(getCategoryId(req));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const weekendSessions = async (req, res) => {
  try {
    const data = await getWeekendSessions(getCategoryId(req));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const roundSessions = async (req, res) => {
  try {
    const data = await getRoundSessions(req.params.round, getCategoryId(req));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const raceResults = async (req, res) => {
  try {
    const sessionKey = req.query.session ?? 'race';
    const data = await getRaceResultsByRound(req.params.round, sessionKey, getCategoryId(req));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const driverProfile = async (req, res) => {
  try {
    const data = await getDriverProfile(req.params.driverId);
    success(res, data, 200, { 'Cache-Control': CACHE_PROFILE });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return error(res, err.message, 404);
    error(res, err.message);
  }
};

export const driverProfileAggregates = async (req, res) => {
  try {
    const data = await getDriverProfileAggregates(req.params.driverId);
    success(res, data, 200, { 'Cache-Control': CACHE_PROFILE });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return error(res, err.message, 404);
    error(res, err.message);
  }
};

export const constructorProfile = async (req, res) => {
  try {
    const data = await getConstructorProfile(req.params.constructorId, {
      careerPage: req.query.careerPage,
    });
    success(res, data, 200, { 'Cache-Control': CACHE_PROFILE });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return error(res, err.message, 404);
    error(res, err.message);
  }
};

export const constructorProfileAggregates = async (req, res) => {
  try {
    const data = await getConstructorProfileAggregates(req.params.constructorId);
    success(res, data, 200, { 'Cache-Control': CACHE_PROFILE });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return error(res, err.message, 404);
    error(res, err.message);
  }
};

export const riders = async (_req, res) => {
  try {
    const idx = await getRidersIndex();
    success(res, { source: 'pulselive-motogp', items: idx.list }, 200, {
      'Cache-Control': CACHE_CALENDAR,
    });
  } catch (err) {
    error(res, err.message);
  }
};

export const circuits = async (req, res) => {
  try {
    const data = await getCircuits(req.query.seasonYear);
    success(res, data, 200, { 'Cache-Control': CACHE_CALENDAR });
  } catch (err) {
    error(res, err.message);
  }
};

export const circuitDetail = async (req, res) => {
  try {
    const data = await getCircuitById(req.params.circuitId, req.query.seasonYear);
    if (!data) return error(res, 'Circuit not found', 404);
    success(res, data, 200, { 'Cache-Control': CACHE_CALENDAR });
  } catch (err) {
    error(res, err.message);
  }
};

export const liveTiming = async (req, res) => {
  try {
    const data = await fetchLiveTimingLite(getCategoryId(req));
    success(res, data, 200, { 'Cache-Control': CACHE_LIVE });
  } catch (err) {
    error(res, err.message);
  }
};

export const liveFeed = async (req, res) => {
  try {
    const categoryId = getCategoryId(req);
    const data = await getMotogpLiveFeed(
      req.query.round,
      req.query.session ?? 'race',
      categoryId,
    );
    success(res, data, 200, { 'Cache-Control': CACHE_LIVE });
  } catch (err) {
    error(res, err.message);
  }
};

export const sessionWeather = async (req, res) => {
  try {
    const data = await getSessionWeather(
      req.query.round,
      req.query.session ?? 'race',
      getCategoryId(req),
    );
    success(res, data, 200, { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' });
  } catch (err) {
    error(res, err.message);
  }
};

export const sessionSectors = async (req, res) => {
  try {
    const data = await getSessionSectors(
      req.query.round,
      req.query.session ?? 'race',
      getCategoryId(req),
    );
    success(res, data, 200, { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=60' });
  } catch (err) {
    error(res, err.message);
  }
};

export const teams = async (req, res) => {
  try {
    const categoryId = getCategoryId(req);
    if (req.query.grid === 'official') {
      const data = await getOfficialTeamsGrid(categoryId);
      return success(res, data, 200, { 'Cache-Control': CACHE_STANDINGS });
    }
    const idx = await getTeamsIndex(req.query.seasonYear, categoryId);
    success(res, { source: 'pulselive-motogp', items: idx.list }, 200, {
      'Cache-Control': CACHE_CALENDAR,
    });
  } catch (err) {
    error(res, err.message);
  }
};
