import 'dotenv/config';

export const PORT         = process.env.PORT         || 3000;
export const NODE_ENV     = process.env.NODE_ENV     || 'development';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

export const JOLPICA_BASE_URL          = process.env.JOLPICA_BASE_URL          || 'https://api.jolpi.ca/ergast/f1';
export const MOTOGP_PULSELIVE_BASE_URL = process.env.MOTOGP_PULSELIVE_BASE_URL || 'https://api.motogp.pulselive.com/motogp/v1';
export const OPENF1_BASE_URL           = process.env.OPENF1_BASE_URL           || 'https://api.openf1.org/v1';
export const EXTERNAL_API_TIMEOUT_MS   = parseInt(process.env.EXTERNAL_API_TIMEOUT_MS || '3500', 10);

export const FIA_F2_BASE_URL  = process.env.FIA_F2_BASE_URL  || 'https://www.fiaformula2.com';
export const FIA_F3_BASE_URL  = process.env.FIA_F3_BASE_URL  || 'https://www.fiaformula3.com';
export const FIA_F2_SEASON_ID = parseInt(process.env.FIA_F2_SEASON_ID || '183', 10);
export const FIA_F3_SEASON_ID = parseInt(process.env.FIA_F3_SEASON_ID || '183', 10);

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
