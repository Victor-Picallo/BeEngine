import {
  getNewsArticles,
  getNewsArticleById,
  getNewsSummaryForHome,
} from './newsFeed.service.js';

export const getNewsByCategory = async (category, opts = {}) => {
  try {
    return await getNewsSummaryForHome(category, 4, opts);
  } catch {
    return [];
  }
};

export { getNewsArticles, getNewsArticleById };
