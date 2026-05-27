import {
  AUTH_CLIENT_ENABLED,
  AUTH_ENABLED,
  FRONTEND_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from '../config/env.js';
import { success } from '../utils/response.js';

export const getAuthConfig = (_req, res) => {
  success(res, {
    /** true solo si el navegador puede usar Supabase Auth (anon key presente). */
    configured: AUTH_CLIENT_ENABLED,
    serverAuth: AUTH_ENABLED,
    supabaseUrl: AUTH_CLIENT_ENABLED ? SUPABASE_URL : '',
    supabaseAnonKey: AUTH_CLIENT_ENABLED ? SUPABASE_ANON_KEY : '',
    oauthRedirectUrl: FRONTEND_URL,
    hint: !AUTH_CLIENT_ENABLED && AUTH_ENABLED
      ? 'Añade SUPABASE_ANON_KEY en backend/.env (Settings → API en Supabase).'
      : null,
  });
};
