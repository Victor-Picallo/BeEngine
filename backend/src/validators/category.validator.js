import { VALID_CATEGORIES } from '../data/categories.data.js';

export const validateCategory = (req, res, next) => {
  const { category } = req.params;
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      error: `Invalid category '${category}'. Valid: ${VALID_CATEGORIES.join(', ')}`,
    });
  }
  next();
};
