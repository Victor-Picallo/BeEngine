import { getLandingFromDb } from '../services/shared/landing.service.js';
import { success } from '../utils/response.js';

export const getLanding = async (_req, res, next) => {
  try {
    const data = await getLandingFromDb();
    success(res, data);
  } catch (err) {
    next(err);
  }
};
