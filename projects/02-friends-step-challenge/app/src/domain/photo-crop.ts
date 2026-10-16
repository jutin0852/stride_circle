export type PhotoCrop = { originX: number; originY: number; width: number; height: number };
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function getPhotoCrop(width: number, height: number, zoom = 1, x = 0.5, y = 0.5): PhotoCrop {
  if (![width, height, zoom, x, y].every(Number.isFinite) || width < 1 || height < 1) throw new Error('Invalid photo dimensions.');
  const side = Math.max(1, Math.floor(Math.min(width, height) / clamp(zoom, 1, 3)));
  return { width: side, height: side, originX: Math.floor((width - side) * clamp(x, 0, 1)), originY: Math.floor((height - side) * clamp(y, 0, 1)) };
}
