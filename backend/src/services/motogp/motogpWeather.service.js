import { findCircuitByName } from './motogpCircuits.service.js';
import { fetchSessionDetail, resolveSessionContext } from './motogpSessionContext.service.js';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_MS = 30 * 60_000;
const weatherCache = new Map();

const parseTemp = (raw) => {
  const s = String(raw ?? '').replace(/[º°]/g, '').trim();
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const parsePercent = (raw) => {
  const s = String(raw ?? '').replace('%', '').trim();
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

/** OpenF1-shaped weather for la UI F1 live. */
const normalizeCondition = (condition) => {
  if (!condition || typeof condition !== 'object') return {};
  const track = String(condition.track ?? '').trim();
  const weather = String(condition.weather ?? '').trim();
  const rainfall =
    /wet|rain|mojado/i.test(track) || /rain/i.test(weather) ? 0.1 : 0;
  return {
    airTemperature: parseTemp(condition.air) ?? 0,
    trackTemperature: parseTemp(condition.ground) ?? parseTemp(condition.track) ?? 0,
    humidity: parsePercent(condition.humidity) ?? 0,
    pressure: 0,
    rainfall,
    windDirection: 0,
    windSpeed: 0,
    conditionLabel: weather || track || '—',
    trackCondition: track || '—',
  };
};

const fetchOpenMeteo = async (lat, lng) => {
  const url =
    `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation,rain' +
    '&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm';
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();
  const c = data?.current ?? {};
  return {
    airTemperature: Number(c.temperature_2m) || 0,
    trackTemperature: Number(c.temperature_2m) || 0,
    humidity: Number(c.relative_humidity_2m) || 0,
    pressure: Number(c.surface_pressure) || 0,
    rainfall: Number(c.rain ?? c.precipitation) || 0,
    windDirection: Number(c.wind_direction_10m) || 0,
    windSpeed: Number(c.wind_speed_10m) || 0,
    conditionLabel: null,
    trackCondition: null,
  };
};

const mergeWeather = (official, meteo) => {
  const out = { ...meteo, ...official };
  if (official.trackTemperature && !meteo.trackTemperature) {
    out.trackTemperature = official.trackTemperature;
  }
  if (official.airTemperature && meteo.airTemperature === official.airTemperature) {
    out.airTemperature = official.airTemperature;
  }
  if (official.humidity) out.humidity = official.humidity;
  if (official.conditionLabel) out.conditionLabel = official.conditionLabel;
  if (official.trackCondition) out.trackCondition = official.trackCondition;
  if (official.rainfall > 0) out.rainfall = official.rainfall;
  if (!out.windSpeed && meteo.windSpeed) out.windSpeed = meteo.windSpeed;
  if (!out.pressure && meteo.pressure) out.pressure = meteo.pressure;
  if (!out.windDirection && meteo.windDirection) out.windDirection = meteo.windDirection;
  return out;
};

/**
 * Clima de sesión: condición oficial Pulse + Open-Meteo en el circuito.
 */
export const getSessionWeather = async (round, sessionKey = 'race', categoryId = 'motogp') => {
  const ctx = await resolveSessionContext(round, sessionKey, categoryId);
  if (!ctx) return { source: 'none', weather: null };

  const cacheKey = `${ctx.session.id}:${categoryId}`;
  const hit = weatherCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.data;

  let detail = null;
  try {
    detail = await fetchSessionDetail(ctx.session.id);
  } catch {
    detail = null;
  }

  const official = normalizeCondition(detail?.condition);

  let meteo = {
    airTemperature: 0,
    trackTemperature: 0,
    humidity: 0,
    pressure: 0,
    rainfall: 0,
    windDirection: 0,
    windSpeed: 0,
    conditionLabel: null,
    trackCondition: null,
  };

  try {
    const seasonYear = ctx.season.year ?? new Date().getFullYear();
    const circuit = await findCircuitByName(ctx.event.circuit?.name, seasonYear);
    if (circuit?.lat != null && circuit?.lng != null) {
      meteo = await fetchOpenMeteo(circuit.lat, circuit.lng);
    }
  } catch {
    /* solo condición oficial */
  }

  const weather = mergeWeather(official, meteo);
  const data = {
    source: detail?.condition ? 'pulselive+open-meteo' : 'open-meteo',
    round: ctx.round,
    sessionKey: ctx.sessionKey,
    sessionId: ctx.session.id,
    circuitName: ctx.event.circuit?.name ?? '—',
    weather: {
      ...weather,
      date: new Date().toISOString(),
      sessionKey: ctx.session.id,
      meetingKey: 0,
    },
  };

  weatherCache.set(cacheKey, { data, ts: Date.now() });
  return data;
};
