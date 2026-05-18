import { Router } from 'express';
import {
  driverStandings,
  constructorStandings,
  calendar,
  lastRace,
  raceResults,
  driverProfile,
  constructorProfile,
} from '../controllers/f1Jolpica.controller.js';
import {
  sessions,
  drivers,
  positions,
  weather,
  laps,
  intervals,
  stints,
  raceControl,
  teamRadio,
  location,
} from '../controllers/f1OpenF1.controller.js';

const router = Router();

router.get('/jolpica/driver-standings',    driverStandings);
router.get('/jolpica/drivers/:driverId/profile', driverProfile);
router.get('/jolpica/constructors/:constructorId/profile', constructorProfile);
router.get('/jolpica/constructor-standings', constructorStandings);
router.get('/jolpica/calendar',            calendar);
router.get('/jolpica/last-race',           lastRace);
router.get('/jolpica/results/:round',      raceResults);

router.get('/openf1/sessions',      sessions);
router.get('/openf1/drivers',       drivers);
router.get('/openf1/position',      positions);
router.get('/openf1/weather',       weather);
router.get('/openf1/laps',          laps);
router.get('/openf1/intervals',     intervals);
router.get('/openf1/stints',        stints);
router.get('/openf1/race-control',  raceControl);
router.get('/openf1/team-radio',    teamRadio);
router.get('/openf1/location',      location);

export default router;
