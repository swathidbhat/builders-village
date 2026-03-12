import * as PIXI from 'pixi.js';
import { tileToScreen, TILE_W, TILE_H } from './IsometricGrid.js';
import { createGrassTile, createPathTile, createTreeSprite, createFlowerSprite, createLampPost } from './sprites/tiles.js';
import { createBuildingTexture, BUILDING_W, BUILDING_H, SHOP_WINDOW } from './sprites/buildings.js';
import { createCharacterTextures } from './sprites/characters.js';
import type { VillageState, Project, Agent } from '@shared/types';

const GRID_RADIUS = 14;

interface StoreSprite {
  container: PIXI.Container;
  buildingSprite: PIXI.Sprite;
  projectId: string;
  tileX: number;
  tileY: number;
  nameLabel: PIXI.Text;
  badgeText: PIXI.Text;
  agentSprites: Map<string, AgentSprite>;
  glow: PIXI.Graphics;
}

interface AgentSprite {
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  textures: { active: PIXI.Texture[]; idle: PIXI.Texture };
  animFrame: number;
  box: PIXI.Graphics;
  windowX: number;
  windowY: number;
  patrolMinX: number;
  patrolMaxX: number;
  patrolY: number;
  walkSpeed: number;
  walkDir: number;
}

export class VillageScene {
  private app: PIXI.Application;
  private world: PIXI.Container;
  private groundLayer: PIXI.Container;
  private buildingLayer: PIXI.Container;
  private cloudLayer: PIXI.Container;

  private stores = new Map<string, StoreSprite>();
  private tileTextures: PIXI.Texture[] = [];
  private clouds: { sprite: PIXI.Graphics; speed: number }[] = [];

  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private worldStart = { x: 0, y: 0 };
  private dragDistance = 0;
  private onStoreClick: ((project: Project) => void) | null = null;

  private animTimer = 0;
  private currentState: VillageState | null = null;

  constructor(app: PIXI.Application) {
    this.app = app;

    this.world = new PIXI.Container();
    this.groundLayer = new PIXI.Container();
    this.buildingLayer = new PIXI.Container();
    this.cloudLayer = new PIXI.Container();

    this.world.addChild(this.groundLayer);
    this.world.addChild(this.buildingLayer);

    this.createSkyGradient();
    this.app.stage.addChild(this.world);
    this.app.stage.addChild(this.cloudLayer);

    this.world.x = this.app.screen.width / 2;
    this.world.y = this.app.screen.height / 3;

    this.generateTextures();
    this.renderGround();
    this.createClouds();
    this.setupInteraction();
    this.setupAnimation();
  }

  setStoreClickHandler(handler: (project: Project) => void): void {
    this.onStoreClick = handler;
  }

