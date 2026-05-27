/**
 * Enriquecimiento UI Moto2 — medios desde DB (Supabase).
 */
import { MOTO2_DRIVERS_GRID_2026 } from '../../data/moto2/moto2DriversGrid2026.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

export const findMoto2DriverGrid = (driverId) => {
  const id = String(driverId || '').trim();
  const row = MOTO2_DRIVERS_GRID_2026.find((d) => d.driverId === id);
  if (!row) return null;
  return {
    ...row,
    headshotUrl: toPublicMediaUrl(row.headshotUrl) ?? row.headshotUrl ?? null,
  };
};

const enrichDriverRow = (row) => ({
  ...row,
  headshotUrl: toPublicMediaUrl(row.headshotUrl) ?? null,
  teamColor: row.teamColor ?? null,
  logoUrl: toPublicMediaUrl(row.logoUrl) ?? null,
  bikeImageUrl: toPublicMediaUrl(row.bikeImageUrl) ?? null,
});

const enrichTeamRow = (row) => ({
  ...row,
  teamColor: row.teamColor ?? null,
  logoUrl: toPublicMediaUrl(row.logoUrl) ?? null,
  bikeImageUrl: toPublicMediaUrl(row.bikeImageUrl) ?? null,
});

export const enrichMoto2DriverStandings = (items) =>
  (items ?? []).map(enrichDriverRow);

export const enrichMoto2TeamStandings = (items) => (items ?? []).map(enrichTeamRow);
