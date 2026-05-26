/**
 * Enriquecimiento UI Moto3 (logos, retratos) — datos de temporada en DB.
 */
import { MOTO3_DRIVER_PORTRAIT_URL } from '../../data/moto3/moto3DriverPortraits.js';
import { MOTO3_TEAM_ASSETS } from '../../data/moto3/moto3TeamAssets.js';
import { resolveMoto3TeamLogoUrl } from '../../data/moto3/moto3TeamLogos.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

const enrichDriverRow = (row) => {
  const assets = row.constructorId ? MOTO3_TEAM_ASSETS[row.constructorId] : null;
  const logoUrl =
    toPublicMediaUrl(row.logoUrl) ??
    resolveMoto3TeamLogoUrl(row.teamId, row.constructorId, row.team);
  return {
    ...row,
    headshotUrl: row.headshotUrl ?? MOTO3_DRIVER_PORTRAIT_URL[row.driverId] ?? null,
    teamColor: row.teamColor ?? assets?.teamColor ?? null,
    logoUrl: logoUrl ?? assets?.logoUrl ?? null,
    bikeImageUrl: row.bikeImageUrl ?? assets?.bikeImageUrl ?? null,
  };
};

const enrichTeamRow = (row) => {
  const assets = MOTO3_TEAM_ASSETS[row.constructorId] ?? null;
  return {
    ...row,
    teamColor: row.teamColor ?? assets?.teamColor ?? null,
    logoUrl:
      toPublicMediaUrl(row.logoUrl) ??
      resolveMoto3TeamLogoUrl(row.teamId, row.constructorId, row.team) ??
      assets?.logoUrl ??
      null,
    bikeImageUrl: row.bikeImageUrl ?? assets?.bikeImageUrl ?? null,
  };
};

export const enrichMoto3DriverStandings = (items) => (items ?? []).map(enrichDriverRow);

export const enrichMoto3TeamStandings = (items) => (items ?? []).map(enrichTeamRow);

export { MOTO3_DRIVER_PORTRAIT_URL };
