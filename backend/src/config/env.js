import 'dotenv/config';

export const PORT         = process.env.PORT         || 3000;
export const NODE_ENV     = process.env.NODE_ENV     || 'development';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

export const JOLPICA_BASE_URL          = process.env.JOLPICA_BASE_URL          || 'https://api.jolpi.ca/ergast/f1';
export const OPENF1_BASE_URL           = process.env.OPENF1_BASE_URL           || 'https://api.openf1.org/v1';
export const EXTERNAL_API_TIMEOUT_MS   = parseInt(process.env.EXTERNAL_API_TIMEOUT_MS || '3500', 10);
