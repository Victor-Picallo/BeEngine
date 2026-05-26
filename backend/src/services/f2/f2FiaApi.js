import {
  FIA_F2_BASE_URL,
  FIA_F2_SEASON_ID,
} from '../../config/env.js';
import { createFiaFeederApi } from '../shared/fiaFeederApi.service.js';
import {
  getConstructorGridFromDb,
  getDriverGridFromDb,
} from '../../repositories/db/feeder.repository.js';

const SERIES = 'f2';

let cached = null;

export async function getF2FiaApi() {
  if (cached) return cached;
  const [driversGrid, constructorsGrid] = await Promise.all([
    getDriverGridFromDb(SERIES),
    getConstructorGridFromDb(SERIES),
  ]);
  if (!driversGrid?.length || !constructorsGrid?.length) {
    throw new Error('F2 roster vacío en DB — ejecuta npm run db:sync:f2');
  }
  cached = createFiaFeederApi({
    baseUrl: FIA_F2_BASE_URL,
    seasonId: FIA_F2_SEASON_ID,
    driversGrid,
    constructorsGrid,
  });
  return cached;
}
