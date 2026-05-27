import { projectCircuitCoords } from '../calendar/official-circuits';
import { findCircuitOutlineForRace } from '../calendar/circuit-outline-lookup';

const FALLBACK_PATH: [number, number][] = [
  [120, 78], [128, 70], [140, 62], [152, 58], [160, 52], [172, 48], [184, 46], [196, 46],
  [208, 48], [218, 54], [224, 64], [222, 76], [214, 84], [202, 88], [190, 86], [180, 80],
  [174, 70], [178, 60], [188, 58], [198, 64], [200, 74], [192, 80], [182, 82],
  [172, 86], [160, 92], [148, 100], [136, 108], [124, 116], [112, 122], [100, 126],
  [88, 126], [76, 122], [66, 114], [62, 102], [64, 90], [70, 80], [78, 74], [88, 72],
  [98, 74], [108, 80], [114, 90], [112, 100], [104, 108], [96, 116], [90, 124],
  [100, 130], [114, 132], [128, 130], [140, 124], [148, 116], [152, 106], [158, 98],
  [168, 96], [180, 98], [192, 102], [204, 106], [216, 108], [228, 108], [238, 104],
  [244, 98], [242, 90], [236, 86], [228, 88], [224, 96], [230, 104], [240, 108],
  [228, 112], [214, 116], [200, 118], [186, 118], [172, 116], [158, 114], [144, 114],
  [132, 116], [120, 118], [108, 116], [100, 110], [96, 100], [98, 90], [106, 84], [114, 80], [120, 78],
];

export interface MapDot {
  pos: number;
  short: string;
  teamColor: string;
}

export const buildCircuitPath = (circuitName: string, locality = ''): [number, number][] => {
  const official = findCircuitOutlineForRace({ circuitName, locality });
  if (official && official.coords.length >= 30) {
    const projected = projectCircuitCoords(official.coords);
    if (projected.length >= 30) return projected;
  }
  return [];
};

const hasUsablePath = (path: [number, number][]): boolean => path.length >= 30;

const fitPathToCanvas = (
  path: [number, number][],
  W: number,
  H: number,
): [number, number][] => {
  const minX = Math.min(...path.map((p) => p[0]));
  const maxX = Math.max(...path.map((p) => p[0]));
  const minY = Math.min(...path.map((p) => p[1]));
  const maxY = Math.max(...path.map((p) => p[1]));
  const dx = Math.max(maxX - minX, 1);
  const dy = Math.max(maxY - minY, 1);
  const scale = Math.min((W - 40) / dx, (H - 40) / dy) * 0.85;
  const offX = (W - dx * scale) / 2 - minX * scale;
  const offY = (H - dy * scale) / 2 - minY * scale;
  return path.map(([x, y]) => [x * scale + offX, y * scale + offY]);
};

const strokeTrack = (
  ctx: CanvasRenderingContext2D,
  tp: [number, number][],
  accent: string,
) => {
  ctx.beginPath();
  tp.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = accent + '55';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.beginPath();
  tp.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
};

const drawF1StyleBackdrop = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  accent: string,
  frame: number,
) => {
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, W, H);

  try {
    const grad = (ctx as CanvasRenderingContext2D & { createConicGradient?: (a: number, x: number, y: number) => CanvasGradient })
      .createConicGradient?.(frame * 0.02, W / 2, H / 2);
    if (grad) {
      grad.addColorStop(0, accent + '00');
      grad.addColorStop(0.08, accent + '25');
      grad.addColorStop(0.12, accent + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.max(W, H), 0, Math.PI * 2);
      ctx.fill();
    }
  } catch {
    /* createConicGradient no disponible */
  }

  [0.2, 0.4, 0.6, 0.8, 1.0].forEach((r) => {
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, r * Math.min(W, H) * 0.5, 0, Math.PI * 2);
    const alpha = Math.max(0, 0.1 - r * 0.06);
    ctx.strokeStyle =
      accent.length === 7 && accent.startsWith('#')
        ? `rgba(${Number.parseInt(accent.slice(1, 3), 16)},${Number.parseInt(accent.slice(3, 5), 16)},${Number.parseInt(accent.slice(5, 7), 16)},${alpha})`
        : accent + '1a';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  ctx.strokeStyle = accent + '1a';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
};

