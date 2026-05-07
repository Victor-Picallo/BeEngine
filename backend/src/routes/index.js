import { Router } from 'express';
import healthRoutes     from './health.routes.js';
import categoriesRoutes from './categories.routes.js';
import homeRoutes       from './home.routes.js';
import newsRoutes       from './news.routes.js';
import calendarRoutes   from './calendar.routes.js';

const router = Router();

router.use('/health',     healthRoutes);
router.use('/categories', categoriesRoutes);
router.use('/home',       homeRoutes);
router.use('/news',       newsRoutes);
router.use('/calendar',   calendarRoutes);

export default router;
