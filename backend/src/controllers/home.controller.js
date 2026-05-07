import { getHomeByCategory } from '../services/home.service.js';
import { success, error } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/http.js';

export const getHome = (req, res) => {
  const data = getHomeByCategory(req.params.category);
  if (!data) return error(res, 'Category data not found', HTTP_STATUS.NOT_FOUND);
  success(res, data);
};
