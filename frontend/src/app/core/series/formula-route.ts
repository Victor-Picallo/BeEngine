/** Rutas donde el sidebar/topbar muestran F1/F2/F3 en lugar de categorías globales. */
export function isFormulaAppRoute(url: string): boolean {
  const path = url.split('?')[0];
  if (path === '/' || path === '/f2' || path === '/f3') return true;
  return /^\/f[123]\//.test(path);
}
