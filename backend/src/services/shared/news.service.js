import { findNewsByCategory } from '../../repositories/news.repository.js';
import {
  getNewsArticles,
  getNewsArticleById,
  getNewsSummaryForHome,
} from './newsFeed.service.js';

export const getNewsByCategory = async (category) => {
  try {
    const live = await getNewsSummaryForHome(category, 4);
    if (live.length) return live;
  } catch {
    /* fallback estático */
  }
  return findNewsByCategory(category);
};

export { getNewsArticles, getNewsArticleById };
