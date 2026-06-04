const LOCALHOST_RE = /localhost|127\.0\.0\.1/i;

export function isLocalhostUrl(url: string): boolean {
  return LOCALHOST_RE.test(url);
}

/**
 * Base URL para redirectTo de Supabase Auth.
 * En build de producción solo acepta el origin actual o environment.appUrl públicos.
 */
export function resolveOAuthRedirectBase(
  fromApi: string,
  options: { production: boolean; appUrl?: string },
): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
  const api = fromApi?.replace(/\/$/, '') ?? '';
  const appUrl = options.appUrl?.replace(/\/$/, '') ?? '';

  if (options.production) {
    if (origin && !isLocalhostUrl(origin)) return origin;
    if (appUrl && !isLocalhostUrl(appUrl)) return appUrl;
    return '';
  }

  if (appUrl) return appUrl;
  if (origin) return origin;
  if (api && !isLocalhostUrl(api)) return api;
  return origin || api || 'http://localhost:4200';
}

export function assertPublicOAuthRedirect(redirectTo: string, production: boolean): void {
  if (!production) return;
  if (!redirectTo || isLocalhostUrl(redirectTo)) {
    throw new Error(
      'OAuth en producción debe usar la URL pública de la app (no localhost). ' +
        'Abre BeEngine desde el dominio desplegado y configura FRONTEND_URL en Render y Site URL en Supabase.',
    );
  }
}
