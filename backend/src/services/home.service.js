import { findHomeByCategory } from '../repositories/home.repository.js';

export const getHomeByCategory = (category) => findHomeByCategory(category);
