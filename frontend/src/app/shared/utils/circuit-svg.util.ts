import { findOfficialCircuit, projectCircuitCoords } from '../../features/calendar/official-circuits';

const GENERIC_PATH = 'M 24 92 L 80 28 L 200 40 L 276 92 L 200 142 L 80 130 Z';

export interface CircuitSvgModel {
  circuitPath: string;
  viewBox: string;
  startX: number;
  startY: number;
}

const FALLBACK: CircuitSvgModel = {
  circuitPath: GENERIC_PATH,
  viewBox: '0 0 300 170',
  startX: 24,
  startY: 92,
};

export function buildCircuitSvg(circuitName: string, locality?: string): CircuitSvgModel {
  const official =
    findOfficialCircuit(circuitName) ?? (locality ? findOfficialCircuit(locality) : null);
  if (!official) return FALLBACK;

  const points = projectCircuitCoords(official.coords);
  if (points.length < 3) return FALLBACK;

  const minX = Math.min(...points.map(p => p[0]));
  const maxX = Math.max(...points.map(p => p[0]));
  const minY = Math.min(...points.map(p => p[1]));
  const maxY = Math.max(...points.map(p => p[1]));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min(260 / width, 130 / height);
  const offsetX = (300 - width * scale) / 2 - minX * scale;
  const offsetY = (170 - height * scale) / 2 - minY * scale;
  const projected = points.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);
  const [first, ...rest] = projected;
  const path = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)} ${rest.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}`;

  return {
    circuitPath: path,
    viewBox: '0 0 300 170',
    startX: Number(first[0].toFixed(1)),
    startY: Number(first[1].toFixed(1)),
  };
}
