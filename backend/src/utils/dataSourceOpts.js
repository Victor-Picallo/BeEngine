/**
 * Opciones de resolución de datos según query de la petición HTTP.
 * Sin `refresh=live` → DB primero (rápido). Con `refresh=live` → intenta API en vivo.
 *
 * @param {import('express').Request} [req]
 * @param {Record<string, unknown>} [base]
 */
export function resolveRequestOpts(req, base = {}) {
  const liveRefresh = req?.query?.refresh === 'live';
  return {
    ...base,
    preferDb: liveRefresh ? false : base.preferDb !== false,
  };
}
