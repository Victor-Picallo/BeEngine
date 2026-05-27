import type { AuthError } from '@supabase/supabase-js';

const MAP: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu email antes de iniciar sesión.',
  user_already_registered: 'Ya existe una cuenta con este email.',
  weak_password: 'La contraseña es demasiado débil.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera unos minutos.',
  validation_failed: 'Revisa los datos del formulario.',
};

export function authErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }
  const e = err as AuthError & { message?: string; code?: string };
  if (e.code && MAP[e.code]) return MAP[e.code];
  const msg = (e.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return MAP['invalid_credentials'];
  }
  if (msg.includes('email not confirmed')) {
    return MAP['email_not_confirmed'];
  }
  if (msg.includes('user already registered')) {
    return MAP['user_already_registered'];
  }
  if (msg.includes('password')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  return e.message || 'No se pudo completar la operación. Inténtalo de nuevo.';
}
