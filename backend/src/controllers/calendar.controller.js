import { getCalendarByCategory } from '../services/calendar.service.js';
import { success, error } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/http.js';

export const getCalendar = (req, res) => {
  const { category } = req.params;
  const nextRace = getCalendarByCategory(category);
  if (!nextRace) return error(res, 'Category not found', HTTP_STATUS.NOT_FOUND);
  success(res, { category, nextRace: nextRace.name, ...nextRace });
};
