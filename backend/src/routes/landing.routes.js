import { Router } from 'express';
import { getLanding } from '../controllers/landing.controller.js';

const router = Router();

router.get('/', getLanding);

export default router;
