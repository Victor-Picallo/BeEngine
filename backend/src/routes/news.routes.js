import { Router } from 'express';
import { getNews } from '../controllers/news.controller.js';
import { validateCategory } from '../validators/category.validator.js';

const router = Router();
router.get('/:category', validateCategory, getNews);
export default router;
