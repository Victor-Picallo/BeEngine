import {
  pulseliveClient,
  MOTOGP_CATEGORY_UUID,
} from '../external/motogp/pulselive.client.js';
import motogpMock from '../data/motogp.data.js';
import { getRidersIndex } from './motogp/motogpRiders.service.js';
import { getCircuits, findCircuitByName } from './motogp/motogpCircuits.service.js';
import { getTeamsIndex, enrichStandingRow } from './motogp/motogpTeams.service.js';

export const getCurrentSeasonYear = async () => {
  const season = await getCurrentSeason();
  return season.year ?? new Date().getFullYear();
};

const SESSION_LABELS = {
  FP: 'FP',
  PR: 'PRACTICE',
  Q: 'QUALY',
  SPR: 'SPRINT',
  WUP: 'WARM-UP',
  RAC: 'RACE',
};

const asList = (raw) => (Array.isArray(raw) ? raw : raw?.value ?? []);

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const lastNameInitial = (full) => {
  const parts = String(full || '').trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
};

const formatRaceDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const formatSessionDate = (iso) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .replace('.', '');

const formatSessionTime = (iso) =>
  new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

let seasonCache = null;
let seasonCacheTs = 0;
const SEASON_CACHE_MS = 6 * 60 * 60_000;

const getCurrentSeason = async () => {
  const now = Date.now();
  if (seasonCache && now - seasonCacheTs < SEASON_CACHE_MS) return seasonCache;
  const raw = await pulseliveClient.get('/results/seasons', { freshTtlMs: SEASON_CACHE_MS });
  const list = asList(raw);
  const current = list.find((s) => s.current) ?? list[0];
  if (!current?.id) throw new Error('No current MotoGP season');
  seasonCache = current;
  seasonCacheTs = now;
  return current;
};

const getRaceEvents = async () => {
  const season = await getCurrentSeason();
  const events = await pulseliveClient.get(
    `/results/events?seasonUuid=${season.id}`,
    { freshTtlMs: 5 * 60_000 },
  );
  return asList(events).filter((e) => !e.test);
};

const pickMainRaceSession = (sessions) => {
  const races = sessions.filter((s) => s.type === 'RAC');
  return races.length ? races[races.length - 1] : sessions.at(-1);
};

const sessionLabel = (s) => {
  const base = SESSION_LABELS[s.type] ?? s.type;
  if (s.type === 'FP' && s.number) return `FP${s.number}`;
  if (s.type === 'Q' && s.number) return s.number > 1 ? 'Q2' : 'Q1';
  if (s.type === 'RAC' && s.number && s.number > 1) return 'RACE';
  return base;
};

const normalizeDriverStandings = (raw) => {
  const rows = raw?.classification ?? [];
  return rows.map((r) => ({
    pos: r.position,
    driver: r.rider?.full_name ?? '—',
    driverId: r.rider?.riders_api_uuid ?? r.rider?.id ?? slugify(r.rider?.full_name),
    team: r.team?.name ?? r.constructor?.name ?? '—',
    constructorId: slugify(r.team?.name ?? r.constructor?.name ?? ''),
    points: Number(r.points) || 0,
    wins: Number(r.race_wins) || 0,
    nationality: r.rider?.country?.iso ?? '',
    teamColor: null,
    headshotUrl: null,
  }));
};

/** Clasificación por equipo (sponsored team), no solo por fabricante. */
const normalizeConstructorStandingsByTeam = (classificationRows) => {
  const byTeam = new Map();
  for (const r of classificationRows) {
    const teamName = r.team?.name ?? r.constructor?.name;
    if (!teamName) continue;
    const pts = Number(r.points) || 0;
    const wins = Number(r.race_wins) || 0;
    const cur = byTeam.get(teamName) ?? { team: teamName, points: 0, wins: 0 };
    cur.points += pts;
    cur.wins += wins;
    byTeam.set(teamName, cur);
  }
  return [...byTeam.values()]
    .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
    .map((c, i) => ({
      pos: i + 1,
      team: c.team,
      constructorId: slugify(c.team),
      points: c.points,
      wins: c.wins,
      nationality: '',
      teamColor: null,
      logoUrl: null,
    }));
};

const teamSlugMatches = (a, b) => {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
};

