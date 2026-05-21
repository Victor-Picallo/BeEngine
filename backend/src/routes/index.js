import { Router } from 'express';
import healthRoutes     from './health.routes.js';
import categoriesRoutes from './categories.routes.js';
import homeRoutes       from './home.routes.js';
import newsRoutes       from './news.routes.js';
import calendarRoutes   from './calendar.routes.js';
import f1Routes         from './f1.routes.js';
import f2Routes         from './f2.routes.js';
import f3Routes         from './f3.routes.js';
import motogpRoutes     from './motogp.routes.js';

const router = Router();

router.use('/health',     healthRoutes);
router.use('/categories', categoriesRoutes);
router.use('/home',       homeRoutes);
router.use('/news',       newsRoutes);
router.use('/calendar',   calendarRoutes);
router.use('/f1',         f1Routes);
/** Compat: clientes que aún llaman `/api/jolpica/*` en lugar de `/api/f1/jolpica/*`. */
router.use('/jolpica',    f1Routes);
router.use('/f2',         f2Routes);
router.use('/f3',         f3Routes);
router.use('/motogp',     motogpRoutes);

export default router;
