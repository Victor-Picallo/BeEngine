/** @typedef {'sec-purple' | 'sec-yellow' | 'sec-green' | 'sec-white'} SectorColor */

const parseSectorMs = (value) => {
  const t = String(value ?? '').trim();
  if (!t || t === '—' || t === '-') return null;
  const lap = t.match(/^(\d+)'(\d{2}\.\d{3})$/);
  if (lap) return Number(lap[1]) * 60_000 + Number.parseFloat(lap[2]) * 1000;
  const sec = Number.parseFloat(t);
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : null;
};

/**
 * Colores de sector al estilo F1: morado = mejor del campo, amarillo = resto con tiempo válido.
 * @param {Array<{ s1?: string; s2?: string; s3?: string; [key: string]: unknown }>} riders
 */
export const applySectorColors = (riders) => {
  const list = riders ?? [];
  const best = { s1: Infinity, s2: Infinity, s3: Infinity };

  for (const r of list) {
    for (const key of ['s1', 's2', 's3']) {
      const ms = parseSectorMs(r[key]);
      if (ms != null && ms < best[key]) best[key] = ms;
    }
  }

  const colorFor = (value, bestMs) => {
    const ms = parseSectorMs(value);
    if (ms == null) return 'sec-white';
    if (bestMs < Infinity && Math.abs(ms - bestMs) < 1) return 'sec-purple';
    return 'sec-yellow';
  };

  return list.map((r) => ({
    ...r,
    s1c: colorFor(r.s1, best.s1),
    s2c: colorFor(r.s2, best.s2),
    s3c: colorFor(r.s3, best.s3),
  }));
};
