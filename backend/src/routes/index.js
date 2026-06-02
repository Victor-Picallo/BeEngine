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
import moto2Routes      from './moto2.routes.js';
import moto3Routes      from './moto3.routes.js';
import authRoutes       from './auth.routes.js';
import meRoutes         from './me.routes.js';
import assistRoutes     from './assist.routes.js';
import landingRoutes    from './landing.routes.js';

const router = Router();

router.use('/health',     healthRoutes);
router.use('/auth',       authRoutes);
router.use('/me',         meRoutes);
router.use('/assist',     assistRoutes);
router.use('/categories', categoriesRoutes);
router.use('/landing',    landingRoutes);
router.use('/home',       homeRoutes);
router.use('/news',       newsRoutes);
router.use('/calendar',   calendarRoutes);
router.use('/f1',         f1Routes);
/** Compat: clientes que aún llaman `/api/jolpica/*` en lugar de `/api/f1/jolpica/*`. */
router.use('/jolpica',    f1Routes);
router.use('/f2',         f2Routes);
router.use('/f3',         f3Routes);
router.use('/motogp',     motogpRoutes);
router.use('/moto2',      moto2Routes);
router.use('/moto3',      moto3Routes);

export default router;
