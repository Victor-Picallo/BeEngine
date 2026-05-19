import {
  getDriverStandings,
  getConstructorStandings,
  getCalendar,
  getLastRace,
  getRaceResultsByRound,
} from '../services/f1Jolpica.service.js';
import {
  getDriverProfile,
  getDriverProfileAggregates,
} from '../services/f1JolpicaDriverProfile.service.js';
import {
  getConstructorProfile,
  getConstructorProfileAggregates,
} from '../services/f1JolpicaConstructorProfile.service.js';
import { success, error } from '../utils/response.js';

const DRIVER_STANDINGS_CACHE_CONTROL =
  'public, max-age=30, stale-while-revalidate=120';

export const driverStandings = async (req, res) => {
  try {
    const data = await getDriverStandings();
    success(res, data, 200, { 'Cache-Control': DRIVER_STANDINGS_CACHE_CONTROL });
  } catch (err) {
    error(res, err.message);
  }
};

const CONSTRUCTOR_STANDINGS_CACHE_CONTROL =
  'public, max-age=30, stale-while-revalidate=120';

export const constructorStandings = async (req, res) => {
  try {
    const data = await getConstructorStandings();
    success(res, data, 200, { 'Cache-Control': CONSTRUCTOR_STANDINGS_CACHE_CONTROL });
  } catch (err) {
    error(res, err.message);
  }
};

export const calendar = async (req, res) => {
  try {
    const data = await getCalendar();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const lastRace = async (req, res) => {
  try {
    const data = await getLastRace();
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

const DRIVER_PROFILE_CACHE_CONTROL =
  'public, max-age=60, stale-while-revalidate=300';

export const driverProfile = async (req, res) => {
  try {
    const careerPage = Math.max(1, parseInt(String(req.query.careerPage ?? '1'), 10) || 1);
    const data = await getDriverProfile(req.params.driverId, { careerPage });
    success(res, data, 200, { 'Cache-Control': DRIVER_PROFILE_CACHE_CONTROL });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return error(res, err.message, 404);
    if (err.code === 'BAD_REQUEST') return error(res, err.message, 400);
    error(res, err.message);
  }
};

const DRIVER_AGGREGATES_CACHE_CONTROL =
  'public, max-age=300, stale-while-revalidate=3600';

export const driverProfileAggregates = async (req, res) => {
  try {
    const data = await getDriverProfileAggregates(req.params.driverId);
    success(res, data, 200, { 'Cache-Control': DRIVER_AGGREGATES_CACHE_CONTROL });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return error(res, err.message, 404);
    if (err.code === 'BAD_REQUEST') return error(res, err.message, 400);
    error(res, err.message);
  }
};

const CONSTRUCTOR_PROFILE_CACHE_CONTROL =
  'public, max-age=60, stale-while-revalidate=300';

export const constructorProfile = async (req, res) => {
  try {
    const careerPage = Math.max(1, parseInt(String(req.query.careerPage ?? '1'), 10) || 1);
    const data = await getConstructorProfile(req.params.constructorId, { careerPage });
    success(res, data, 200, { 'Cache-Control': CONSTRUCTOR_PROFILE_CACHE_CONTROL });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return error(res, err.message, 404);
    if (err.code === 'BAD_REQUEST') return error(res, err.message, 400);
    error(res, err.message);
  }
};

const CONSTRUCTOR_AGGREGATES_CACHE_CONTROL =
  'public, max-age=300, stale-while-revalidate=3600';

export const constructorProfileAggregates = async (req, res) => {
  try {
    const data = await getConstructorProfileAggregates(req.params.constructorId);
    success(res, data, 200, { 'Cache-Control': CONSTRUCTOR_AGGREGATES_CACHE_CONTROL });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return error(res, err.message, 404);
    if (err.code === 'BAD_REQUEST') return error(res, err.message, 400);
    error(res, err.message);
  }
};
