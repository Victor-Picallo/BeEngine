/** SVG «info» de Pulse con sectores coloreados — no sirve como mapa limpio. */
export const isPulseSectorCircuitUrl = (url) =>
  Boolean(
    url &&
      (/\/info\/[^/]+\.svg/i.test(String(url)) ||
        /\/track\/[^/]+\.svg/i.test(String(url)) ||
        /sector/i.test(String(url))),
  );

/** URL adecuada para el minimapa (PNG simple o SVG en Supabase). */
export const pickCircuitMapUrl = (circuit) => {
  if (!circuit) return null;
  const simple = circuit.imageUrl ?? circuit.image_url ?? null;
  const svg = circuit.svgUrl ?? circuit.svg_url ?? null;
  if (simple) return simple;
  if (svg && !isPulseSectorCircuitUrl(svg)) return svg;
  return null;
};
