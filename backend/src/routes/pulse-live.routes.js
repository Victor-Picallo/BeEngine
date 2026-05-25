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
  driverProfile,
  driverProfileAggregates,
  constructorProfile,
  constructorProfileAggregates,
  riders,
  circuits,
  circuitDetail,
  teams,
  liveTiming,
  liveFeed,
  sessionWeather,
  sessionSectors,
} from '../controllers/motogp/pulselive.controller.js';

/** Rutas Pulse Live compartidas por MotoGP / Moto2 / Moto3. */
export function createPulseLiveRouter(categoryId) {
  const router = Router();

  if (categoryId) {
    router.use((req, _res, next) => {
      req.categoryId = categoryId;
      next();
    });
  }

  router.get('/pulselive/driver-standings', driverStandings);
  router.get('/pulselive/constructor-standings', constructorStandings);
  router.get('/pulselive/official-teams', officialTeamsGrid);
  router.get('/pulselive/calendar', calendar);
  router.get('/pulselive/last-race', lastRace);
  router.get('/pulselive/next-race', nextRaceSessions);
  router.get('/pulselive/live-timing', liveTiming);
  router.get('/pulselive/live-feed', liveFeed);
  router.get('/pulselive/session-weather', sessionWeather);
  router.get('/pulselive/session-sectors', sessionSectors);
  router.get('/pulselive/sessions', weekendSessions);
  router.get('/pulselive/results/:round/sessions', roundSessions);
  router.get('/pulselive/results/:round', raceResults);
  router.get('/pulselive/drivers/:driverId/profile', driverProfile);
  router.get('/pulselive/drivers/:driverId/profile/aggregates', driverProfileAggregates);
  router.get('/pulselive/constructors/:constructorId/profile', constructorProfile);
  router.get('/pulselive/constructors/:constructorId/profile/aggregates', constructorProfileAggregates);
  router.get('/pulselive/riders', riders);
  router.get('/pulselive/circuits', circuits);
  router.get('/pulselive/circuits/:circuitId', circuitDetail);
  router.get('/pulselive/teams', teams);

  return router;
}
