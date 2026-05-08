import {
  getSessions,
  getDrivers,
  getPositions,
  getWeather,
  getLaps,
  getIntervals,
  getStints,
  getRaceControl,
  getTeamRadio,
  getLocation,
} from '../services/f1OpenF1.service.js';
import { success, error } from '../utils/response.js';

export const sessions = async (req, res) => {
  try {
    const data = await getSessions();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const drivers = async (req, res) => {
  try {
    const data = await getDrivers();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const positions = async (req, res) => {
  try {
    const data = await getPositions();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const weather = async (req, res) => {
  try {
    const data = await getWeather();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const laps = async (req, res) => {
  try {
    const data = await getLaps();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const intervals = async (req, res) => {
  try {
    const data = await getIntervals();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const stints = async (req, res) => {
  try {
    const data = await getStints();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const raceControl = async (req, res) => {
  try {
    const data = await getRaceControl();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const teamRadio = async (req, res) => {
  try {
    const data = await getTeamRadio();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const location = async (req, res) => {
  try {
    const driver = req.query.driver ? Number(req.query.driver) : 1;
    const data = await getLocation(driver);
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};
