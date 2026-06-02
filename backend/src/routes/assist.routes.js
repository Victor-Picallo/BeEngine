import { Router } from 'express';
import {
  getAssistSnapshots,
  getAssistStatus,
  postAssistChat,
  postAssistSnapshot,
} from '../controllers/assist.controller.js';
import { assistRateLimit } from '../middlewares/assistRateLimit.middleware.js';

const router = Router();

router.get('/status', getAssistStatus);
router.post('/chat', assistRateLimit, postAssistChat);
router.get('/snapshots', getAssistSnapshots);
router.post('/snapshots', postAssistSnapshot);

export default router;
