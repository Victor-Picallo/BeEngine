import { Router } from 'express';
import { getAuthConfig } from '../controllers/auth.controller.js';

const router = Router();
router.get('/config', getAuthConfig);
export default router;
