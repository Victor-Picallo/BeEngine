/**
 * Enriquecimiento UI Moto2 (logos, retratos) — datos de temporada en DB.
 */
import { MOTO2_DRIVER_PORTRAIT_URL } from '../../data/moto2/moto2DriverPortraits.js';
import { MOTO2_TEAM_ASSETS } from '../../data/moto2/moto2TeamAssets.js';
import { resolveMoto2TeamLogoUrl } from '../../data/moto2/moto2TeamLogos.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

const enrichDriverRow = (row) => {
  const assets = row.constructorId ? MOTO2_TEAM_ASSETS[row.constructorId] : null;
  const logoUrl =
    toPublicMediaUrl(row.logoUrl) ??
    resolveMoto2TeamLogoUrl(
      row.constructorId,
      row.teamId ?? null,
      null,
      row.team,
    );
  return {
    ...row,
    headshotUrl: row.headshotUrl ?? MOTO2_DRIVER_PORTRAIT_URL[row.driverId] ?? null,
    teamColor: row.teamColor ?? assets?.teamColor ?? null,
    logoUrl: logoUrl ?? assets?.logoUrl ?? null,
    bikeImageUrl: row.bikeImageUrl ?? assets?.bikeImageUrl ?? null,
  };
};

const enrichTeamRow = (row) => {
  const assets = MOTO2_TEAM_ASSETS[row.constructorId] ?? null;
  return {
    ...row,
    teamColor: row.teamColor ?? assets?.teamColor ?? null,
    logoUrl:
      toPublicMediaUrl(row.logoUrl) ??
      resolveMoto2TeamLogoUrl(row.constructorId, row.teamId, null, row.team) ??
      assets?.logoUrl ??
      null,
    bikeImageUrl: row.bikeImageUrl ?? assets?.bikeImageUrl ?? null,
  };
};

export const enrichMoto2DriverStandings = (items) =>
  (items ?? []).map(enrichDriverRow);

export const enrichMoto2TeamStandings = (items) => (items ?? []).map(enrichTeamRow);

export { MOTO2_DRIVER_PORTRAIT_URL };
