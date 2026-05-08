import { openF1Client } from '../external/openf1/openf1.client.js';

// ── Normalizers ───────────────────────────────────────────

const normalizeSessions = (raw) =>
  (Array.isArray(raw) ? raw : []).map((s) => ({
    sessionKey:  s.session_key,
    meetingKey:  s.meeting_key,
    sessionName: s.session_name,
    sessionType: s.session_type,
    countryName: s.country_name,
    location:    s.location,
    dateStart:   s.date_start,
    dateEnd:     s.date_end,
    year:        s.year,
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
  (Array.isArray(raw) ? raw : []).map((r) => ({
    date:         r.date,
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

// ── Public service ────────────────────────────────────────

export const getSessions = async () => {
  const raw = await openF1Client.get('/sessions?year=2025');
  return normalizeSessions(raw);
};

export const getDrivers = async () => {
  const raw = await openF1Client.get('/drivers?session_key=latest');
  return normalizeDrivers(raw);
};

export const getPositions = async () => {
  const raw = await openF1Client.get('/position?session_key=latest');
  return normalizePositions(raw);
};

export const getWeather = async () => {
  const raw = await openF1Client.get('/weather?session_key=latest');
  return normalizeWeather(raw); // null if no data — frontend handles empty state
};

export const getLaps = async () => {
  const raw = await openF1Client.get('/laps?session_key=latest');
  return normalizeLaps(raw);
};

export const getIntervals = async () => {
  const raw = await openF1Client.get('/intervals?session_key=latest');
  return normalizeIntervals(raw);
};

export const getStints = async () => {
  const raw = await openF1Client.get('/stints?session_key=latest');
  return normalizeStints(raw);
};

export const getRaceControl = async () => {
  const raw = await openF1Client.get('/race_control?session_key=latest');
  return normalizeRaceControl(raw);
};

export const getTeamRadio = async () => {
  const raw = await openF1Client.get('/team_radio?session_key=latest');
  return normalizeTeamRadio(raw);
};

// Telemetry positions for a single driver across the whole session.
// Used to derive the real circuit outline (instead of a hand-drawn path).
export const getLocation = async (driverNumber = 1) => {
  const safe = Number.isFinite(driverNumber) ? driverNumber : 1;
  const raw = await openF1Client.get(`/location?session_key=latest&driver_number=${safe}`);
  return normalizeLocation(raw);
};
