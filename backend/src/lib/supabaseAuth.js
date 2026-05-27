import { createClient } from '@supabase/supabase-js';
import {
  AUTH_ENABLED,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '../config/env.js';

let authClient = null;

export function authConfigured() {
  return AUTH_ENABLED;
}

export function getSupabaseAuthClient() {
  if (!AUTH_ENABLED) return null;
  if (!authClient) {
    const key = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
    authClient = createClient(SUPABASE_URL, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return authClient;
}

/** @param {string} accessToken */
export async function verifyAccessToken(accessToken) {
  const supabase = getSupabaseAuthClient();
  if (!supabase) {
    const err = new Error('Autenticación no configurada en el servidor');
    err.status = 503;
    throw err;
  }
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    const err = new Error('Sesión inválida o expirada');
    err.status = 401;
    throw err;
  }
  return data.user;
}