const mergeTeamsGridIntoStandings = (items, teamsIdx) => {
  const rows = [...items];
  for (const t of teamsIdx.list) {
    const key = slugify(t.name);
    const existing = rows.find((row) => teamSlugMatches(slugify(row.team), key));
    if (existing) {
      if (!existing.logoUrl && t.logoUrl) existing.logoUrl = t.logoUrl;
      if (!existing.teamColor && t.color) existing.teamColor = t.color;
      continue;
    }
    rows.push({
      pos: 0,
      team: t.name,
      constructorId: slugify(t.name),
      points: 0,
      wins: 0,
      nationality: '',
      teamColor: t.color,
      logoUrl: t.logoUrl,
    });
  }
  return rows
    .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
    .map((row, i) => ({ ...row, pos: i + 1 }));
};

const normalizeCalendar = (events) =>
  events.map((e, i) => ({
    round: i + 1,
    raceName: e.sponsored_name?.trim() || e.name,
    circuitName: e.circuit?.name ?? '—',
    circuitId: e.circuit?.id ?? null,
    locality: e.circuit?.place ?? e.circuit?.city ?? '',
    country: e.country?.name ?? e.circuit?.nation ?? e.circuit?.country ?? '',
    date: e.date_start?.slice(0, 10) ?? '',
    time: e.date_start?.includes('T') ? e.date_start.split('T')[1]?.slice(0, 8) : null,
    status: e.status,
    eventId: e.id,
  }));

const enrichRaceResultsHeadshots = async (rows) => {
  try {
    const idx = await getRidersIndex();
    return rows.map((r) => {
      const rider =
        idx.byId.get(r.driverId) ??
        idx.bySlug.get(slugify(r.driver));
      return { ...r, headshotUrl: rider?.portraitUrl ?? null };
    });
  } catch {
    return rows;
  }
};

const normalizeClassification = (cls) =>
  (cls?.classification ?? []).map((r) => {
    const gapFirst = r.gap?.first;
    const time =
      r.position === 1
        ? r.time ?? '—'
        : gapFirst && gapFirst !== '0.000'
          ? `+${gapFirst}s`
          : r.time ?? '—';
    return {
      position: r.position,
      driver: r.rider?.full_name ?? '—',
      driverId: r.rider?.riders_api_uuid ?? r.rider?.id ?? slugify(r.rider?.full_name),
      team: r.team?.name ?? r.constructor?.name ?? '—',
      constructorId: slugify(r.constructor?.name ?? r.team?.name),
      points: Number(r.points) || 0,
      time,
    };
  });

// ── Fallbacks (mock local) ───────────────────────────────────

const fallbackDriverStandings = () =>
  motogpMock.standings.map((d) => ({
    pos: d.pos,
    driver: d.driver,
    driverId: slugify(d.driver),
    team: d.team,
    points: d.points,
    wins: 0,
    nationality: d.nationality,
  }));

const fallbackConstructorStandings = () =>
  motogpMock.constructors.map((c) => ({
    pos: c.pos,
    team: c.team,
    constructorId: slugify(c.team),
    points: c.points,
    wins: 0,
    nationality: '',
  }));

const fallbackCalendar = () => {
  const nr = motogpMock.nextRace;
  const [date, time] = nr.date.split('T');
  return [
    {
      round: nr.round,
      raceName: nr.name,
      circuitName: nr.circuit,
      locality: nr.location.split(',')[0].trim(),
      country: nr.location.split(',').pop()?.trim() ?? '',
      date,
      time: time?.replace('Z', '') ?? null,
      status: 'NOT-STARTED',
      eventId: null,
    },
  ];
};

const fallbackLastRace = () => ({
  raceName: motogpMock.lastRace.name,
  round: Math.max(0, motogpMock.nextRace.round - 1),
  circuitName: '—',
  date: new Date().toISOString().slice(0, 10),
  results: motogpMock.lastRace.podium.map((p) => ({
    position: p.pos,
    driver: p.driver,
    driverId: slugify(p.driver),
    team: p.team,
    time: p.time,
    points: 0,
  })),
  imageUrl: null,
});

// ── Public API ───────────────────────────────────────────────

export const getDriverStandings = async () => {
  try {
    const season = await getCurrentSeason();
    const raw = await pulseliveClient.get(
      `/results/standings?seasonUuid=${season.id}&categoryUuid=${MOTOGP_CATEGORY_UUID}`,
    );
    const items = await enrichDriversWithTeamsAndPortraits(
      normalizeDriverStandings(raw),
      season.year,
    );
    return { source: 'external', items };
  } catch {
    return { source: 'mock', items: fallbackDriverStandings() };
  }
};

