import {
  AUTH_CLIENT_ENABLED,
  AUTH_ENABLED,
  NODE_ENV,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from '../config/env.js';
import { resolveOAuthRedirectUrl } from '../utils/allowedOrigins.js';
import { success } from '../utils/response.js';

export const getAuthConfig = (req, res) => {
  const oauthRedirectUrl = resolveOAuthRedirectUrl(req);
  const misconfiguredSite =
    NODE_ENV === 'production' &&
    (!oauthRedirectUrl || /localhost|127\.0\.0\.1/i.test(oauthRedirectUrl));

  success(res, {
    /** true solo si el navegador puede usar Supabase Auth (anon key presente). */
    configured: AUTH_CLIENT_ENABLED,
    serverAuth: AUTH_ENABLED,
    supabaseUrl: AUTH_CLIENT_ENABLED ? SUPABASE_URL : '',
    supabaseAnonKey: AUTH_CLIENT_ENABLED ? SUPABASE_ANON_KEY : '',
    oauthRedirectUrl,
    supabaseRedirectUrls: oauthRedirectUrl
      ? [
          `${oauthRedirectUrl}/login`,
          `${oauthRedirectUrl}/login?tab=onboarding`,
          `${oauthRedirectUrl}/login?tab=new-password`,
          `${oauthRedirectUrl}/**`,
        ]
      : [],
    hint: !AUTH_CLIENT_ENABLED && AUTH_ENABLED
      ? 'Añade SUPABASE_ANON_KEY en backend/.env (Settings → API en Supabase).'
      : misconfiguredSite
        ? 'En Render define FRONTEND_URL=https://tu-frontend (sin localhost). En Supabase → Auth → URL Configuration, Site URL = esa misma URL pública del Angular.'
        : null,
  });
};
