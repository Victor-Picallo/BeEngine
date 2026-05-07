import { findHomeByCategory } from './home.repository.js';

export const findCalendarByCategory = (category) => {
  const data = findHomeByCategory(category);
  return data ? data.nextRace : null;
};