const enrichDriversWithTeamsAndPortraits = async (items, seasonYear) => {
  try {
    const [ridersIdx, teamsIdx] = await Promise.all([
      getRidersIndex(),
      getTeamsIndex(seasonYear),
    ]);
    return items.map((row) => {
      const rider =
        ridersIdx.byId.get(row.driverId) ??
        ridersIdx.bySlug.get(row.driverId) ??
        ridersIdx.bySlug.get(slugify(row.driver));
      const withTeam = enrichStandingRow(row, teamsIdx);
      return {
        ...withTeam,
        headshotUrl: rider?.portraitUrl ?? withTeam.headshotUrl ?? null,
        teamColor:
          withTeam.teamColor ?? teamsIdx.bySlug.get(slugify(row.team))?.color ?? null,
      };
    });
  } catch {
    return items;
  }
};

export const getConstructorStandings = async () => {
  try {
    const season = await getCurrentSeason();
    const [raw, teamsIdx] = await Promise.all([
      pulseliveClient.get(
        `/results/standings?seasonUuid=${season.id}&categoryUuid=${MOTOGP_CATEGORY_UUID}`,
      ),
      getTeamsIndex(season.year),
    ]);
    let items = normalizeConstructorStandingsByTeam(raw?.classification ?? []);
    items = mergeTeamsGridIntoStandings(items, teamsIdx);
    items = items.map((row) => enrichStandingRow(row, teamsIdx));
    return { source: 'external', items };
  } catch {
    return { source: 'mock', items: fallbackConstructorStandings() };
  }
};

export const getCalendar = async () => {
  try {
    const season = await getCurrentSeason();
    const events = await getRaceEvents();
    let items = normalizeCalendar(events);
    try {
      const { items: circuitList } = await getCircuits(season.year);
      const bySlug = new Map(circuitList.map((c) => [c.slug, c]));
      const byId = new Map(circuitList.map((c) => [c.circuitId, c]));
      items = items.map((row) => {
        const c =
          (row.circuitId && byId.get(row.circuitId)) ||
          bySlug.get(slugify(row.circuitName));
        if (!c) return row;
        return {
          ...row,
          circuitSvgUrl: c.svgUrl,
          circuitImageUrl: c.imageUrl,
        };
      });
    } catch {
      /* calendario sin SVG */
    }
    return { source: 'external', items };
  } catch {
    return { source: 'mock', items: fallbackCalendar() };
  }
};

export const getLastRace = async () => {
  try {
    const season = await getCurrentSeason();
    const events = await getRaceEvents();
    const finished = events.filter((e) => e.status === 'FINISHED');
    const last = finished[finished.length - 1];
    if (!last) throw new Error('No finished races');

    const sessions = asList(
      await pulseliveClient.get(
        `/results/sessions?eventUuid=${last.id}&categoryUuid=${MOTOGP_CATEGORY_UUID}`,
      ),
    );
    const raceSession = pickMainRaceSession(sessions);
    if (!raceSession?.id) throw new Error('No race session');

    const cls = await pulseliveClient.get(
      `/results/session/${raceSession.id}/classification?seasonYear=${season.year}&test=false`,
    );
    const results = await enrichRaceResultsHeadshots(normalizeClassification(cls));
    const round = finished.length;
    const circuit = await findCircuitByName(last.circuit?.name, season.year).catch(() => null);

    return {
      source: 'external',
      raceName: last.sponsored_name?.trim() || last.name,
      round,
      circuitName: last.circuit?.name ?? '—',
      date: last.date_start?.slice(0, 10) ?? '',
      results,
      imageUrl: circuit?.imageUrl ?? circuit?.svgUrl ?? null,
    };
  } catch {
    return { source: 'mock', ...fallbackLastRace() };
  }
};

