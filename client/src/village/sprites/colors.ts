export const PALETTE = {
  grass: [0x7ec850, 0x6ab840, 0x8cd860, 0x5ea830],
  path: [0xd4b896, 0xc4a876],
  sky: 0x6b9ebe,

  // Warm storefront accent colors (awnings, signs, trims)
  accentColors: [
    0x8b3a3a, // deep red
    0x3a5f8b, // slate blue
    0xc87533, // burnt orange
    0x6b4a8b, // plum
    0x2d7d6b, // forest teal
    0x8b6b33, // mustard
    0x4a7a4a, // sage green
    0x7a4a5a, // mauve
  ],

  // Roof tiles
  roofColors: [
    0x5a3a2a, // dark brown
    0x4a3a4a, // dark plum
    0x3a4a5a, // slate
    0x6a4a3a, // warm brown
    0x3a5a4a, // dark green
    0x5a4a3a, // umber
  ],

  // Exterior walls - warm stone/brick tones
  wallStone: 0xd8c8a8,
  wallStoneDark: 0xc4b494,
  wallBrick: 0xb89878,
  wallBrickDark: 0xa08060,
  wallCream: 0xe8dcc8,
  wallCreamDark: 0xd4c8b0,

  // Window and interior lighting
  windowGlowBright: 0xf5deb3,
  windowGlowWarm: 0xe8c878,
  windowGlowDim: 0xd4a850,
  windowFrame: 0x6a5a4a,
  windowFrameLight: 0x8a7a6a,

  // Wood elements
  woodDark: 0x5a3a2a,
  woodMedium: 0x7a5a3a,
  woodLight: 0x9a7a5a,

  // Door
  doorDark: 0x5a3a20,
  doorLight: 0x7a5a3a,
  doorHandle: 0xd4a840,

  // Awning (will be striped with accent + white)
  awningWhite: 0xf0e8d8,

  // Interior elements
  interiorFloor: 0x6a5040,
  interiorWall: 0xc8b898,
  interiorShelf: 0x7a5a3a,
  interiorShelfItems: [0xc87533, 0x6b9ebe, 0x8b6b33, 0xa08060, 0x4a7a4a],

  // Characters
  skinTones: [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524],
  shirtColors: [0xc85050, 0x5080c8, 0x50a868, 0xc89040, 0x8868a8, 0x50a8a0],
  pantsColors: [0x3a3a4a, 0x4a4a5a, 0x5a5a6a],
  hairColors: [0x2c1b0e, 0x4a3728, 0x8b6914, 0xd4a017, 0x8b3a2a],

  // Nature
  treeTrunk: 0x6a4a2a,
  treeLeaves: [0x3a7a3a, 0x4a8a4a, 0x2a6a3a],
  flowerColors: [0xc85050, 0xe8c040, 0x8868a8, 0xc87090, 0xe89050],
  lampPost: 0x4a4a4a,
  lampGlow: 0xf8e8c0,
  fenceColor: 0xb8a080,

  // Fire and smoke
  fireYellow: 0xffdd44,
  fireOrange: 0xff8800,
  fireRed: 0xcc2200,
  smoke: 0x444444,
  fireGlow: 0xff6600,
};

export function hashColor(str: string, colors: number[]): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function darkenColor(color: number, factor: number): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

export function lightenColor(color: number, factor: number): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor + 255 * (factor - 1)));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor + 255 * (factor - 1)));
  const b = Math.min(255, Math.floor((color & 0xff) * factor + 255 * (factor - 1)));
  return (Math.max(0, r) << 16) | (Math.max(0, g) << 8) | Math.max(0, b);
}

/**
 * WCAG 2.1 relative luminance.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(color: number): number {
  const sR = ((color >> 16) & 0xff) / 255;
  const sG = ((color >> 8) & 0xff) / 255;
  const sB = (color & 0xff) / 255;
  const R = sR <= 0.04045 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const G = sG <= 0.04045 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const B = sB <= 0.04045 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * WCAG 2.1 contrast ratio between two colors (1:1 to 21:1).
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function contrastRatio(fg: number, bg: number): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
