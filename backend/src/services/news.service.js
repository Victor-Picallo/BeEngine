import { findNewsByCategory } from '../repositories/news.repository.js';

export const getNewsByCategory = (category) => findNewsByCategory(category);
