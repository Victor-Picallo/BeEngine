import { FRONTEND_URL, NODE_ENV } from '../config/env.js';

const LOCALHOST_RE = /localhost|127\.0\.0\.1/i;

export function isLocalhostUrl(url) {
  return LOCALHOST_RE.test(String(url ?? ''));
}

/** Orígenes permitidos (FRONTEND_URL o FRONTEND_URLS separados por coma). */
const configuredOrigins = (process.env.FRONTEND_URLS || FRONTEND_URL || 'http://localhost:4200')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

/** En producción nunca se usa localhost como origen del frontend. */
export const FRONTEND_ORIGINS =
  NODE_ENV === 'production'
    ? configuredOrigins.filter((u) => !isLocalhostUrl(u))
    : configuredOrigins;

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');

  if (NODE_ENV === 'production' && isLocalhostUrl(normalized)) {
    return false;
  }

  if (FRONTEND_ORIGINS.includes(normalized)) return true;

  if (NODE_ENV === 'development') {
    return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(normalized);
  }

  return false;
}

/**
 * URL de retorno OAuth para el cliente.
 * En producción: solo Origin público o FRONTEND_URL(S) sin localhost.
 */
export function resolveOAuthRedirectUrl(req) {
  const origin = req?.headers?.origin?.replace(/\/$/, '');

  if (origin && isAllowedOrigin(origin)) {
    return origin;
  }

  if (FRONTEND_ORIGINS.length > 0) {
    return FRONTEND_ORIGINS[0];
  }

  if (NODE_ENV === 'production') {
    return '';
  }

  return configuredOrigins[0] || 'http://localhost:4200';
}
