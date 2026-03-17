import * as PIXI from 'pixi.js';
import { PALETTE, hashColor } from './colors.js';

const CHAR_SIZE = 24;

export function createCharacterTextures(
  renderer: PIXI.Renderer,
  agentId: string
): { active: PIXI.Texture[]; idle: PIXI.Texture; error: PIXI.Texture[] } {
  const skin = hashColor(agentId, PALETTE.skinTones);
  const shirt = hashColor(agentId + 'shirt', PALETTE.shirtColors);
  const pants = hashColor(agentId + 'pants', PALETTE.pantsColors);
  const hair = hashColor(agentId + 'hair', PALETTE.hairColors);

  const idle = drawCharFrame(renderer, skin, shirt, pants, hair, 'idle', 0);
  const active1 = drawCharFrame(renderer, skin, shirt, pants, hair, 'active', 0);
  const active2 = drawCharFrame(renderer, skin, shirt, pants, hair, 'active', 1);
  const error1 = drawCharFrame(renderer, skin, shirt, pants, hair, 'error', 0);
  const error2 = drawCharFrame(renderer, skin, shirt, pants, hair, 'error', 1);

  return { active: [active1, active2], idle, error: [error1, error2] };
}

function drawCharFrame(
  renderer: PIXI.Renderer,
  skin: number,
  shirt: number,
  pants: number,
  hair: number,
  state: 'idle' | 'active' | 'error',
  frame: number
): PIXI.Texture {
  const g = new PIXI.Graphics();
  const s = CHAR_SIZE;
  const cx = s / 2;

  const isError = state === 'error';
  const bounce = state === 'active' ? (frame === 0 ? -2 : 0) : 0;
  const armOffset = state === 'active' ? (frame === 0 ? -3 : 2) : 0;
  const wobbleX = isError ? (frame === 0 ? -1 : 1) : 0;

  // Shadow
  g.ellipse(cx + wobbleX, s - 2, 6, 2);
  g.fill({ color: 0x000000, alpha: 0.15 });

  // Legs
  g.rect(cx - 4 + wobbleX, s - 10 + bounce, 3, 7);
  g.fill(pants);
  g.rect(cx + 1 + wobbleX, s - 10 + bounce, 3, 7);
  g.fill(pants);

  // Body
  g.rect(cx - 5 + wobbleX, s - 18 + bounce, 10, 9);
  g.fill(shirt);

  // Arms
  if (isError) {
    g.rect(cx - 7 + wobbleX, s - 27, 3, 5);
    g.fill(skin);
    g.rect(cx + 4 + wobbleX, s - 27, 3, 5);
    g.fill(skin);
  } else {
    g.rect(cx - 7, s - 16 + bounce + armOffset, 3, 6);
    g.fill(skin);
    g.rect(cx + 4, s - 16 + bounce - armOffset, 3, 6);
    g.fill(skin);
  }

  // Head
  g.rect(cx - 4 + wobbleX, s - 24 + bounce, 8, 7);
  g.fill(skin);

  // Hair
  g.rect(cx - 4 + wobbleX, s - 25 + bounce, 8, 3);
  g.fill(hair);

  // Eyes
  if (isError) {
    g.rect(cx - 2 + wobbleX, s - 22, 2, 3);
    g.fill(0xcc2222);
    g.rect(cx + 1 + wobbleX, s - 22, 2, 3);
    g.fill(0xcc2222);
  } else {
    g.rect(cx - 2, s - 21 + bounce, 2, 2);
    g.fill(0x000000);
    g.rect(cx + 1, s - 21 + bounce, 2, 2);
    g.fill(0x000000);
  }

  // Active: sparkle/star above head
  if (state === 'active') {
    const starY = s - 28 + bounce + (frame === 0 ? -1 : 1);
    g.star(cx, starY, 4, 3, 1.5);
    g.fill(0xf1c40f);
  }

  // Idle: "Zzz" dots
  if (state === 'idle') {
    g.rect(cx + 5, s - 28, 2, 2);
    g.fill({ color: 0x95a5a6, alpha: 0.7 });
    g.rect(cx + 8, s - 31, 2, 2);
    g.fill({ color: 0x95a5a6, alpha: 0.7 });
  }

  // Error: red "!" bobbing above head
  if (isError) {
    const exclY = s - 33 + (frame === 0 ? 0 : 1);
    g.rect(cx - 1 + wobbleX, exclY, 2, 4);
    g.fill(0xe04040);
    g.rect(cx - 1 + wobbleX, exclY + 5, 2, 2);
    g.fill(0xe04040);
  }

  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}
