import {
  getNewsArticles,
  getNewsArticleById,
  getNewsSummaryForHome,
} from './newsFeed.service.js';

export const getNewsByCategory = async (category) => {
  try {
    return await getNewsSummaryForHome(category, 4);
  } catch {
    return [];
  }
};

export { getNewsArticles, getNewsArticleById };
