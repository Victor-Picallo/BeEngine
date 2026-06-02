import { ASSIST_RATE_LIMIT_PER_MIN } from '../config/env.js';

const buckets = new Map();

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/** Límite simple en memoria por IP. */
export function assistRateLimit(req, res, next) {
  const limit = Math.max(ASSIST_RATE_LIMIT_PER_MIN, 1);
  const key = clientKey(req);
  const now = Date.now();
  const windowMs = 60_000;

  let entry = buckets.get(key);
  if (!entry || now - entry.start >= windowMs) {
    entry = { start: now, count: 0 };
    buckets.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > limit) {
    return res.status(429).json({
      success: false,
      error: 'Demasiadas preguntas. Espera un minuto e inténtalo de nuevo.',
    });
  }

  next();
}
