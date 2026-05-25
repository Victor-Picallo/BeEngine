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

export const sessionHasResults = (s) =>
  s?.status === 'FINISHED' || s?.status === 'OFFICIAL';

export const pickMainRaceSession = (sessions) => {
  const races = sessions.filter((s) => s.type === 'RAC');
  return races.length ? races[races.length - 1] : sessions.at(-1);
};
