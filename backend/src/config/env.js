import 'dotenv/config';

export const PORT = Number(process.env.PORT) || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

export const JOLPICA_BASE_URL =
  process.env.JOLPICA_BASE_URL || 'https://api.jolpi.ca/ergast/f1';
export const MOTOGP_PULSELIVE_BASE_URL =
  process.env.MOTOGP_PULSELIVE_BASE_URL || 'https://api.motogp.pulselive.com/motogp/v1';
export const OPENF1_BASE_URL = process.env.OPENF1_BASE_URL || 'https://api.openf1.org/v1';
export const EXTERNAL_API_TIMEOUT_MS = parseInt(
  process.env.EXTERNAL_API_TIMEOUT_MS || '3500',
  10,
);

export const FIA_F2_BASE_URL =
  process.env.FIA_F2_BASE_URL || process.env.FIA_BASE_URL || 'https://www.fiaformula2.com';
export const FIA_F3_BASE_URL =
  process.env.FIA_F3_BASE_URL || 'https://www.fiaformula3.com';
export const FIA_F2_SEASON_ID = parseInt(
  process.env.FIA_F2_SEASON_ID || process.env.FIA_SEASON_ID || '183',
  10,
);
export const FIA_F3_SEASON_ID = parseInt(process.env.FIA_F3_SEASON_ID || '183', 10);

/** Supabase / Postgres (Prisma). Vacío = sin DB, solo mocks + APIs en vivo. */
export const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
export const DIRECT_URL = (process.env.DIRECT_URL || '').trim();
export const DB_ENABLED = Boolean(DATABASE_URL);

const supabaseProjectRefFromDb = () => {
  const m = DATABASE_URL.match(/postgres\.([a-z0-9]+):/i);
  return m?.[1] ?? '';
};

export const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  (supabaseProjectRefFromDb() ? `https://${supabaseProjectRefFromDb()}.supabase.co` : '')
).replace(/\/$/, '');

export const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
export const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

/** Backend: verificar JWT (anon o service role). */
export const AUTH_ENABLED = Boolean(SUPABASE_URL && (SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY));

/** Frontend: crear cliente Supabase en el navegador (solo anon key, nunca service role). */
export const AUTH_CLIENT_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const SUPABASE_STORAGE_BUCKET = (
  process.env.SUPABASE_STORAGE_BUCKET || 'beengine-media'
).trim();

export const SUPABASE_STORAGE_PUBLIC_BASE = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}`
  : '';

export const CURRENT_SEASON_YEAR = parseInt(process.env.CURRENT_SEASON_YEAR || '2026', 10);

/** Asistente IA (Groq + snapshots en Postgres). */
export const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
export const GROQ_MODEL = (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
export const ASSIST_MAX_SNAPSHOT_CHARS = parseInt(
  process.env.ASSIST_MAX_SNAPSHOT_CHARS || '20000',
  10,
);
export const ASSIST_LIVE_MAX_CHARS = parseInt(
  process.env.ASSIST_LIVE_MAX_CHARS || '22000',
  10,
);
export const ASSIST_RATE_LIMIT_PER_MIN = parseInt(
  process.env.ASSIST_RATE_LIMIT_PER_MIN || '20',
  10,
);
export const ASSIST_ENABLED = Boolean(GROQ_API_KEY && DB_ENABLED);

const envFlag = (key, defaultOn = true) => {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultOn;
  return !/^(0|false|no|off)$/i.test(v);
};

/** F1: Ergast/Jolpica con fallback a mocks en `data/f1/`. */
export const JOLPICA_F1_ENABLED = envFlag('JOLPICA_F1_ENABLED');

/** F2/F3: datos oficiales FIA (HTML __NEXT_DATA__) con fallback a mocks locales. */
export const FIA_F2_ENABLED = envFlag('FIA_F2_ENABLED');
export const FIA_F3_ENABLED = envFlag('FIA_F3_ENABLED');

/** MotoGP / Moto2 / Moto3: Pulse Live; si falla → DB (sync diario). */
export const PULSE_LIVE_ENABLED = envFlag('PULSE_LIVE_ENABLED');

/** Resumen para arranque (sin secretos). */
export function logRuntimeConfig() {
  const lines = [
    `  PORT=${PORT}  NODE_ENV=${NODE_ENV}`,
    `  Jolpica F1: ${JOLPICA_F1_ENABLED ? 'on' : 'off'}  → ${JOLPICA_BASE_URL}`,
    `  OpenF1: ${OPENF1_BASE_URL}`,
    `  Pulse Live: ${MOTOGP_PULSELIVE_BASE_URL}`,
    `  FIA F2: ${FIA_F2_ENABLED ? 'on' : 'off'}  season=${FIA_F2_SEASON_ID}  → ${FIA_F2_BASE_URL}`,
    `  FIA F3: ${FIA_F3_ENABLED ? 'on' : 'off'}  season=${FIA_F3_SEASON_ID}  → ${FIA_F3_BASE_URL}`,
    `  Pulse Moto: ${PULSE_LIVE_ENABLED ? 'on' : 'off (solo DB)'}  → ${MOTOGP_PULSELIVE_BASE_URL}`,
    `  API timeout: ${EXTERNAL_API_TIMEOUT_MS}ms`,
    `  Database: ${DB_ENABLED ? 'configured' : 'off (no DATABASE_URL)'}`,
    `  Storage: ${SUPABASE_STORAGE_PUBLIC_BASE || 'off'}  bucket=${SUPABASE_STORAGE_BUCKET}`,
    `  Auth: ${AUTH_ENABLED ? 'on' : 'off (SUPABASE_URL + ANON_KEY)'}`,
    `  Assist (Groq): ${ASSIST_ENABLED ? 'on' : 'off (GROQ_API_KEY + DATABASE_URL)'}  model=${GROQ_MODEL}`,
  ];
  console.log('\n  Config (.env):\n' + lines.join('\n') + '\n');
}
