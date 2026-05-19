const CLOUD_TRANSFORM =
  'https://media.formula1.com/image/upload/c_fit,h_520,w_1320,q_auto,f_auto/f_auto/q_auto';

const CONSTRUCTOR_LOGO_URL = {
  audi: `${CLOUD_TRANSFORM}/v1740000001/common/f1/2026/audi/2026audilogo.webp`,
  cadillac: `${CLOUD_TRANSFORM}/v1740000001/common/f1/2026/cadillac/2026cadillaclogo.webp`,
};

const LOGO_SLUG_OVERRIDE = {
  sauber: 'kick%20sauber',
  racing_bulls: 'rb',
};

const CAR_CLOUD =
  'https://media.formula1.com/image/upload/c_fit,h_720,w_1280,q_auto,f_auto/f_auto/q_auto';

const CAR_2026 = {
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

/** @param {string} constructorId */
export function f1TeamCarImageUrl(constructorId) {
  const id = (constructorId || '').trim().toLowerCase();
  const m = CAR_2026[id];
  if (!m) return null;
  return `${CAR_CLOUD}/v1740000001/common/f1/2026/${m.folder}/${m.fileBase}carright.webp`;
}

/** @param {string} constructorId */
export function f1TeamShowcaseImageUrl(constructorId) {
  const id = (constructorId || '').trim().toLowerCase();
  if (!id) return null;
  if (CONSTRUCTOR_LOGO_URL[id]) return CONSTRUCTOR_LOGO_URL[id];
  const slug = LOGO_SLUG_OVERRIDE[id] ?? encodeURIComponent(id.replace(/_/g, ' '));
  return `${CLOUD_TRANSFORM}/content/dam/fom-website/2018-redesign-assets/team%20logos/${slug}.png`;
}
