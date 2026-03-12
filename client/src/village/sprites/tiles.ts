import * as PIXI from 'pixi.js';
import { PALETTE } from './colors.js';

const TILE_W = 64;
const TILE_H = 32;

export function createGrassTile(renderer: PIXI.Renderer, variant: number = 0): PIXI.Texture {
  const g = new PIXI.Graphics();
  const color = PALETTE.grass[variant % PALETTE.grass.length];

  // Diamond tile shape
  g.poly([TILE_W / 2, 0, TILE_W, TILE_H / 2, TILE_W / 2, TILE_H, 0, TILE_H / 2], true);
  g.fill(color);

  // Subtle grass blades
  const darker = darken(color, 0.88);
  for (let i = 0; i < 3; i++) {
    const dx = 15 + (variant * 7 + i * 13) % 30;
    const dy = 8 + (variant * 5 + i * 11) % 14;
    g.rect(dx, dy, 2, 3);
    g.fill({ color: darker, alpha: 0.5 });
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

export function createPathTile(renderer: PIXI.Renderer): PIXI.Texture {
  const g = new PIXI.Graphics();

  g.poly([TILE_W / 2, 0, TILE_W, TILE_H / 2, TILE_W / 2, TILE_H, 0, TILE_H / 2], true);
  g.fill(PALETTE.path[0]);

  // Cobblestones
  g.rect(20, 12, 6, 4);
  g.fill({ color: PALETTE.path[1], alpha: 0.4 });
  g.rect(36, 16, 5, 3);
  g.fill({ color: PALETTE.path[1], alpha: 0.4 });
  g.rect(28, 8, 4, 4);
  g.fill({ color: PALETTE.path[1], alpha: 0.4 });

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

export function createTreeSprite(renderer: PIXI.Renderer, variant: number = 0): PIXI.Texture {
  const g = new PIXI.Graphics();
  const leafColor = PALETTE.treeLeaves[variant % PALETTE.treeLeaves.length];

  // Shadow on ground
  g.ellipse(14, 38, 10, 3);
  g.fill({ color: 0x000000, alpha: 0.1 });

  // Trunk
  g.rect(11, 24, 6, 14);
  g.fill(PALETTE.treeTrunk);

  // Foliage layers (back to front, dark to light)
  g.circle(14, 20, 12);
  g.fill(darken(leafColor, 0.75));

  g.circle(14, 16, 11);
  g.fill(leafColor);

  g.circle(12, 12, 7);
  g.fill(darken(leafColor, 1.15));

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

export function createFlowerSprite(renderer: PIXI.Renderer, variant: number = 0): PIXI.Texture {
  const g = new PIXI.Graphics();
  const color = PALETTE.flowerColors[variant % PALETTE.flowerColors.length];

  // Stem
  g.rect(5, 6, 2, 8);
  g.fill(0x27ae60);

  // Petals
  g.circle(6, 4, 4);
  g.fill(color);

  // Center
  g.circle(6, 4, 2);
  g.fill(0xf1c40f);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

export function createLampPost(renderer: PIXI.Renderer): PIXI.Texture {
  const g = new PIXI.Graphics();

  // Glow aura
  g.circle(9, 6, 10);
  g.fill({ color: PALETTE.lampGlow, alpha: 0.15 });

  // Post
  g.rect(7, 8, 4, 26);
  g.fill(PALETTE.lampPost);

  // Lamp head
  g.rect(3, 2, 12, 7);
  g.fill(PALETTE.lampGlow);

  // Base
  g.rect(4, 32, 10, 4);
  g.fill(PALETTE.lampPost);

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

function darken(color: number, factor: number): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor));
  const gr = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((color & 0xff) * factor));
  return (r << 16) | (gr << 8) | b;
}
