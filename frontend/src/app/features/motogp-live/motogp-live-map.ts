import { findOfficialCircuit, projectCircuitCoords } from '../calendar/official-circuits';

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
  const official = findOfficialCircuit(circuitName) ?? findOfficialCircuit(locality);
  if (official && official.coords.length >= 30) {
    const projected = projectCircuitCoords(official.coords);
    if (projected.length >= 30) return projected;
  }
  return FALLBACK_PATH;
};

export interface CircuitMapAnimationHandle {
  stop: () => void;
}

/**
 * Minimapa estilo F1: puntos por posición en el circuito; el líder avanza con mapProgress.
 */
export const startCircuitMapAnimation = (
  canvas: HTMLCanvasElement,
  circuitName: string,
  dots: MapDot[],
  options: {
    accent: string;
    locality?: string;
    /** 0–100 progreso de vuelta del líder */
    lapProgress?: number;
    zone?: { runOutsideAngular: (fn: () => void) => void };
  },
): CircuitMapAnimationHandle => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { stop: () => {} };

  let animId: number | null = null;
  let mapProgress = Math.min(100, Math.max(0, options.lapProgress ?? 12));
  const path = buildCircuitPath(circuitName, options.locality);
  const W = canvas.width;
  const H = canvas.height;

  const minX = Math.min(...path.map((p) => p[0]));
  const maxX = Math.max(...path.map((p) => p[0]));
  const minY = Math.min(...path.map((p) => p[1]));
  const maxY = Math.max(...path.map((p) => p[1]));
  const dx = Math.max(maxX - minX, 1);
  const dy = Math.max(maxY - minY, 1);
  const scale = Math.min((W - 40) / dx, (H - 40) / dy) * 0.85;
  const offX = (W - dx * scale) / 2 - minX * scale;
  const offY = (H - dy * scale) / 2 - minY * scale;
  const tp: [number, number][] = path.map(([x, y]) => [x * scale + offX, y * scale + offY]);

  const colors = dots.map((d) => d.teamColor);
  const names = dots.map((d) => d.short);
  const positions = dots.map((d) => d.pos);
  const showDots = dots.length > 0;

  const FRAME_MS = 50;
  let lastTs = -Infinity;

  const draw = (now = performance.now()) => {
    if (now - lastTs < FRAME_MS) {
      animId = requestAnimationFrame(draw);
      return;
    }
    lastTs = now;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    tp.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = options.accent + '55';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    tp.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = options.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    const total = tp.length;
    if (!showDots) {
      if (options.lapProgress === undefined) {
        mapProgress = (mapProgress + 0.1) % 100;
      } else {
        mapProgress = Math.min(100, Math.max(0, options.lapProgress));
      }
      animId = requestAnimationFrame(draw);
      return;
    }

    const N = positions.length;
    for (let di = 0; di < N; di++) {
      const pos = positions[di] ?? di + 1;
      const off = ((pos - 1) / N) * 0.12;
      const rawIdx = (((mapProgress / 100 - off + 1) % 1) * total);
      const idx = Math.floor(rawIdx) % total;
      const next = (idx + 1) % total;
      const t = rawIdx - Math.floor(rawIdx);
      const px = tp[idx][0] + (tp[next][0] - tp[idx][0]) * t;
      const py = tp[idx][1] + (tp[next][1] - tp[idx][1]) * t;
      const color = colors[di] ?? options.accent;

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

    if (options.lapProgress === undefined) {
      mapProgress = (mapProgress + 0.1) % 100;
    } else {
      mapProgress = Math.min(100, Math.max(0, options.lapProgress));
    }

    animId = requestAnimationFrame(draw);
  };

  const run = () => draw();
  if (options.zone) {
    options.zone.runOutsideAngular(run);
  } else {
    run();
  }

  return {
    stop: () => {
      if (animId !== null) cancelAnimationFrame(animId);
      animId = null;
    },
  };
};
