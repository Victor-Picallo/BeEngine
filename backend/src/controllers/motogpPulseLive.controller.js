import {
  getDriverStandings,
  getConstructorStandings,
  getCalendar,
  getLastRace,
  getNextRaceSessions,
  getRaceResultsByRound,
  getWeekendSessions,
} from '../services/motogpPulseLive.service.js';
import {
  getDriverProfile,
  getDriverProfileAggregates,
} from '../services/motogp/motogpDriverProfile.service.js';
import {
  getConstructorProfile,
  getConstructorProfileAggregates,
} from '../services/motogp/motogpConstructorProfile.service.js';
import { getRidersIndex } from '../services/motogp/motogpRiders.service.js';
import { getCircuits, getCircuitById } from '../services/motogp/motogpCircuits.service.js';
import { getTeamsIndex } from '../services/motogp/motogpTeams.service.js';
import { success, error } from '../utils/response.js';

const CACHE_STANDINGS = 'public, max-age=30, stale-while-revalidate=120';
const CACHE_CALENDAR = 'public, max-age=60, stale-while-revalidate=300';
const CACHE_PROFILE = 'public, max-age=60, stale-while-revalidate=300';

export const driverStandings = async (_req, res) => {
  try {
    const data = await getDriverStandings();
    success(res, data, 200, { 'Cache-Control': CACHE_STANDINGS });
  } catch (err) {
    error(res, err.message);
  }
};

export const constructorStandings = async (_req, res) => {
  try {
    const data = await getConstructorStandings();
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

export const lastRace = async (_req, res) => {
  try {
    const data = await getLastRace();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const nextRaceSessions = async (_req, res) => {
  try {
    const data = await getNextRaceSessions();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const weekendSessions = async (_req, res) => {
  try {
    const data = await getWeekendSessions();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const raceResults = async (req, res) => {
  try {
    const data = await getRaceResultsByRound(req.params.round);
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
    const data = await getConstructorProfile(req.params.constructorId);
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

export const teams = async (req, res) => {
  try {
    const idx = await getTeamsIndex(req.query.seasonYear);
    success(res, { source: 'pulselive-motogp', items: idx.list }, 200, {
      'Cache-Control': CACHE_CALENDAR,
    });
  } catch (err) {
    error(res, err.message);
  }
};
