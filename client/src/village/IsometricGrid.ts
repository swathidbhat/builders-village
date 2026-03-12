export const TILE_W = 64;
export const TILE_H = 32;

export function tileToScreen(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: (tileX - tileY) * (TILE_W / 2),
    y: (tileX + tileY) * (TILE_H / 2),
  };
}

export function screenToTile(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: Math.floor(screenX / TILE_W + screenY / TILE_H),
    y: Math.floor(screenY / TILE_H - screenX / TILE_W),
  };
}

export function tileToScreenCenter(tileX: number, tileY: number): { x: number; y: number } {
  const pos = tileToScreen(tileX, tileY);
  return {
    x: pos.x + TILE_W / 2,
    y: pos.y + TILE_H / 2,
  };
}
