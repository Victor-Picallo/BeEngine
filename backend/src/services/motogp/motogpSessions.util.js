/** Claves de sesión en URL (paridad con tabs F1 / home MotoGP). */

export const SESSION_LABELS = {
  FP: 'FP',
  PR: 'PRACTICE',
  Q: 'QUALY',
  SPR: 'SPRINT',
  WUP: 'WARM-UP',
  RAC: 'RACE',
};

export const pulseSessionLabel = (s) => {
  const base = SESSION_LABELS[s?.type] ?? s?.type ?? '—';
  if (s?.type === 'FP' && s?.number) return `FP${s.number}`;
  if (s?.type === 'Q' && s?.number) return s.number > 1 ? 'Q2' : 'Q1';
  if (s?.type === 'RAC') return 'RACE';
  return base;
};

/** @param {import('../../external/motogp/pulselive.client.js').unknown} s */
export const pulseSessionToKey = (s) => {
  if (!s) return 'race';
  if (s.type === 'FP') return s.number === 2 ? 'fp2' : 'fp1';
  if (s.type === 'PR') return 'practice';
  if (s.type === 'Q') return s.number > 1 ? 'q2' : 'q1';
  if (s.type === 'SPR') return 'sprint';
  if (s.type === 'WUP') return 'warmup';
  if (s.type === 'RAC') return 'race';
  return String(s.type || 'race').toLowerCase();
};

export const resolvePulseSession = (sessions, sessionKey) => {
  const key = String(sessionKey || 'race').toLowerCase();
  // Use findLast so that when a race is red-flagged and restarted (two RAC sessions),
  // we always return the final/restart session, not the interrupted one.
  const matches = sessions.filter((s) => pulseSessionToKey(s) === key);
  return matches.length ? matches[matches.length - 1] : null;
};

const FINISHED_STATUSES = new Set(['FINISHED', 'OFFICIAL']);
const LIVE_STATUSES = new Set(['LIVE', 'RUNNING', 'ON_TRACK', 'IN_PROGRESS', 'STARTED', 'ACTIVE']);

/** Resultados oficiales publicados en Pulse. */
export const sessionHasResults = (s) =>
  FINISHED_STATUSES.has(String(s?.status ?? '').toUpperCase());

/** Sesión en pista ahora (estado Pulse o ventana horaria ~90 min). */
export const sessionIsLive = (s) => {
  const st = String(s?.status ?? '').toUpperCase();
  if (LIVE_STATUSES.has(st)) return true;
  if (FINISHED_STATUSES.has(st) || st === 'NOT-STARTED') return false;
  if (!s?.date) return false;
  const start = new Date(s.date).getTime();
  if (!Number.isFinite(start)) return false;
  const end = start + 90 * 60 * 1000;
  const now = Date.now();
  return now >= start - 5 * 60 * 1000 && now <= end + 10 * 60 * 1000;
};

/** Hay datos para mostrar (oficial o provisional en directo). */
export const sessionHasDisplayableData = (s) => sessionHasResults(s) || sessionIsLive(s);

export const pickMainRaceSession = (sessions) => {
  const races = sessions.filter((s) => s.type === 'RAC');
  return races.length ? races[races.length - 1] : sessions.at(-1);
};