export interface CircuitMapAnimationHandle {
  stop: () => void;
}

/**
 * Minimapa animado al estilo F1 live: radar, trazado con acento y dots por equipo.
 */
export const startCircuitMapAnimation = (
  canvas: HTMLCanvasElement,
  circuitName: string,
  dots: MapDot[],
  options: {
    accent: string;
    locality?: string;
    /** Contorno ya cargado (p. ej. desde SVG MotoGP en Supabase). */
    externalPath?: [number, number][] | null;
    /** 0–100 progreso de vuelta del líder; si no se pasa, animación continua. */
    lapProgress?: number;
    zone?: { runOutsideAngular: (fn: () => void) => void };
  },
): CircuitMapAnimationHandle => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { stop: () => {} };

  let animId: number | null = null;
  let mapProgress = Math.min(100, Math.max(0, options.lapProgress ?? 12));
  const fixedProgress = options.lapProgress !== undefined;

  const rawPath = hasUsablePath(options.externalPath ?? [])
    ? (options.externalPath as [number, number][])
    : buildCircuitPath(circuitName, options.locality);
  const trackPath = hasUsablePath(rawPath) ? rawPath : FALLBACK_PATH;

  const W = canvas.width;
  const H = canvas.height;
  const tp = fitPathToCanvas(trackPath, W, H);

  const colors = dots.map((d) => d.teamColor);
  const names = dots.map((d) => d.short);
  const showDots = dots.length > 0;

  const FRAME_MS = 50;
  let lastTs = -Infinity;
  let frame = 0;

  const draw = (now = performance.now()) => {
    if (now - lastTs < FRAME_MS) {
      animId = requestAnimationFrame(draw);
      return;
    }
    lastTs = now;

    drawF1StyleBackdrop(ctx, W, H, options.accent, frame);
    strokeTrack(ctx, tp, options.accent);

    const total = tp.length;
    if (!showDots) {
      if (!fixedProgress) mapProgress = (mapProgress + 0.12) % 100;
      frame++;
      animId = requestAnimationFrame(draw);
      return;
    }

    const N = colors.length;
    for (let di = 0; di < N; di++) {
      const off = di / N;
      const rawIdx = (((mapProgress / 100 + off) % 1) * total);
      const idx = Math.floor(rawIdx) % total;
      const next = (idx + 1) % total;
      const t = rawIdx - Math.floor(rawIdx);
      const px = tp[idx][0] + (tp[next][0] - tp[idx][0]) * t;
      const py = tp[idx][1] + (tp[next][1] - tp[idx][1]) * t;
      const color = colors[di] ?? options.accent;

      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;

      if (di < 3) {
        const grd = ctx.createRadialGradient(px, py, 0, px, py, 8);
        grd.addColorStop(0, color + '99');
        grd.addColorStop(1, color + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, di === 0 ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      if (di === 0) {
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '700 9px "Barlow Condensed", sans-serif';
        ctx.fillText(names[di], px + 7, py - 5);
      }
    }

    if (!fixedProgress) {
      mapProgress = (mapProgress + 0.12) % 100;
    } else {
      mapProgress = Math.min(100, Math.max(0, options.lapProgress ?? mapProgress));
    }

    frame++;
    animId = requestAnimationFrame(draw);
  };

  const run = () => draw();
  if (options.zone) options.zone.runOutsideAngular(run);
  else run();

  return {
    stop: () => {
      if (animId !== null) cancelAnimationFrame(animId);
      animId = null;
    },
  };
};
