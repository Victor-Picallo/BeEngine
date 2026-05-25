import { VALID_CATEGORIES } from '../data/shared/categories.data.js';
import { NEWS_FEEDS_BY_CATEGORY } from '../data/shared/newsFeeds.config.js';

const VALID_NEWS_CATEGORIES = [
  ...new Set([...VALID_CATEGORIES, ...Object.keys(NEWS_FEEDS_BY_CATEGORY)]),
];

export const validateCategory = (req, res, next) => {
  const { category } = req.params;
  if (!VALID_NEWS_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      error: `Invalid category '${category}'. Valid: ${VALID_NEWS_CATEGORIES.join(', ')}`,
    });
  }
  next();
};
