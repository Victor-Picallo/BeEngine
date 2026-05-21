import type { SeriesId } from '../../core/series/series.types';
import { f2TeamCarImageUrl, f2TeamLogoUrl } from '../f2/f2-media';
import { f3TeamCarImageUrl, f3TeamLogoUrl } from '../f3/f3-media';

/**
 * Jolpica/Ergast no incluyen URL de monoplaza ni render del coche.
 * OpenF1 tampoco expone imagen por escudería (solo color / nombre vía pilotos).
 *
 * Los activos públicos de Formula1 en `media.formula1.com` incluyen el
 * **logo / marca de equipo** en `…/team%20logos/{slug}.png`, que es lo que
 * suele usarse en la web oficial para identificar cada escudería (incluida
 * en páginas de equipo junto al material del monoplaza).
 *
 * Aquí derivamos `slug` desde `constructorId` de Ergast y aplicamos
 * transformación Cloudinary. Usamos **`c_fit`** (no `c_fill`): `c_fill` recorta
 * al ratio fijo y deja los logos “con zoom” y cortados en la card.
 *
 * Audi y Cadillac no están en el DAM antiguo `team%20logos/`; usan el pack 2026
 * `common/f1/2026/{audi|cadillac}/…` (misma fuente que formula1.com).
 */

const CLOUD_TRANSFORM =
  'https://media.formula1.com/image/upload/c_fit,h_520,w_1320,q_auto,f_auto/f_auto/q_auto';

/** Ergast id → URL completa cuando no existe en `team%20logos/{slug}.png`. */
const CONSTRUCTOR_LOGO_URL: Record<string, string> = {
  audi: `${CLOUD_TRANSFORM}/v1740000001/common/f1/2026/audi/2026audilogo.webp`,
  cadillac: `${CLOUD_TRANSFORM}/v1740000001/common/f1/2026/cadillac/2026cadillaclogo.webp`,
};

/** Ergast id → fragmento ya codificado para la ruta `team%20logos/…` */
const LOGO_SLUG_OVERRIDE: Record<string, string> = {
  /** Si en algún feed aparece `sauber` en lugar de `kick_sauber` */
  sauber: 'kick%20sauber',
  racing_bulls: 'rb',
};

/**
 * URL de imagen oficial de escudería (logo F1.com), o `null` si no hay asset conocido.
 */
export function f1TeamShowcaseImageUrl(constructorId: string, seriesId?: SeriesId): string | null {
  const id = (constructorId || '').trim().toLowerCase();
  if (!id) return null;
  if (seriesId === 'f2') {
    const f2 = f2TeamLogoUrl(id);
    if (f2) return f2;
  }
  if (seriesId === 'f3') {
    const f3 = f3TeamLogoUrl(id);
    if (f3) return f3;
  }
  if (CONSTRUCTOR_LOGO_URL[id]) return CONSTRUCTOR_LOGO_URL[id];

  const slug = LOGO_SLUG_OVERRIDE[id] ?? encodeURIComponent(id.replace(/_/g, ' '));
  const damPath = `content/dam/fom-website/2018-redesign-assets/team%20logos/${slug}.png`;
  return `${CLOUD_TRANSFORM}/${damPath}`;
}

const CAR_CLOUD =
  'https://media.formula1.com/image/upload/c_fit,h_720,w_1280,q_auto,f_auto/f_auto/q_auto';

/**
 * Render lateral del monoplaza (pack 2026 en media.formula1.com).
 * Algunos ids (p. ej. kick_sauber) aún no tienen asset público → `null`.
 */
const CAR_2026: Record<string, { folder: string; fileBase: string }> = {
  red_bull: { folder: 'redbullracing', fileBase: '2026redbullracing' },
  ferrari: { folder: 'ferrari', fileBase: '2026ferrari' },
  mclaren: { folder: 'mclaren', fileBase: '2026mclaren' },
  mercedes: { folder: 'mercedes', fileBase: '2026mercedes' },
  aston_martin: { folder: 'astonmartin', fileBase: '2026astonmartin' },
  alpine: { folder: 'alpine', fileBase: '2026alpine' },
  williams: { folder: 'williams', fileBase: '2026williams' },
  haas: { folder: 'haas', fileBase: '2026haas' },
  rb: { folder: 'racingbulls', fileBase: '2026racingbulls' },
  racing_bulls: { folder: 'racingbulls', fileBase: '2026racingbulls' },
  audi: { folder: 'audi', fileBase: '2026audi' },
  cadillac: { folder: 'cadillac', fileBase: '2026cadillac' },
};

export function f1TeamCarImageUrl(constructorId: string, seriesId?: SeriesId): string | null {
  const id = (constructorId || '').trim().toLowerCase();
  if (!id) return null;
  if (seriesId === 'f2') {
    const f2 = f2TeamCarImageUrl(id);
    if (f2) return f2;
  }
  if (seriesId === 'f3') {
    const f3 = f3TeamCarImageUrl(id);
    if (f3) return f3;
  }
  const m = CAR_2026[id];
  if (!m) return null;
  return `${CAR_CLOUD}/v1740000001/common/f1/2026/${m.folder}/${m.fileBase}carright.webp`;
}
