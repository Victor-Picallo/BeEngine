import { getNewsByCategory } from '../services/news.service.js';
import { success, error } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/http.js';

export const getNews = (req, res) => {
  const { category } = req.params;
  const items = getNewsByCategory(category);
  if (!items) return error(res, 'Category not found', HTTP_STATUS.NOT_FOUND);
  success(res, { category, total: items.length, items });
};
