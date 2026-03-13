import * as PIXI from 'pixi.js';
import { PALETTE, hashColor, darkenColor } from './colors.js';

export const BUILDING_W = 140;
export const BUILDING_H = 200;

/**
 * Window region where agents are rendered (relative to building origin).
 * VillageScene uses this to position agent sprites inside the shop window.
 */
export const SHOP_WINDOW = {
  x: 10,
  y: 136,
  w: 82,
  h: 46,
};

export function createBuildingTexture(
  renderer: PIXI.Renderer,
  projectName: string,
  doorOpen = false,
): PIXI.Texture {
  const g = new PIXI.Graphics();
  const accent = hashColor(projectName, PALETTE.accentColors);
  const roofColor = hashColor(projectName + 'roof', PALETTE.roofColors);
  const accentDark = darkenColor(accent, 0.7);

  const W = BUILDING_W;
  const H = BUILDING_H;
  const groundY = H - 4;

  // Layout constants
  const roofPeak = 6;
  const roofBase = 30;
  const upperTop = roofBase + 2;
  const corniceY = 90;
  const signTop = 98;
  const signBottom = 112;
  const awningTop = 114;
  const awningBottom = 128;
  const shopTop = 130;

  // ===== BUILDING OUTLINE / BACKGROUND =====
  g.rect(4, roofBase, W - 8, groundY - roofBase);
  g.fill(PALETTE.wallCream);

  // ===== ROOF =====
  g.poly([W / 2, roofPeak, W - 6, roofBase + 2, 6, roofBase + 2], true);
  g.fill(roofColor);

  // Roof edge trim
  g.rect(2, roofBase, W - 4, 4);
  g.fill(PALETTE.wallCreamDark);

  // Dormer window
  const dormerW = 22;
  const dormerH = 16;
  g.rect(W / 2 - dormerW / 2, roofBase - dormerH + 2, dormerW, dormerH);
  g.fill(PALETTE.wallCream);
  g.rect(W / 2 - dormerW / 2 + 3, roofBase - dormerH + 5, dormerW - 6, dormerH - 6);
  g.fill({ color: PALETTE.windowGlowDim, alpha: 0.6 });
  // Dormer cross
  g.rect(W / 2 - 1, roofBase - dormerH + 5, 2, dormerH - 6);
  g.fill(PALETTE.windowFrameLight);

  // ===== UPPER FLOOR =====
  g.rect(4, upperTop, W - 8, corniceY - upperTop);
  g.fill(PALETTE.wallStone);

  // Brick/stone texture lines
  for (let row = 0; row < 5; row++) {
    const y = upperTop + 6 + row * 10;
    g.rect(4, y, W - 8, 1);
    g.fill({ color: PALETTE.wallStoneDark, alpha: 0.2 });
  }

  // Three arched windows on upper floor
  const archWinW = 22;
  const archWinH = 28;
  for (let i = 0; i < 3; i++) {
    const wx = 16 + i * 38;
    drawArchedWindow(g, wx, upperTop + 8, archWinW, archWinH);
  }

  // ===== CORNICE / MOLDING =====
  g.rect(0, corniceY, W, 4);
  g.fill(PALETTE.wallCream);
  g.rect(2, corniceY + 4, W - 4, 3);
  g.fill(PALETTE.wallCreamDark);

  // ===== FLOWER BOX below cornice =====
  g.rect(8, corniceY + 7, W - 16, 5);
  g.fill(darkenColor(PALETTE.woodMedium, 0.85));
  const flowerCols = [0xc87090, 0xe8c040, 0xc85050, 0x8868a8, 0xe89050];
  for (let i = 0; i < 11; i++) {
    const fx = 12 + i * 11;
    const fc = flowerCols[i % flowerCols.length];
    g.circle(fx, corniceY + 5, 3);
    g.fill(fc);
  }
  for (let i = 0; i < 9; i++) {
    g.rect(10 + i * 13, corniceY + 9, 4, 3);
    g.fill(0x3a7a3a);
  }

  // ===== SIGN BANNER =====
  g.rect(10, signTop, W - 20, signBottom - signTop);
  g.fill(accent);
  g.rect(10, signTop, W - 20, signBottom - signTop);
  g.stroke({ width: 1, color: accentDark });

  // Small decorative dots on sign edges
  g.circle(16, signTop + 7, 1.5);
  g.fill({ color: 0xffffff, alpha: 0.4 });
  g.circle(W - 16, signTop + 7, 1.5);
  g.fill({ color: 0xffffff, alpha: 0.4 });

  // ===== STRIPED AWNING =====
  const awningH = awningBottom - awningTop;
  const stripeW = 8;
  for (let sx = 0; sx < W - 4; sx += stripeW) {
    const isAccent = (Math.floor(sx / stripeW)) % 2 === 0;
    const sw = Math.min(stripeW, W - 4 - sx);
    if (sw <= 0) continue;
    g.rect(2 + sx, awningTop, sw, awningH);
    g.fill(isAccent ? accent : PALETTE.awningWhite);
  }
  // Scalloped bottom edge
  for (let sx = 0; sx < W - 4; sx += 10) {
    g.poly([
      2 + sx, awningBottom,
      7 + sx, awningBottom + 4,
      12 + sx, awningBottom
    ], true);
    g.fill((Math.floor(sx / 10)) % 2 === 0 ? accent : PALETTE.awningWhite);
  }

  // ===== GROUND FLOOR WALL =====
  g.rect(4, shopTop, W - 8, groundY - shopTop);
  g.fill(PALETTE.wallBrick);

  // ===== SHOP DISPLAY WINDOW =====
  // Warm interior glow
  g.rect(SHOP_WINDOW.x, SHOP_WINDOW.y, SHOP_WINDOW.w, SHOP_WINDOW.h);
  g.fill(PALETTE.windowGlowWarm);

  // Interior back wall (upper portion)
  g.rect(SHOP_WINDOW.x + 2, SHOP_WINDOW.y + 2, SHOP_WINDOW.w - 4, 12);
  g.fill({ color: PALETTE.interiorWall, alpha: 0.5 });

  // Shelf on back wall
  g.rect(SHOP_WINDOW.x + 4, SHOP_WINDOW.y + 12, SHOP_WINDOW.w - 8, 2);
  g.fill(PALETTE.interiorShelf);

  // Items on shelf
  for (let i = 0; i < 5; i++) {
    const itemX = SHOP_WINDOW.x + 8 + i * 14;
    const itemColor = PALETTE.interiorShelfItems[i % PALETTE.interiorShelfItems.length];
    g.rect(itemX, SHOP_WINDOW.y + 7, 5, 5);
    g.fill(itemColor);
  }

  // Interior floor
  g.rect(SHOP_WINDOW.x + 2, SHOP_WINDOW.y + SHOP_WINDOW.h - 8, SHOP_WINDOW.w - 4, 6);
  g.fill({ color: PALETTE.interiorFloor, alpha: 0.4 });

  // Window frame (thick wooden frame)
  g.rect(SHOP_WINDOW.x - 3, SHOP_WINDOW.y - 3, SHOP_WINDOW.w + 6, 3);
  g.fill(PALETTE.windowFrame);
  g.rect(SHOP_WINDOW.x - 3, SHOP_WINDOW.y + SHOP_WINDOW.h, SHOP_WINDOW.w + 6, 3);
  g.fill(PALETTE.windowFrame);
  g.rect(SHOP_WINDOW.x - 3, SHOP_WINDOW.y, 3, SHOP_WINDOW.h);
  g.fill(PALETTE.windowFrame);
  g.rect(SHOP_WINDOW.x + SHOP_WINDOW.w, SHOP_WINDOW.y, 3, SHOP_WINDOW.h);
  g.fill(PALETTE.windowFrame);

  // Vertical mullions
  const third = Math.floor(SHOP_WINDOW.w / 3);
  g.rect(SHOP_WINDOW.x + third, SHOP_WINDOW.y, 2, SHOP_WINDOW.h);
  g.fill(PALETTE.windowFrameLight);
  g.rect(SHOP_WINDOW.x + third * 2, SHOP_WINDOW.y, 2, SHOP_WINDOW.h);
  g.fill(PALETTE.windowFrameLight);

  // Window glare highlight
  g.rect(SHOP_WINDOW.x + 3, SHOP_WINDOW.y + 3, 6, SHOP_WINDOW.h - 6);
  g.fill({ color: 0xffffff, alpha: 0.1 });

  // ===== DOOR =====
  const doorX = SHOP_WINDOW.x + SHOP_WINDOW.w + 10;
  const doorW = 24;
  const doorH = groundY - shopTop - 6;
  const doorY = shopTop + 4;

  // Door frame
  g.rect(doorX - 2, doorY - 2, doorW + 4, doorH + 4);
  g.fill(PALETTE.windowFrame);

  if (doorOpen) {
    // Dark interior visible through open doorway
    g.rect(doorX, doorY, doorW, doorH);
    g.fill(0x2a1a0a);
    g.rect(doorX + 2, doorY + 2, doorW - 4, doorH - 2);
    g.fill({ color: PALETTE.windowGlowWarm, alpha: 0.25 });

    // Door swung inward (visible as narrow panel on right edge)
    g.rect(doorX + doorW - 8, doorY, 8, doorH);
    g.fill({ color: PALETTE.doorLight, alpha: 0.6 });
    g.rect(doorX + doorW - 6, doorY + 3, 4, doorH * 0.4);
    g.fill({ color: PALETTE.windowGlowBright, alpha: 0.3 });

    // Welcome mat
    g.rect(doorX + 2, doorY + doorH - 4, doorW - 4, 3);
    g.fill({ color: 0x8a5a3a, alpha: 0.5 });
  } else {
    // Closed door
    g.rect(doorX, doorY, doorW, doorH);
    g.fill(PALETTE.doorLight);

    // Upper panel (glass)
    g.rect(doorX + 3, doorY + 3, doorW - 6, doorH * 0.4);
    g.fill({ color: PALETTE.windowGlowBright, alpha: 0.5 });

    // Lower panels
    g.rect(doorX + 3, doorY + doorH * 0.5, doorW - 6, doorH * 0.2);
    g.fill(PALETTE.doorDark);
    g.rect(doorX + 3, doorY + doorH * 0.75, doorW - 6, doorH * 0.2);
    g.fill(PALETTE.doorDark);

    // Door handle
    g.circle(doorX + doorW - 6, doorY + doorH * 0.5, 2);
    g.fill(PALETTE.doorHandle);
  }

  // ===== DOORSTEP =====
  g.rect(doorX - 4, groundY - 2, doorW + 8, 4);
  g.fill(PALETTE.wallStone);

  // ===== HANGING LIGHTS =====
  drawHangingLight(g, SHOP_WINDOW.x + SHOP_WINDOW.w + 4, shopTop + 2);
  drawHangingLight(g, doorX + doorW + 4, shopTop + 2);

  // ===== PLANT POT by door =====
  const potX = doorX + doorW + 8;
  if (potX + 10 < W) {
    g.rect(potX, groundY - 10, 8, 10);
    g.fill(0x8a5a3a);
    g.circle(potX + 4, groundY - 14, 5);
    g.fill(0x3a7a3a);
    g.circle(potX + 2, groundY - 16, 3.5);
    g.fill(0x4a8a4a);
  }

  // ===== GROUND LINE =====
  g.rect(0, groundY, W, H - groundY);
  g.fill(PALETTE.wallStoneDark);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function drawArchedWindow(g: PIXI.Graphics, x: number, y: number, w: number, h: number): void {
  // Frame
  g.rect(x - 2, y, w + 4, h + 2);
  g.fill(PALETTE.windowFrameLight);

  // Glass pane
  g.rect(x, y + 6, w, h - 6);
  g.fill({ color: PALETTE.windowGlowDim, alpha: 0.55 });

  // Arch top (semicircle approximation)
  g.ellipse(x + w / 2, y + 6, w / 2, 7);
  g.fill({ color: PALETTE.windowGlowDim, alpha: 0.45 });

  // Center mullion
  g.rect(x + w / 2 - 1, y + 2, 2, h - 2);
  g.fill(PALETTE.windowFrameLight);

  // Sill
  g.rect(x - 3, y + h, w + 6, 3);
  g.fill(PALETTE.wallCreamDark);
}

function drawHangingLight(g: PIXI.Graphics, x: number, y: number): void {
  g.rect(x, y, 2, 8);
  g.fill(PALETTE.lampPost);
  g.rect(x - 2, y + 8, 6, 4);
  g.fill(0x4a4a4a);
  g.circle(x + 1, y + 10, 4);
  g.fill({ color: PALETTE.lampGlow, alpha: 0.2 });
  g.circle(x + 1, y + 10, 2.5);
  g.fill({ color: PALETTE.lampGlow, alpha: 0.4 });
}
