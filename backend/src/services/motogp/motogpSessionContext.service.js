import { pulseliveClient } from '../../external/motogp/pulselive.client.js';
import {
  categoryUuidFor,
  getCurrentSeason,
  getRaceEvents,
} from './pulseLive.service.js';

export { categoryUuidFor };
import {
  pickMainRaceSession,
  resolvePulseSession,
} from './motogpSessions.util.js';

const asList = (raw) => (Array.isArray(raw) ? raw : raw?.value ?? []);

export const fetchEventSessions = async (event, categoryId = 'motogp') => {
  if (!event?.id) return [];
  return asList(
    await pulseliveClient.get(
      `/results/sessions?eventUuid=${event.id}&categoryUuid=${categoryUuidFor(categoryId)}`,
    ),
  );
};

/**
 * Resuelve round + sessionKey → evento, sesión Pulse y circuito.
 * @returns {Promise<{
 *   season: object,
 *   event: object,
 *   session: object,
 *   sessions: object[],
 *   round: number,
 *   sessionKey: string,
 * } | null>}
 */
export const resolveSessionContext = async (
  round,
  sessionKey = 'race',
  categoryId = 'motogp',
) => {
  const cleanRound = Number.parseInt(round, 10);
  if (!Number.isInteger(cleanRound) || cleanRound < 1) return null;

  const season = await getCurrentSeason();
  const events = await getRaceEvents();
  const event = events[cleanRound - 1];
  if (!event?.id) return null;

  const sessions = await fetchEventSessions(event, categoryId);
  const key = String(sessionKey || 'race').toLowerCase();
  const session =
    resolvePulseSession(sessions, key) ??
    (key === 'race' ? pickMainRaceSession(sessions) : null);
  if (!session?.id) return null;

  return {
    season,
    event,
    session,
    sessions,
    round: cleanRound,
    sessionKey: key,
    categoryId,
  };
};

export const fetchSessionDetail = async (sessionId) => {
  if (!sessionId) return null;
  return pulseliveClient.get(`/results/sessions/${sessionId}`, {
    freshTtlMs: 30_000,
  });
};
