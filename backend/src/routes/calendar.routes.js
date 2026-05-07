import { Router } from 'express';
import { getCalendar } from '../controllers/calendar.controller.js';
import { validateCategory } from '../validators/category.validator.js';

const router = Router();
router.get('/:category', validateCategory, getCalendar);
export default router;
