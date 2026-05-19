import { Router } from 'express';
import {
  driverStandings,
  constructorStandings,
  calendar,
  lastRace,
  raceResults,
  driverProfile,
  driverProfileAggregates,
  constructorProfile,
  constructorProfileAggregates,
} from '../controllers/f2Jolpica.controller.js';

const router = Router();

router.get('/jolpica/driver-standings', driverStandings);
router.get('/jolpica/drivers/:driverId/profile', driverProfile);
router.get('/jolpica/drivers/:driverId/profile/aggregates', driverProfileAggregates);
router.get('/jolpica/constructors/:constructorId/profile', constructorProfile);
router.get('/jolpica/constructors/:constructorId/profile/aggregates', constructorProfileAggregates);
router.get('/jolpica/constructor-standings', constructorStandings);
router.get('/jolpica/calendar', calendar);
router.get('/jolpica/last-race', lastRace);
router.get('/jolpica/results/:round', raceResults);

export default router;
