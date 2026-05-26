import { getHomeByCategory } from '../services/shared/home.service.js';
import { success, error } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/http.js';

export const getHome = async (req, res) => {
  try {
    const data = await getHomeByCategory(req.params.category);
    if (!data) return error(res, 'Category data not found', HTTP_STATUS.NOT_FOUND);
    success(res, data);
  } catch (e) {
    error(res, e.message ?? 'Home unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
};
