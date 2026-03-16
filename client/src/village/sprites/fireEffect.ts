import * as PIXI from 'pixi.js';
import { PALETTE } from './colors.js';

const FIRE_COLORS = [PALETTE.fireYellow, PALETTE.fireOrange, PALETTE.fireRed];
const EMBER_COLOR = 0xff4400;
const SMOKE_COLOR = PALETTE.smoke;
const MAX_PARTICLES = 80;
const MAX_SMOKE = 12;

interface Particle {
  gfx: PIXI.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  isSmoke: boolean;
  isEmber: boolean;
}

export class FireEffect {
  private container: PIXI.Container;
  private glowGraphics: PIXI.Graphics;
  private particles: Particle[] = [];
  private spawnX: number;
  private spawnY: number;
  private spawnWidth: number;
  private elapsed = 0;
  private glowPhase = 0;

  constructor(parent: PIXI.Container, x: number, y: number, width: number) {
    this.container = new PIXI.Container();
    this.spawnX = x;
    this.spawnY = y;
    this.spawnWidth = width;

    this.glowGraphics = new PIXI.Graphics();
    this.container.addChild(this.glowGraphics);

    parent.addChild(this.container);
  }

  update(deltaMs: number): void {
    this.elapsed += deltaMs;
    this.glowPhase += deltaMs * 0.003;

    const fireCount = this.particles.filter(p => !p.isSmoke && !p.isEmber).length;
    const smokeCount = this.particles.filter(p => p.isSmoke).length;

    if (fireCount < MAX_PARTICLES && this.elapsed > 20) {
      this.spawnParticle('fire');
      this.spawnParticle('fire');
      this.spawnParticle('fire');
      this.elapsed = 0;
    }
    if (smokeCount < MAX_SMOKE && Math.random() < 0.08) {
      this.spawnParticle('smoke');
    }
    if (Math.random() < 0.12) {
      this.spawnParticle('ember');
    }

    this.updateGlow();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaMs;

      if (p.life <= 0) {
        this.container.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.isEmber) {
        p.vx += (Math.random() - 0.5) * 0.4;
        p.vy += (Math.random() - 0.5) * 0.15 - 0.02;
      } else {
        p.vx += (Math.random() - 0.5) * 0.2;
      }

      const t = 1 - p.life / p.maxLife;

      let alpha: number;
      if (p.isSmoke) {
        alpha = 0.25 * (1 - t);
      } else if (p.isEmber) {
        alpha = t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) * 1.5);
      } else {
        alpha = Math.max(0, 1 - t * 1.1);
      }

      p.gfx.x = p.x;
      p.gfx.y = p.y;
      p.gfx.alpha = alpha;

      if (!p.isSmoke && !p.isEmber) {
        const colorIdx = Math.min(FIRE_COLORS.length - 1, Math.floor(t * FIRE_COLORS.length));
        p.gfx.clear();
        const s = p.size * (1 - t * 0.4);
        p.gfx.rect(-s / 2, -s / 2, s, s);
        p.gfx.fill(FIRE_COLORS[colorIdx]);
      }
    }
  }

  private updateGlow(): void {
    this.glowGraphics.clear();
    const pulse = 0.12 + Math.sin(this.glowPhase) * 0.05 + Math.sin(this.glowPhase * 2.3) * 0.03;
    const cx = this.spawnX + this.spawnWidth / 2;
    const cy = this.spawnY;

    this.glowGraphics.ellipse(cx, cy - 10, this.spawnWidth * 0.7, 30);
    this.glowGraphics.fill({ color: PALETTE.fireGlow, alpha: pulse });

    this.glowGraphics.ellipse(cx, cy - 5, this.spawnWidth * 0.5, 18);
    this.glowGraphics.fill({ color: PALETTE.fireYellow, alpha: pulse * 0.6 });
  }

  private spawnParticle(type: 'fire' | 'smoke' | 'ember'): void {
    const gfx = new PIXI.Graphics();
    const isSmoke = type === 'smoke';
    const isEmber = type === 'ember';

    let size: number;
    let color: number;

    if (isSmoke) {
      size = 5 + Math.random() * 4;
      color = SMOKE_COLOR;
    } else if (isEmber) {
      size = 1 + Math.random() * 1.5;
      color = EMBER_COLOR;
    } else {
      size = 2.5 + Math.random() * 3;
      color = FIRE_COLORS[0];
    }

    gfx.rect(-size / 2, -size / 2, size, size);
    gfx.fill(color);

    const x = this.spawnX + Math.random() * this.spawnWidth;
    let y: number;
    if (isSmoke) {
      y = this.spawnY - 4 - Math.random() * 6;
    } else if (isEmber) {
      y = this.spawnY - Math.random() * 15;
    } else {
      y = this.spawnY + (Math.random() - 0.3) * 8;
    }

    let vx: number, vy: number, life: number;
    if (isSmoke) {
      vx = (Math.random() - 0.5) * 0.3;
      vy = -(0.15 + Math.random() * 0.35);
      life = 2500 + Math.random() * 1500;
    } else if (isEmber) {
      vx = (Math.random() - 0.5) * 1.8;
      vy = -(0.8 + Math.random() * 1.5);
      life = 800 + Math.random() * 1200;
    } else {
      vx = (Math.random() - 0.5) * 0.6;
      vy = -(0.8 + Math.random() * 1.6);
      life = 500 + Math.random() * 900;
    }

    const particle: Particle = {
      gfx, x, y, vx, vy, life, maxLife: life, size, isSmoke, isEmber,
    };

    gfx.x = x;
    gfx.y = y;
    this.container.addChild(gfx);
    this.particles.push(particle);
  }

  destroy(): void {
    for (const p of this.particles) {
      p.gfx.destroy();
    }
    this.particles = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
