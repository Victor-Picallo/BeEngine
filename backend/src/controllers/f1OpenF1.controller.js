import {
  getSessions,
  getDrivers,
  getPositions,
  getWeather,
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
