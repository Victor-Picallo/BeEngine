import { Router } from 'express';
import {
  getNews,
  getNewsFeed,
  getNewsArticle,
  getNewsMeta,
} from '../controllers/news.controller.js';
import { validateCategory } from '../validators/category.validator.js';

const router = Router();
router.get('/meta/tags', getNewsMeta);
router.get('/article/:articleId', getNewsArticle);
router.get('/feed/:category', validateCategory, getNewsFeed);
router.get('/:category', validateCategory, getNews);
export default router;
