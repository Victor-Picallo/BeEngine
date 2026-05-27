/**
 * Enriquecimiento UI Moto2 — medios desde DB (Supabase).
 */
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

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
