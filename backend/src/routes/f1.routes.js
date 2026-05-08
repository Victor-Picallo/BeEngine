import { Router } from 'express';
import {
  driverStandings,
  constructorStandings,
  calendar,
  lastRace,
} from '../controllers/f1Jolpica.controller.js';
import {
  sessions,
  drivers,
  positions,
  weather,
} from '../controllers/f1OpenF1.controller.js';

const router = Router();

router.get('/jolpica/driver-standings',    driverStandings);
router.get('/jolpica/constructor-standings', constructorStandings);
router.get('/jolpica/calendar',            calendar);
router.get('/jolpica/last-race',           lastRace);

router.get('/openf1/sessions',  sessions);
router.get('/openf1/drivers',   drivers);
router.get('/openf1/position',  positions);
router.get('/openf1/weather',   weather);

export default router;
