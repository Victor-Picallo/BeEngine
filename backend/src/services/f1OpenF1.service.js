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
  const data = normalizeWeather(raw);
  if (!data) throw new Error('No weather data available');
  return data;
};
