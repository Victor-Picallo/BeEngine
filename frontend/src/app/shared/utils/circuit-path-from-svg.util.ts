/** Muestrea un path SVG (`d`) a puntos para canvas (minimapa estilo F1). */
export function sampleSvgPathToPoints(
  pathD: string,
  sampleCount = 220,
  viewBox?: string,
): [number, number][] {
  const d = pathD.trim();
  if (!d || typeof document === 'undefined') return [];

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  if (viewBox) svg.setAttribute('viewBox', viewBox);

  const pathEl = document.createElementNS(svgNs, 'path');
  pathEl.setAttribute('d', d);
  svg.appendChild(pathEl);
  document.body.appendChild(svg);

  try {
    const len = pathEl.getTotalLength();
    if (!Number.isFinite(len) || len < 1) return [];

    const raw: [number, number][] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const pt = pathEl.getPointAtLength((i / sampleCount) * len);
      if (Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
        raw.push([pt.x, pt.y]);
      }
    }
    return raw;
  } finally {
    svg.remove();
  }
}

function pathBBoxArea(pathEl: SVGPathElement): number {
  try {
    const b = pathEl.getBBox();
    if (!Number.isFinite(b.width) || !Number.isFinite(b.height)) return 0;
    return b.width * b.height;
  } catch {
    return 0;
  }
}

/** Elige el path del trazado (mayor área de bbox, no el más largo en caracteres). */
export function pickMainPathD(svgText: string): { d: string; viewBox: string | null } | null {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.querySelector('svg');
  if (!root) return null;

  const viewBox = root.getAttribute('viewBox');
  const svgNs = 'http://www.w3.org/2000/svg';
  const measureRoot = document.createElementNS(svgNs, 'svg');
  if (viewBox) measureRoot.setAttribute('viewBox', viewBox);
  document.body.appendChild(measureRoot);

  try {
    const paths = [...doc.querySelectorAll('path[d]')];
    if (!paths.length) return null;

    let bestD = '';
    let bestArea = 0;

    for (const p of paths) {
      const d = (p.getAttribute('d') ?? '').trim();
      if (d.length < 24) continue;

      const clone = document.createElementNS(svgNs, 'path');
      clone.setAttribute('d', d);
      measureRoot.appendChild(clone);
      const area = pathBBoxArea(clone);
      measureRoot.removeChild(clone);

      if (area > bestArea) {
        bestArea = area;
        bestD = d;
      }
    }

    if (!bestD) {
      const fallback = paths[0].getAttribute('d')?.trim() ?? '';
      return fallback ? { d: fallback, viewBox } : null;
    }

    return { d: bestD, viewBox };
  } finally {
    measureRoot.remove();
  }
}

const pathCache = new Map<string, [number, number][]>();

/** Carga y cachea el contorno de un SVG de circuito (Supabase / Pulse info). */
export async function fetchCircuitPathFromSvgUrl(url: string): Promise<[number, number][] | null> {
  const key = url.trim();
  if (!key) return null;
  const hit = pathCache.get(key);
  if (hit) return hit;

  try {
    const res = await fetch(key, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const text = await res.text();
    const picked = pickMainPathD(text);
    if (!picked) return null;
    const points = sampleSvgPathToPoints(picked.d, 220, picked.viewBox ?? undefined);
    if (points.length < 30) return null;
    pathCache.set(key, points);
    return points;
  } catch {
    return null;
  }
}

export function pickCircuitSvgUrl(
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const raw of candidates) {
    const u = (raw ?? '').trim();
    if (!u) continue;
    if (/\.svg(\?|$)/i.test(u) || u.includes('-svg.svg')) return u;
  }
  return null;
}
