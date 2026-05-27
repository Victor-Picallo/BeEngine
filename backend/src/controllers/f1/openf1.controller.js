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
import { OpenF1HttpError } from '../../external/openf1/openf1.client.js';
import { success, error } from '../../utils/response.js';

const openF1Status = (err) => {
  if (err instanceof OpenF1HttpError) {
    if (err.statusCode === 429) return 429;
    if (err.statusCode >= 500) return 503;
  }
  return 500;
};

const handle =
  (fn) =>
  async (req, res) => {
    try {
      success(res, await fn(req, res));
    } catch (err) {
      error(res, err.message, openF1Status(err));
    }
  };

// OpenF1 accepts numeric session keys or the literal "latest" alias.
const parseSessionKey = (raw) => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (raw === 'latest') return 'latest';
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

export const sessions = handle(async () => getSessions());

export const drivers = handle(async (req) =>
  getDrivers(parseSessionKey(req.query.session_key)),
);

export const positions = handle(async (req) =>
  getPositions(parseSessionKey(req.query.session_key)),
);

export const weather = handle(async (req) =>
  getWeather(parseSessionKey(req.query.session_key)),
);

export const laps = handle(async (req) => getLaps(parseSessionKey(req.query.session_key)));

export const intervals = handle(async (req) =>
  getIntervals(parseSessionKey(req.query.session_key)),
);

export const stints = handle(async (req) => getStints(parseSessionKey(req.query.session_key)));

export const raceControl = handle(async (req) =>
  getRaceControl(parseSessionKey(req.query.session_key)),
);

export const teamRadio = handle(async (req) =>
  getTeamRadio(parseSessionKey(req.query.session_key)),
);

export const location = handle(async (req) => {
  const driver = req.query.driver ? Number(req.query.driver) : 1;
  return getLocation(driver, parseSessionKey(req.query.session_key));
});