/** Sessions del próximo GP (para la tarjeta de carrera en home). */
export const getNextRaceSessions = async () => {
  try {
    const events = await getRaceEvents();
    const next = events.find((e) => e.status !== 'FINISHED');
    if (!next) return { source: 'external', event: null, sessions: [] };

    const sessions = asList(
      await pulseliveClient.get(
        `/results/sessions?eventUuid=${next.id}&categoryUuid=${MOTOGP_CATEGORY_UUID}`,
      ),
    );

    const mainRaceId = pickMainRaceSession(sessions)?.id;
    const season = await getCurrentSeason();
    const circuit = await findCircuitByName(next.circuit?.name, season.year).catch(() => null);
    return {
      source: 'external',
      event: {
        raceName: next.sponsored_name?.trim() || next.name,
        circuitName: next.circuit?.name ?? '—',
        locality: next.circuit?.place ?? next.circuit?.city ?? '',
        country: next.country?.name ?? '',
        date: next.date_start,
        round: events.filter((e) => e.status === 'FINISHED').length + 1,
        totalRounds: events.length,
        circuitSvgUrl: circuit?.svgUrl ?? null,
        circuitImageUrl: circuit?.imageUrl ?? null,
      },
      sessions: sessions.map((s) => ({
        name: sessionLabel(s),
        date: formatSessionDate(s.date),
        time: formatSessionTime(s.date),
        highlight: s.id === mainRaceId,
        dateIso: s.date,
      })),
    };
  } catch {
    const nr = motogpMock.nextRace;
    return {
      source: 'mock',
      event: {
        raceName: nr.name,
        circuitName: nr.circuit,
        locality: nr.location.split(',')[0].trim(),
        country: nr.location.split(',').pop()?.trim() ?? '',
        date: nr.date,
        round: nr.round,
        totalRounds: nr.totalRounds,
      },
      sessions: nr.sessions.map((s) => ({
        name: s.name,
        date: s.date,
        time: s.time,
        highlight: !!s.highlight,
        dateIso: nr.date,
      })),
    };
  }
};

export const getRaceResultsByRound = async (round) => {
  const cleanRound = Number.parseInt(round, 10);
  if (!Number.isInteger(cleanRound) || cleanRound < 1) {
    throw new Error('Invalid race round');
  }

  try {
    const season = await getCurrentSeason();
    const events = await getRaceEvents();
    const event = events[cleanRound - 1];
    if (!event) throw new Error(`No MotoGP event for round ${cleanRound}`);

    const sessions = asList(
      await pulseliveClient.get(
        `/results/sessions?eventUuid=${event.id}&categoryUuid=${MOTOGP_CATEGORY_UUID}`,
      ),
    );
    const raceSession = pickMainRaceSession(sessions);
    if (!raceSession?.id) throw new Error('No race session');

    const cls = await pulseliveClient.get(
      `/results/session/${raceSession.id}/classification?seasonYear=${season.year}&test=false`,
    );

    const enriched = await enrichRaceResultsHeadshots(normalizeClassification(cls));
    const circuit = await findCircuitByName(event.circuit?.name, season.year).catch(() => null);

    return {
      source: 'external',
      round: cleanRound,
      raceName: event.sponsored_name?.trim() || event.name,
      circuitName: event.circuit?.name ?? '—',
      circuitSvgUrl: circuit?.svgUrl ?? null,
      date: event.date_start?.slice(0, 10) ?? '',
      results: enriched.map((r) => ({
        position: r.position,
        driver: r.driver,
        driverId: r.driverId,
        team: r.team,
        constructorId: r.constructorId,
        headshotUrl: r.headshotUrl ?? null,
        grid: 0,
        laps: 0,
        status: 'Finished',
        points: r.points,
        time: r.time,
      })),
    };
  } catch (err) {
    throw err;
  }
};

/** OpenF1-shaped sessions para la home (próximo GP). */
export const getWeekendSessions = async () => {
  const payload = await getNextRaceSessions();
  const ev = payload.event;
  if (!ev) return { source: payload.source, items: [] };

  const items = (payload.sessions ?? []).map((s, i) => {
    const start = new Date(s.dateIso ?? ev.date);
    const end = new Date(start.getTime() + 60 * 60_000);
    return {
      sessionKey: i + 1,
      meetingKey: ev.round,
      sessionName: s.name,
      sessionType: s.name,
      countryName: ev.country,
      location: ev.locality,
      circuitShortName: ev.circuitName,
      dateStart: start.toISOString(),
      dateEnd: end.toISOString(),
      year: new Date().getFullYear(),
    };
  });

  return { source: payload.source, items };
};

export { lastNameInitial, formatRaceDate, slugify };
