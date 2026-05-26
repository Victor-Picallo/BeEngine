import { getCalendarByCategory } from '../services/shared/calendar.service.js';
import { success, error } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/http.js';

export const getCalendar = async (req, res) => {
  try {
    const { category } = req.params;
    const nextRace = await getCalendarByCategory(category);
    if (!nextRace) return error(res, 'Category not found', HTTP_STATUS.NOT_FOUND);
    success(res, { category, nextRace: nextRace.name, ...nextRace });
  } catch (e) {
    error(res, e.message ?? 'Calendar unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
};
