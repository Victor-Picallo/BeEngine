import {
  getDriverStandings,
  getConstructorStandings,
  getCalendar,
  getLastRace,
  getRaceResultsByRound,
} from '../../services/f3/f3Data.service.js';
import {
  getDriverProfile,
  getDriverProfileAggregates,
} from '../../services/f3/f3DriverProfile.service.js';
import {
  getConstructorProfile,
  getConstructorProfileAggregates,
} from '../../services/f3/f3ConstructorProfile.service.js';
import { success, error } from '../../utils/response.js';

const CACHE = 'public, max-age=60, stale-while-revalidate=300';

export const driverStandings = async (req, res) => {
  try {
    const data = await getDriverStandings();
    success(res, data, 200, { 'Cache-Control': CACHE });
  } catch (err) {
    error(res, err.message);
  }
};

export const constructorStandings = async (req, res) => {
  try {
    const data = await getConstructorStandings();
    success(res, data, 200, { 'Cache-Control': CACHE });
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
    const status = /no f3 race results/i.test(err.message) ? 404 : 500;
    error(res, err.message, status);
  }
};

export const driverProfile = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.careerPage || '1', 10) || 1);
    const data = await getDriverProfile(req.params.driverId, page);
    success(res, data);
  } catch (err) {
    error(res, err.message, 404);
  }
};

export const driverProfileAggregates = async (req, res) => {
  try {
    const data = await getDriverProfileAggregates(req.params.driverId);
    success(res, data);
  } catch (err) {
    error(res, err.message, 404);
  }
};

export const constructorProfile = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.careerPage || '1', 10) || 1);
    const data = await getConstructorProfile(req.params.constructorId, page);
    success(res, data);
  } catch (err) {
    error(res, err.message, 404);
  }
};

export const constructorProfileAggregates = async (req, res) => {
  try {
    const data = await getConstructorProfileAggregates(req.params.constructorId);
    success(res, data);
  } catch (err) {
    error(res, err.message, 404);
  }
};
