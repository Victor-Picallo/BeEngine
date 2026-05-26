import { getHomeByCategory } from './home.service.js';

export const getCalendarByCategory = async (category) => {
  const home = await getHomeByCategory(category);
  return home?.nextRace ?? null;
};