  updateState(state: VillageState): void {
    this.currentState = state;

    const existingIds = new Set(this.stores.keys());
    const newIds = new Set(state.projects.map(p => p.id));

    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const store = this.stores.get(id)!;
        this.buildingLayer.removeChild(store.container);
        store.container.destroy({ children: true });
        this.stores.delete(id);
      }
    }

    for (const project of state.projects) {
      if (this.stores.has(project.id)) {
        this.updateStore(project);
      } else {
        this.addStore(project);
      }
    }

    this.sortBuildingLayer();
  }

  private generateTextures(): void {
    const renderer = this.app.renderer;
    for (let i = 0; i < 4; i++) {
      this.tileTextures.push(createGrassTile(renderer, i));
    }
  }

  private renderGround(): void {
    const renderer = this.app.renderer;

    for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
      for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y++) {
        const variant = (Math.abs(x * 7 + y * 13)) % this.tileTextures.length;
        const pos = tileToScreen(x, y);
        const sprite = new PIXI.Sprite(this.tileTextures[variant]);
        sprite.x = pos.x;
        sprite.y = pos.y;
        this.groundLayer.addChild(sprite);
      }
    }

    const decorations = this.generateDecorationPositions();
    for (const dec of decorations) {
      const pos = tileToScreen(dec.x, dec.y);
      let texture: PIXI.Texture;

      if (dec.type === 'tree') {
        texture = createTreeSprite(renderer, dec.variant);
      } else if (dec.type === 'flower') {
        texture = createFlowerSprite(renderer, dec.variant);
      } else {
        texture = createLampPost(renderer);
      }

      const sprite = new PIXI.Sprite(texture);
      sprite.x = pos.x + TILE_W / 2 - texture.width / 2;
      sprite.y = pos.y - texture.height + TILE_H;
      this.buildingLayer.addChild(sprite);
    }
  }

  private generateDecorationPositions() {
    const decs: { x: number; y: number; type: 'tree' | 'flower' | 'lamp'; variant: number }[] = [];

    // Dense tree border
    for (let i = -GRID_RADIUS; i <= GRID_RADIUS; i++) {
      if (Math.abs(i) >= GRID_RADIUS - 1) {
        for (let j = -GRID_RADIUS; j <= GRID_RADIUS; j += 2) {
          decs.push({ x: i, y: j, type: 'tree', variant: Math.abs(i + j) % 3 });
          decs.push({ x: j, y: i, type: 'tree', variant: Math.abs(i + j + 1) % 3 });
        }
      }
    }

    // Scatter flowers and lamps inside the village
    const interiorSpots = [
      { x: -3, y: -6, type: 'flower' as const }, { x: 2, y: -5, type: 'flower' as const },
      { x: 6, y: -3, type: 'flower' as const }, { x: -5, y: 2, type: 'flower' as const },
      { x: 4, y: 5, type: 'flower' as const }, { x: -1, y: 7, type: 'flower' as const },
      { x: -6, y: -3, type: 'flower' as const }, { x: 7, y: 1, type: 'flower' as const },
      { x: 1, y: -8, type: 'flower' as const }, { x: -7, y: 4, type: 'flower' as const },
      { x: -3, y: -3, type: 'lamp' as const }, { x: 4, y: 3, type: 'lamp' as const },
      { x: -6, y: 6, type: 'lamp' as const }, { x: 7, y: -4, type: 'lamp' as const },
      { x: 0, y: -9, type: 'lamp' as const }, { x: -8, y: 0, type: 'lamp' as const },
      { x: -2, y: 8, type: 'tree' as const }, { x: 8, y: -1, type: 'tree' as const },
      { x: -8, y: -5, type: 'tree' as const }, { x: 5, y: 8, type: 'tree' as const },
    ];

    for (let i = 0; i < interiorSpots.length; i++) {
      decs.push({ ...interiorSpots[i], variant: i % 5 });
    }

    return decs;
  }

  private createClouds(): void {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    for (let i = 0; i < 5; i++) {
      const cloud = new PIXI.Graphics();
      const w = 60 + Math.random() * 80;
      const h = 16 + Math.random() * 12;

      cloud.ellipse(0, 0, w / 2, h / 2);
      cloud.fill({ color: 0xffffff, alpha: 0.3 + Math.random() * 0.15 });
      cloud.ellipse(-w * 0.25, -h * 0.2, w * 0.35, h * 0.4);
      cloud.fill({ color: 0xffffff, alpha: 0.25 + Math.random() * 0.1 });
      cloud.ellipse(w * 0.2, -h * 0.1, w * 0.3, h * 0.35);
      cloud.fill({ color: 0xffffff, alpha: 0.25 + Math.random() * 0.1 });

      cloud.x = Math.random() * screenW;
      cloud.y = 30 + Math.random() * (screenH * 0.3);

      const speed = 0.15 + Math.random() * 0.25;
      this.cloudLayer.addChild(cloud);
      this.clouds.push({ sprite: cloud, speed });
    }
  }

  private addStore(project: Project): void {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const { x: tileX, y: tileY } = project.gridPosition;
    const pos = tileToScreen(tileX, tileY);

    // Warm glow behind building (ambient light from shop windows)
    const glow = new PIXI.Graphics();
    glow.ellipse(TILE_W / 2, TILE_H - 8, BUILDING_W * 0.52, 28);
    glow.fill({ color: 0xf8e8c0, alpha: 0.18 });
    glow.ellipse(TILE_W / 2, TILE_H - 4, BUILDING_W * 0.35, 16);
    glow.fill({ color: 0xf8e8c0, alpha: 0.12 });
    container.addChild(glow);

    const buildingTexture = createBuildingTexture(this.app.renderer, project.name);
    const buildingSprite = new PIXI.Sprite(buildingTexture);
    buildingSprite.x = -buildingTexture.width / 2 + TILE_W / 2;
    buildingSprite.y = -buildingTexture.height + TILE_H;
    container.addChild(buildingSprite);

    // Lamp post to the right of the building
    const lampTexture = createLampPost(this.app.renderer);
    const lampSprite = new PIXI.Sprite(lampTexture);
    lampSprite.x = buildingSprite.x + BUILDING_W + 4;
    lampSprite.y = buildingSprite.y + BUILDING_H - lampTexture.height - 4;
    container.addChild(lampSprite);

    const displayName = truncateName(project.name, 12);

    // Name on the building's sign banner
    const signY = 105;
    const nameLabel = new PIXI.Text({
      text: displayName,
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 6,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 },
        align: 'center',
        wordWrap: true,
        wordWrapWidth: BUILDING_W - 30,
      },
    });
    nameLabel.anchor.set(0.5, 0.5);
    nameLabel.x = buildingSprite.x + BUILDING_W / 2;
    nameLabel.y = buildingSprite.y + signY + 8;
    container.addChild(nameLabel);

    // Agent count badge (top-right of building)
    const badgeBg = new PIXI.Graphics();
    const badgeX = buildingSprite.x + BUILDING_W - 6;
    const badgeY = buildingSprite.y + 12;
    badgeBg.circle(badgeX, badgeY, 9);
    badgeBg.fill(0xc85050);
    container.addChild(badgeBg);

    const badgeText = new PIXI.Text({
      text: `${project.agents.length}`,
      style: {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 7,
        fill: 0xffffff,
      },
    });
    badgeText.anchor.set(0.5);
    badgeText.x = badgeX;
    badgeText.y = badgeY;
    container.addChild(badgeText);

    container.x = pos.x;
    container.y = pos.y;

    // Fade in
    container.alpha = 0;
    const fadeIn = () => {
      container.alpha = Math.min(1, container.alpha + 0.05);
      if (container.alpha < 1) requestAnimationFrame(fadeIn);
    };
    requestAnimationFrame(fadeIn);

    // Hover
    container.on('pointerenter', () => {
      container.scale.set(1.04);
      glow.alpha = 2.5;
    });
    container.on('pointerleave', () => {
      container.scale.set(1);
      glow.alpha = 1;
    });

    // Click (only if not dragging)
    container.on('pointertap', (e) => {
      if (this.dragDistance > 5) return;
      e.stopPropagation();
      if (this.onStoreClick && this.currentState) {
        const p = this.currentState.projects.find(pr => pr.id === project.id);
        if (p) this.onStoreClick(p);
      }
    });

    this.buildingLayer.addChild(container);

    const store: StoreSprite = {
      container,
      buildingSprite,
      projectId: project.id,
      tileX,
      tileY,
      nameLabel,
      badgeText,
      agentSprites: new Map(),
      glow,
    };

    this.addAgentSprites(store, project.agents);
    this.stores.set(project.id, store);
  }

  private updateStore(project: Project): void {
    const store = this.stores.get(project.id);
    if (!store) return;

    const displayName = truncateName(project.name, 12);
    if (store.nameLabel.text !== displayName) {
      store.nameLabel.text = displayName;
    }

    // Update badge count
    const newBadge = `${project.agents.length}`;
    if (store.badgeText.text !== newBadge) {
      store.badgeText.text = newBadge;
    }

    // Update glow intensity for active agents
    const hasActive = project.agents.some(a => a.status === 'active');
    store.glow.alpha = hasActive ? 1.8 : 1.0;

    // Sync agents
    const existingAgentIds = new Set(store.agentSprites.keys());
    const newAgentIds = new Set(project.agents.map(a => a.id));

    for (const id of existingAgentIds) {
      if (!newAgentIds.has(id)) {
        const agentSprite = store.agentSprites.get(id)!;
        store.container.removeChild(agentSprite.container);
        agentSprite.container.destroy({ children: true });
        store.agentSprites.delete(id);
      }
    }

    const newAgents = project.agents.filter(a => !existingAgentIds.has(a.id));
    this.addAgentSprites(store, newAgents);

    for (const agent of project.agents) {
      const agentSprite = store.agentSprites.get(agent.id);
      if (agentSprite) {
        if (agent.status !== 'working' && agent.status !== 'active') {
          agentSprite.sprite.texture = agentSprite.textures.idle;
        }
      }
    }
  }

  private addAgentSprites(store: StoreSprite, agents: Agent[]): void {
    const bx = store.buildingSprite.x;
    const by = store.buildingSprite.y;

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      if (store.agentSprites.has(agent.id)) continue;

      const textures = createCharacterTextures(this.app.renderer, agent.id);
      const agentContainer = new PIXI.Container();

      const isActive = agent.status === 'active' || agent.status === 'working';
      const sprite = new PIXI.Sprite(
        isActive ? textures.active[0] : textures.idle
      );
      sprite.anchor.set(0.5, 1);

      // Window slot position (where idle agents stand)
      const totalIdx = store.agentSprites.size + i;
      const maxInWindow = 3;
      let windowX: number;
      let windowY: number;

      if (totalIdx < maxInWindow) {
        windowX = bx + SHOP_WINDOW.x + 14 + totalIdx * 26;
        windowY = by + SHOP_WINDOW.y + SHOP_WINDOW.h - 4;
      } else {
        const overflowIdx = totalIdx - maxInWindow;
        windowX = bx + BUILDING_W / 2 + 20 + overflowIdx * 14;
        windowY = by + BUILDING_H - 4;
      }

      agentContainer.x = windowX;
      agentContainer.y = windowY;

      // Carried box (visible only when active)
      const box = new PIXI.Graphics();
      box.rect(-6, -19, 12, 10);
      box.fill(0xd4a050);
      box.rect(-6, -19, 12, 1);
      box.fill(0xf0c070);
      box.visible = false;

      agentContainer.addChild(sprite);
      agentContainer.addChild(box);
      store.container.addChild(agentContainer);

      const patrolY = by + BUILDING_H - 4;
      const walkSpeed = 0.4 + ((totalIdx * 7) % 5) * 0.12;

      store.agentSprites.set(agent.id, {
        container: agentContainer,
        sprite,
        textures,
        animFrame: 0,
        box,
        windowX,
        windowY,
        patrolMinX: bx - 5,
        patrolMaxX: bx + BUILDING_W + 20,
        patrolY,
        walkSpeed,
        walkDir: totalIdx % 2 === 0 ? 1 : -1,
      });
    }
  }

  private sortBuildingLayer(): void {
    this.buildingLayer.children.sort((a, b) => a.y - b.y);
  }

  private setupInteraction(): void {
    const stage = this.app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this.app.screen;

    stage.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      this.isDragging = true;
      this.dragDistance = 0;
      this.dragStart = { x: e.globalX, y: e.globalY };
      this.worldStart = { x: this.world.x, y: this.world.y };
    });

    stage.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.globalX - this.dragStart.x;
      const dy = e.globalY - this.dragStart.y;
      this.dragDistance = Math.sqrt(dx * dx + dy * dy);
      this.world.x = this.worldStart.x + dx;
      this.world.y = this.worldStart.y + dy;
    });

    stage.on('pointerup', () => { this.isDragging = false; });
    stage.on('pointerupoutside', () => { this.isDragging = false; });

    this.app.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.max(0.3, Math.min(3, this.world.scale.x * scaleFactor));
      this.world.scale.set(newScale);
    }, { passive: false });
  }

  private setupAnimation(): void {
    this.app.ticker.add(() => {
      this.animTimer += this.app.ticker.deltaMS;

      // Animate characters every 400ms
      if (this.animTimer > 400) {
        this.animTimer = 0;
        this.animateAgents();
      }

      // Animate clouds continuously
      this.animateClouds();

      // Move active agents carrying boxes
      this.moveWalkingAgents();
    });
  }

  private animateAgents(): void {
    if (!this.currentState) return;

    for (const project of this.currentState.projects) {
      const store = this.stores.get(project.id);
      if (!store) continue;

      for (const agent of project.agents) {
        const agentSprite = store.agentSprites.get(agent.id);
        if (!agentSprite) continue;

        if (agent.status === 'active' || agent.status === 'working') {
          agentSprite.animFrame = (agentSprite.animFrame + 1) % 2;
          agentSprite.sprite.texture = agentSprite.textures.active[agentSprite.animFrame];
        }
      }
    }
  }

  private animateClouds(): void {
    const screenW = this.app.screen.width;
    for (const cloud of this.clouds) {
      cloud.sprite.x += cloud.speed;
      if (cloud.sprite.x > screenW + 100) {
        cloud.sprite.x = -100;
      }
    }
  }

  private createSkyGradient(): void {
    const sky = new PIXI.Graphics();
    const w = 5000;
    const totalH = 4000;
    const startX = -500;
    const startY = -500;
    const steps = 10;
    const bandH = totalH / steps;

    const topR = 0x3a, topG = 0x5a, topB = 0x7e;
    const botR = 0xa8, botG = 0xc4, botB = 0xb8;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(topR + (botR - topR) * t);
      const gv = Math.round(topG + (botG - topG) * t);
      const b = Math.round(topB + (botB - topB) * t);
      const color = (r << 16) | (gv << 8) | b;

      sky.rect(startX, startY + i * bandH, w, bandH + 1);
      sky.fill(color);
    }

    // Warm horizon glow at the lower portion
    sky.rect(startX, startY + totalH * 0.75, w, totalH * 0.25);
    sky.fill({ color: 0xf8e8c0, alpha: 0.05 });

    this.app.stage.addChildAt(sky, 0);
  }

  private moveWalkingAgents(): void {
    if (!this.currentState) return;

    for (const project of this.currentState.projects) {
      const store = this.stores.get(project.id);
      if (!store) continue;

      for (const agent of project.agents) {
        const as = store.agentSprites.get(agent.id);
        if (!as) continue;

        const isActive = agent.status === 'active' || agent.status === 'working';

        if (isActive) {
          // Smoothly transition to patrol Y (ground level)
          const dy = as.patrolY - as.container.y;
          if (Math.abs(dy) > 1) {
            as.container.y += dy * 0.08;
          } else {
            as.container.y = as.patrolY;
          }

          // Walk horizontally
          as.container.x += as.walkSpeed * as.walkDir;
          if (as.container.x >= as.patrolMaxX) {
            as.walkDir = -1;
            as.sprite.scale.x = -1;
          }
          if (as.container.x <= as.patrolMinX) {
            as.walkDir = 1;
            as.sprite.scale.x = 1;
          }

          as.box.visible = true;
        } else {
          // Lerp back to window position
          const dxw = as.windowX - as.container.x;
          const dyw = as.windowY - as.container.y;
          if (Math.abs(dxw) > 1 || Math.abs(dyw) > 1) {
            as.container.x += dxw * 0.08;
            as.container.y += dyw * 0.08;
          } else {
            as.container.x = as.windowX;
            as.container.y = as.windowY;
          }
          as.sprite.scale.x = 1;
          as.box.visible = false;
        }
      }
    }
  }

  destroy(): void {
    this.app.destroy(true);
  }
}

function truncateName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 2) + '..';
}
