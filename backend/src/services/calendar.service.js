import { findCalendarByCategory } from '../repositories/calendar.repository.js';

export const getCalendarByCategory = (category) => findCalendarByCategory(category);
