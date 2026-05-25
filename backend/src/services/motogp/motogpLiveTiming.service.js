import { pulseliveClient } from '../../external/motogp/pulselive.client.js';

const LIVE_TIMING_PATH = '/timing-gateway/livetiming-lite';
const LIVE_CACHE_MS = 5_000;

const hexColor = (raw) => {
  const c = String(raw ?? '').replace('#', '').trim();
  if (c.length !== 6) return '#0052CC';
  return `#${c}`;
};

/** Sesión en curso según livetiming-lite (categoría MotoGP™ en el feed global). */
export const isLiveTimingActive = (payload) => {
  if (!payload?.head) return false;
  const st = String(payload.head.session_status_name ?? payload.head.session_status_id ?? '').toUpperCase();
  if (st === 'F' || st === 'FINISHED' || st === 'END') return false;
  const riders = Object.values(payload.rider ?? {});
  return riders.some((r) => Number(r.pos) > 0 && Number(r.num_lap) > 0);
};

/**
 * @param {string} [categoryId] Solo motogp tiene livetiming global hoy.
 */
export const fetchLiveTimingLite = async (categoryId = 'motogp') => {
  if (categoryId !== 'motogp') {
    return { active: false, categoryId, head: null, riders: [] };
  }

  const raw = await pulseliveClient.get(LIVE_TIMING_PATH, { freshTtlMs: LIVE_CACHE_MS });
  const head = raw?.head ?? null;
  const riderMap = raw?.rider ?? {};
  const riders = Object.values(riderMap)
    .filter((r) => Number(r.pos) > 0)
    .sort((a, b) => Number(a.pos) - Number(b.pos))
    .map((r) => ({
      position: Number(r.pos),
      riderNumber: Number(r.rider_number) || 0,
      riderId: String(r.rider_id ?? r.rider_number ?? ''),
      driver: `${r.rider_name ?? ''} ${r.rider_surname ?? ''}`.trim(),
      shortName: r.rider_shortname ?? '',
      team: r.team_name ?? '—',
      teamColor: hexColor(r.color),
      gap: r.gap_first?.startsWith('+') ? r.gap_first : r.gap_first && r.gap_first !== '0.000' ? `+${r.gap_first}` : '—',
      interval: r.gap_prev?.startsWith('+') ? r.gap_prev : r.gap_prev && r.gap_prev !== '0.000' ? `+${r.gap_prev}` : '—',
      lastLap: r.last_lap_time && r.last_lap_time !== '0.000' ? r.last_lap_time : r.lap_time !== '0.000' ? r.lap_time : '—',
      bestLap: r.lap_time !== '0.000' ? r.lap_time : '—',
      laps: Number(r.num_lap) || 0,
      onPit: Boolean(r.on_pit),
      bikeName: r.bike_name ?? '—',
      trackStatus: String(r.trac_status ?? '').toUpperCase() || null,
      riderStatus: String(r.status_name ?? '').toUpperCase() || null,
    }));

  const active = isLiveTimingActive(raw);

  const sessionStatusId = String(head?.session_status_id ?? '').toUpperCase();

  return {
    active,
    categoryId,
    head: head
      ? {
          circuitName: head.circuit_name ?? '',
          eventName: head.event_tv_name ?? head.event_shortname ?? '',
          sessionShortName: head.session_shortname ?? head.session_name ?? '',
          sessionStatus: head.session_status_name ?? '',
          sessionStatusId,
          remaining: head.remaining ?? null,
          totalLaps: Number(head.num_laps) || 0,
          dateFormatted: head.date_formated ?? '',
        }
      : null,
    riders,
  };
};

/** Mapea FP2 → fp2, RACE → race, etc. */
export const liveTimingSessionKey = (shortName) => {
  const s = String(shortName ?? '').toUpperCase().replace(/\s+/g, '');
  if (s === 'RACE' || s === 'RAC') return 'race';
  if (s === 'SPRINT' || s === 'SPR') return 'sprint';
  if (s === 'WARM-UP' || s === 'WUP') return 'warmup';
  if (s === 'Q1') return 'q1';
  if (s === 'Q2') return 'q2';
  if (s.startsWith('FP')) {
    const n = s.replace('FP', '');
    return n === '2' ? 'fp2' : 'fp1';
  }
  if (s === 'PRACTICE' || s === 'PR') return 'practice';
  return 'race';
};
