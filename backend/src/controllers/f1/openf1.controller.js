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
} from '../../services/f1/openf1.service.js';
import { success, error } from '../../utils/response.js';

// OpenF1 accepts numeric session keys or the literal "latest" alias.
const parseSessionKey = (raw) => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (raw === 'latest') return 'latest';
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

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
    const data = await getDrivers(parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const positions = async (req, res) => {
  try {
    const data = await getPositions(parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const weather = async (req, res) => {
  try {
    const data = await getWeather(parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const laps = async (req, res) => {
  try {
    const data = await getLaps(parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const intervals = async (req, res) => {
  try {
    const data = await getIntervals(parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const stints = async (req, res) => {
  try {
    const data = await getStints(parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const raceControl = async (req, res) => {
  try {
    const data = await getRaceControl(parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const teamRadio = async (req, res) => {
  try {
    const data = await getTeamRadio(parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};

export const location = async (req, res) => {
  try {
    const driver = req.query.driver ? Number(req.query.driver) : 1;
    const data = await getLocation(driver, parseSessionKey(req.query.session_key));
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
};
