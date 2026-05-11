import {
  getDriverStandings,
  getConstructorStandings,
  getCalendar,
  getLastRace,
  getRaceResultsByRound,
} from '../services/f1Jolpica.service.js';
import { success, error } from '../utils/response.js';

export const driverStandings = async (req, res) => {
  try {
    const data = await getDriverStandings();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const constructorStandings = async (req, res) => {
  try {
    const data = await getConstructorStandings();
    success(res, data);
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
