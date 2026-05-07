import { Router } from 'express';
import { getHome } from '../controllers/home.controller.js';
import { validateCategory } from '../validators/category.validator.js';

const router = Router();
router.get('/:category', validateCategory, getHome);
export default router;
