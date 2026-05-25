import { openF1Client } from '../../external/openf1/openf1.client.js';

// ── Normalizers ───────────────────────────────────────────

const normalizeSessions = (raw) =>
  (Array.isArray(raw) ? raw : []).map((s) => ({
    sessionKey:       s.session_key,
    meetingKey:       s.meeting_key,
    sessionName:      s.session_name,
    sessionType:      s.session_type,
    countryName:      s.country_name,
    location:         s.location,
    circuitShortName: s.circuit_short_name ?? '',
    dateStart:        s.date_start,
    dateEnd:          s.date_end,
    year:             s.year,
  }));

const normalizeDrivers = (raw) =>
  (Array.isArray(raw) ? raw : []).map((d) => ({
    driverNumber:  d.driver_number,
    broadcastName: d.broadcast_name,
    fullName:      d.full_name,
    nameAcronym:   d.name_acronym,
    teamName:      d.team_name,
    teamColour:    d.team_colour,
    countryCode:   d.country_code,
    headshotUrl:   d.headshot_url,
  }));

const normalizePositions = (raw) =>
  (Array.isArray(raw) ? raw : []).map((p) => ({
    date:         p.date,
    driverNumber: p.driver_number,
    position:     p.position,
    sessionKey:   p.session_key,
    meetingKey:   p.meeting_key,
  }));

const normalizeWeather = (raw) => {
  const arr = Array.isArray(raw) ? raw : [];
  const w = arr[arr.length - 1];
  if (!w) return null;
  return {
    airTemperature:   w.air_temperature,
    trackTemperature: w.track_temperature,
    humidity:         w.humidity,
    pressure:         w.pressure,
    rainfall:         w.rainfall,
    windDirection:    w.wind_direction,
    windSpeed:        w.wind_speed,
    date:             w.date,
    sessionKey:       w.session_key,
    meetingKey:       w.meeting_key,
  };
};

const normalizeLaps = (raw) =>
  (Array.isArray(raw) ? raw : []).map((l) => ({
    dateStart:       l.date_start,
    driverNumber:    l.driver_number,
    durationSector1: l.duration_sector_1 ?? null,
    durationSector2: l.duration_sector_2 ?? null,
    durationSector3: l.duration_sector_3 ?? null,
    i1Speed:         l.i1_speed ?? null,
    i2Speed:         l.i2_speed ?? null,
    stSpeed:         l.st_speed ?? null,
    lapDuration:     l.lap_duration ?? null,
    lapNumber:       l.lap_number,
    sessionKey:      l.session_key,
    meetingKey:      l.meeting_key,
  }));

const normalizeIntervals = (raw) =>
  (Array.isArray(raw) ? raw : []).map((i) => ({
    date:         i.date,
    driverNumber: i.driver_number,
    gapToLeader:  i.gap_to_leader ?? null,
    interval:     i.interval ?? null,
    sessionKey:   i.session_key,
    meetingKey:   i.meeting_key,
  }));

const normalizeStints = (raw) =>
  (Array.isArray(raw) ? raw : []).map((s) => ({
    driverNumber:    s.driver_number,
    compound:        s.compound ?? '',
    lapStart:        s.lap_start ?? 0,
    lapEnd:          s.lap_end ?? null,
    stintNumber:     s.stint_number ?? 0,
    tyreAgeAtStart:  s.tyre_age_at_start ?? 0,
    sessionKey:      s.session_key,
    meetingKey:      s.meeting_key,
  }));

const normalizeRaceControl = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .filter((r) => r != null && typeof r === 'object')
    .map((r) => ({
      date:         r.date ?? '',
      category:     r.category ?? '',
      message:      r.message ?? null,
      driverNumber: r.driver_number ?? null,
      flag:         r.flag ?? null,
      lapNumber:    r.lap_number ?? null,
      scope:        r.scope ?? null,
      sector:       r.sector ?? null,
      sessionKey:   r.session_key,
      meetingKey:   r.meeting_key,
    }));

const normalizeTeamRadio = (raw) =>
  (Array.isArray(raw) ? raw : []).map((t) => ({
    date:         t.date,
    driverNumber: t.driver_number,
    recordingUrl: t.recording_url ?? '',
    sessionKey:   t.session_key,
    meetingKey:   t.meeting_key,
  }));

const normalizeLocation = (raw) =>
  (Array.isArray(raw) ? raw : []).map((l) => ({
    x:            l.x,
    y:            l.y,
    z:            l.z ?? 0,
    date:         l.date,
    driverNumber: l.driver_number,
    sessionKey:   l.session_key,
    meetingKey:   l.meeting_key,
  }));

// Build a session_key filter param. Numeric keys reference a specific session;
// otherwise we fall back to OpenF1's "latest" alias.
const sessionParam = (sessionKey) => {
  if (sessionKey === undefined || sessionKey === null || sessionKey === '' || sessionKey === 'latest') {
    return 'session_key=latest';
  }
  return `session_key=${encodeURIComponent(sessionKey)}`;
};

// ── Public service ────────────────────────────────────────

export const getSessions = async () => {
  const year = new Date().getUTCFullYear();
  const raw = await openF1Client.get(`/sessions?year=${year}`);
  return normalizeSessions(raw);
};

export const getDrivers = async (sessionKey) => {
  const raw = await openF1Client.get(`/drivers?${sessionParam(sessionKey)}`);
  return normalizeDrivers(raw);
};

export const getPositions = async (sessionKey) => {
  const raw = await openF1Client.get(`/position?${sessionParam(sessionKey)}`);
  return normalizePositions(raw);
};

export const getWeather = async (sessionKey) => {
  const raw = await openF1Client.get(`/weather?${sessionParam(sessionKey)}`);
  return normalizeWeather(raw); // null if no data — frontend handles empty state
};

export const getLaps = async (sessionKey) => {
  const raw = await openF1Client.get(`/laps?${sessionParam(sessionKey)}`);
  return normalizeLaps(raw);
};

export const getIntervals = async (sessionKey) => {
  const raw = await openF1Client.get(`/intervals?${sessionParam(sessionKey)}`);
  return normalizeIntervals(raw);
};

export const getStints = async (sessionKey) => {
  const raw = await openF1Client.get(`/stints?${sessionParam(sessionKey)}`);
  return normalizeStints(raw);
};

export const getRaceControl = async (sessionKey) => {
  try {
    const raw = await openF1Client.get(`/race_control?${sessionParam(sessionKey)}`);
    try {
      return normalizeRaceControl(raw);
    } catch (err) {
      console.warn('[f1OpenF1] race_control normalize failed:', err?.message ?? err);
      return [];
    }
  } catch (err) {
    // OpenF1 occasionally returns 5xx or transient errors for this endpoint.
    // Empty feed is preferable to failing the whole /api proxy with HTTP 500.
    console.warn('[f1OpenF1] race_control failed:', err?.message ?? err);
    return [];
  }
};

export const getTeamRadio = async (sessionKey) => {
  const raw = await openF1Client.get(`/team_radio?${sessionParam(sessionKey)}`);
  return normalizeTeamRadio(raw);
};

// Telemetry positions for a single driver across the whole session.
// Used to derive the real circuit outline (instead of a hand-drawn path).
export const getLocation = async (driverNumber = 1, sessionKey) => {
  const safe = Number.isFinite(driverNumber) ? driverNumber : 1;
  const raw = await openF1Client.get(`/location?${sessionParam(sessionKey)}&driver_number=${safe}`);
  return normalizeLocation(raw);
};
