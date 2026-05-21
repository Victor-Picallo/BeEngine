import { TOPBAR_CATEGORIES } from '../data/categories.data.js';
import { success } from '../utils/response.js';

export const getCategories = (_req, res) => success(res, TOPBAR_CATEGORIES);
