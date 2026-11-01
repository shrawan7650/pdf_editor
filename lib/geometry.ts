import type { Ann } from './types';
export const bboxOf = (pts: [number, number][]) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};
export const moved = (a: Ann, dx: number, dy: number): Partial<Ann> =>
  ({ x: a.x + dx, y: a.y + dy, ...(a.points ? { points: a.points.map(([x, y]) => [x + dx, y + dy] as [number, number]) } : {}) });
export const resized = (a: Ann, nw: number, nh: number): Partial<Ann> => {
  nw = Math.max(4, nw); nh = Math.max(4, nh);
  if (!a.points) return { w: nw, h: nh };
  const sx = nw / (a.w || 1), sy = nh / (a.h || 1);
  return { w: nw, h: nh, points: a.points.map(([x, y]) => [a.x + (x - a.x) * sx, a.y + (y - a.y) * sy] as [number, number]) };
};
