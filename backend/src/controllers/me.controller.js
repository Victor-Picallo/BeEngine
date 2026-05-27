import { success, error } from '../utils/response.js';
import { bootstrapProfile, getMe } from '../services/auth/userProfile.service.js';

export const getProfile = async (req, res) => {
  try {
    const data = await getMe(req.authUser);
    success(res, data);
  } catch (e) {
    error(res, e.message, e.status ?? 500);
  }
};

export const postBootstrap = async (req, res) => {
  try {
    const data = await bootstrapProfile(req.authUser, req.body ?? {});
    success(res, data);
  } catch (e) {
    error(res, e.message, e.status ?? 500);
  }
};
