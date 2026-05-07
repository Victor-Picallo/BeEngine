import { findHomeByCategory } from './home.repository.js';

export const findNewsByCategory = (category) => {
  const data = findHomeByCategory(category);
  return data ? data.news : null;
};
