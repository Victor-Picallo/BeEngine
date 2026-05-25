import { Router } from 'express';
import {
  driverStandings,
  constructorStandings,
  officialTeamsGrid,
  calendar,
  lastRace,
  nextRaceSessions,
  weekendSessions,
  roundSessions,
  raceResults,
  riders,
  circuits,
  circuitDetail,
  teams,
} from '../controllers/motogpPulseLive.controller.js';

const router = Router();

router.use((req, _res, next) => {
  req.categoryId = 'moto2';
  next();
});

router.get('/pulselive/driver-standings', driverStandings);
router.get('/pulselive/constructor-standings', constructorStandings);
router.get('/pulselive/official-teams', officialTeamsGrid);
router.get('/pulselive/calendar', calendar);
router.get('/pulselive/last-race', lastRace);
router.get('/pulselive/next-race', nextRaceSessions);
router.get('/pulselive/sessions', weekendSessions);
router.get('/pulselive/results/:round/sessions', roundSessions);
router.get('/pulselive/results/:round', raceResults);
router.get('/pulselive/riders', riders);
router.get('/pulselive/circuits', circuits);
router.get('/pulselive/circuits/:circuitId', circuitDetail);
router.get('/pulselive/teams', teams);

export default router;
