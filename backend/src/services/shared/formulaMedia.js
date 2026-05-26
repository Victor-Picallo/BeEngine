import { f1TeamCarImageUrl, f1TeamShowcaseImageUrl } from '../f1/teamMedia.js';
import {
  F2_DRIVER_HEADSHOT_URL,
  F2_TEAM_CAR_URL,
  F2_TEAM_LOGO_URL,
} from '../../data/f2/f2MediaAssets.js';
import {
  F3_DRIVER_HEADSHOT_URL,
  F3_TEAM_CAR_URL,
  F3_TEAM_LOGO_URL,
} from '../../data/f3/f3MediaAssets.js';

const idKey = (s) => (s || '').trim().toLowerCase();

const FEEDER_MAPS = {
  f2: {
    logo: F2_TEAM_LOGO_URL,
    car: F2_TEAM_CAR_URL,
    headshot: F2_DRIVER_HEADSHOT_URL,
  },
  f3: {
    logo: F3_TEAM_LOGO_URL,
    car: F3_TEAM_CAR_URL,
    headshot: F3_DRIVER_HEADSHOT_URL,
  },
};

/** @param {string | null | undefined} dbUrl */
/** @param {string} seriesId */
/** @param {string} entityId */
/** @param {'logo' | 'car' | 'headshot'} kind */
export function resolveFormulaMediaUrl(seriesId, entityId, kind, dbUrl) {
  if (dbUrl) return dbUrl;
  const id = idKey(entityId);
  if (!id) return null;

  if (seriesId === 'f1') {
    if (kind === 'logo') return f1TeamShowcaseImageUrl(id);
    if (kind === 'car') return f1TeamCarImageUrl(id);
    return null;
  }

  const maps = FEEDER_MAPS[seriesId];
  if (!maps) return null;
  if (kind === 'logo') return maps.logo[id] ?? null;
  if (kind === 'car') return maps.car[id] ?? null;
  return maps.headshot[id] ?? null;
}
