export type BoundsRect = { x: number; y: number; width: number; height: number };

/** viewBox ajustado al trazado (mismo tamaño visual en todas las cards). */
export function viewBoxFromPathD(pathD: string, padRatio = 0.1): string {
  const d = pathD.trim();
  if (!d || typeof document === 'undefined') return '0 0 300 170';

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  const pathEl = document.createElementNS(svgNs, 'path');
  pathEl.setAttribute('d', d);
  svg.appendChild(pathEl);
  document.body.appendChild(svg);

  try {
    const b = pathEl.getBBox();
    if (!Number.isFinite(b.width) || b.width < 1 || !Number.isFinite(b.height) || b.height < 1) {
      return '0 0 300 170';
    }
    const pad = Math.max(b.width, b.height) * padRatio;
    return `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`;
  } finally {
    svg.remove();
  }
}

/** Bounding box del trazado visible en un PNG (ignora transparencia). */
export function measureImageOpaqueBounds(
  img: HTMLImageElement,
  alphaThreshold = 24,
): BoundsRect | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h || typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Factor de escala extra tras `object-fit: contain` para que el trazado llene la card.
 */
export function extraScaleForOpaqueImage(
  img: HTMLImageElement,
  containerW: number,
  containerH: number,
  bounds: BoundsRect,
  fill = 0.93,
): number {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh || !containerW || !containerH || !bounds.width || !bounds.height) {
    return 1;
  }

  const containerAR = containerW / containerH;
  const imageAR = nw / nh;
  let dispW: number;
  let dispH: number;
  if (imageAR > containerAR) {
    dispW = containerW;
    dispH = containerW / imageAR;
  } else {
    dispH = containerH;
    dispW = containerH * imageAR;
  }

  const bboxDispW = (bounds.width / nw) * dispW;
  const bboxDispH = (bounds.height / nh) * dispH;
  const scaleW = (containerW * fill) / bboxDispW;
  const scaleH = (containerH * fill) / bboxDispH;
  const scale = Math.min(scaleW, scaleH);
  return Math.max(1, Math.min(scale, 2.35));
}
