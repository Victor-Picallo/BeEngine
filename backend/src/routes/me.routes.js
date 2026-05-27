import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { getProfile, postBootstrap } from '../controllers/me.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/', getProfile);
router.post('/bootstrap', postBootstrap);
export default router;
