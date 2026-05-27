/**
 * Enriquecimiento UI Moto3 — medios desde DB (Supabase).
 */
import { MOTO3_DRIVERS_GRID_2026 } from '../../data/moto3/moto3DriversGrid2026.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

export const findMoto3DriverGrid = (driverId) => {
  const id = String(driverId || '').trim();
  const row = MOTO3_DRIVERS_GRID_2026.find((d) => d.driverId === id);
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

export const enrichMoto3DriverStandings = (items) =>
  (items ?? []).map(enrichDriverRow);

export const enrichMoto3TeamStandings = (items) => (items ?? []).map(enrichTeamRow);
