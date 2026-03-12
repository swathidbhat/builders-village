/**
 * Generates a pixel-art character avatar as a data URL using plain HTML Canvas.
 * Each agent gets a unique appearance based on their ID (stable hash for colors).
 */

const SKIN_TONES = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
const SHIRT_COLORS = [0xc85050, 0x5080c8, 0x50a868, 0xc89040, 0x8868a8, 0x50a8a0];
const HAIR_COLORS = [0x2c1b0e, 0x4a3728, 0x8b6914, 0xd4a017, 0x8b3a2a];

const avatarCache = new Map<string, string>();

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function toCSS(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

export function getAvatarDataUrl(agentId: string, size = 32): string {
  const key = `${agentId}-${size}`;
  if (avatarCache.has(key)) return avatarCache.get(key)!;

  const h = hash(agentId);
  const skin = pick(SKIN_TONES, h);
  const shirt = pick(SHIRT_COLORS, hash(agentId + 'shirt'));
  const hair = pick(HAIR_COLORS, hash(agentId + 'hair'));

  const canvas = document.createElement('canvas');
  const s = size;
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const px = s / 16;

  // Hair
  ctx.fillStyle = toCSS(hair);
  ctx.fillRect(5 * px, 1 * px, 6 * px, 2 * px);

  // Head
  ctx.fillStyle = toCSS(skin);
  ctx.fillRect(5 * px, 2 * px, 6 * px, 5 * px);

  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(6 * px, 4 * px, 1.5 * px, 1.5 * px);
  ctx.fillRect(9 * px, 4 * px, 1.5 * px, 1.5 * px);

  // Body
  ctx.fillStyle = toCSS(shirt);
  ctx.fillRect(4 * px, 7 * px, 8 * px, 5 * px);

  // Arms
  ctx.fillStyle = toCSS(skin);
  ctx.fillRect(2 * px, 7 * px, 2 * px, 4 * px);
  ctx.fillRect(12 * px, 7 * px, 2 * px, 4 * px);

  // Legs
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(5 * px, 12 * px, 2.5 * px, 3 * px);
  ctx.fillRect(8.5 * px, 12 * px, 2.5 * px, 3 * px);

  const url = canvas.toDataURL();
  avatarCache.set(key, url);
  return url;
}
