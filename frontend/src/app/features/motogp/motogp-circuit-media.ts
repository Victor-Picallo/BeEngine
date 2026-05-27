/** SVG «info» de Pulse (sectores de color) — no usar como mapa. */
export function isPulseSectorCircuitUrl(url: string | null | undefined): boolean {
  const u = (url ?? '').trim();
  if (!u) return false;
  return /\/info\/[^/]+\.svg/i.test(u) || /\/track\/[^/]+\.svg/i.test(u) || /sector/i.test(u);
}

const isBeengineMediaUrl = (url: string): boolean => /beengine-media/i.test(url);

/** PNG blanco de Pulse (`/simple/`) — invisible sobre tarjeta clara; usar canvas con fondo oscuro. */
export function isPulseSimpleCircuitUrl(url: string | null | undefined): boolean {
  const u = (url ?? '').trim();
  if (!u) return false;
  return /\/simple\/[^/]+\.(png|webp)/i.test(u) || /photos\.motogp\.com/i.test(u);
}

function isSvgUrl(url: string): boolean {
  return /\.svg(\?|$)/i.test(url) || /-svg\.svg/i.test(url);
}

/** URL válida para minimapa (Supabase o PNG simple de Pulse). */
export function resolveMotogpCircuitMapUrl(
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const raw of candidates) {
    const url = (raw ?? '').trim();
    if (!url) continue;
    if (isPulseSectorCircuitUrl(url)) continue;
    return url;
  }
  return null;
}

export {
  hasVerifiedCircuitOutline,
  hasVerifiedCircuitOutlineForRace,
} from '../calendar/circuit-outline-lookup';

/**
 * @deprecated Cards usan trazados GPS (circuit-outline-lookup), no SVG de Pulse.
 */
export function resolveMotogpCircuitCardOutlineSvgUrl(
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const raw of candidates) {
    const url = (raw ?? '').trim();
    if (!url || !isSvgUrl(url)) continue;
    if (isPulseSimpleCircuitUrl(url)) continue;
    return url;
  }
  return null;
}

/** @deprecated Usar resolveMotogpCircuitCardOutlineSvgUrl */
export function resolveMotogpCircuitCardImageUrl(
  ..._candidates: (string | null | undefined)[]
): string | null {
  return null;
}

/** @deprecated Usar resolveMotogpCircuitCardOutlineSvgUrl */
export function resolveMotogpCircuitCardSvgUrl(
  ...candidates: (string | null | undefined)[]
): string | null {
  return resolveMotogpCircuitCardOutlineSvgUrl(...candidates);
}

/**
 * Imagen de circuito para minimapa en vivo: prioriza Supabase frente al PNG blanco de Pulse Live.
 */
export function resolveMotogpCircuitDisplayUrl(
  ...candidates: (string | null | undefined)[]
): string | null {
  const urls = candidates.map((u) => (u ?? '').trim()).filter(Boolean);
  const outline = resolveMotogpCircuitCardOutlineSvgUrl(...urls);
  if (outline) return outline;
  const supabase = urls.find((u) => isBeengineMediaUrl(u) && !isPulseSectorCircuitUrl(u));
  if (supabase) return supabase;
  const map = resolveMotogpCircuitMapUrl(...urls);
  if (map && isPulseSimpleCircuitUrl(map)) return null;
  if (map && isPulseSectorCircuitUrl(map)) return null;
  return map;
}
