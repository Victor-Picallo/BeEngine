import {
  FIA_F3_BASE_URL,
  FIA_F3_SEASON_ID,
} from '../../config/env.js';
import { createFiaFeederApi } from '../shared/fiaFeederApi.service.js';
import {
  getConstructorGridFromDb,
  getDriverGridFromDb,
} from '../../repositories/db/feeder.repository.js';

const SERIES = 'f3';

let cached = null;

export async function getF3FiaApi() {
  if (cached) return cached;
  const [driversGrid, constructorsGrid] = await Promise.all([
    getDriverGridFromDb(SERIES),
    getConstructorGridFromDb(SERIES),
  ]);
  if (!driversGrid?.length || !constructorsGrid?.length) {
    throw new Error('F3 roster vacío en DB — ejecuta npm run db:sync:f3');
  }
  cached = createFiaFeederApi({
    baseUrl: FIA_F3_BASE_URL,
    seasonId: FIA_F3_SEASON_ID,
    driversGrid,
    constructorsGrid,
  });
  return cached;
}
