import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { createCharacterTextures } from '../village/sprites/characters.js';
import { PALETTE, hashColor, darkenColor, lightenColor } from '../village/sprites/colors.js';
import { friendlyNames, friendlyElapsed, friendlyWorkerStatus, friendlySource } from '../utils/humanize.js';
import { getAvatarDataUrl } from '../utils/avatars.js';
import type { HumanLingo } from '../hooks/useHumanLingo.js';
import type { Project, Agent } from '@shared/types';

interface Props {
  project: Project;
  onClose: () => void;
  humanLingo: HumanLingo;
}

const INTERIOR_W = 520;
const INTERIOR_H = 340;

export function InteriorView({ project, onClose, humanLingo }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const container = canvasRef.current;
    const app = new PIXI.Application();
    let destroyed = false;

    const init = async () => {
      await app.init({
        width: INTERIOR_W,
        height: INTERIOR_H,
        backgroundColor: 0x3a3028,
        antialias: false,
        resolution: 2,
        autoDensity: true,
      });

      if (destroyed) return;
      container.appendChild(app.canvas);
      appRef.current = app;

      drawInterior(app, project);
    };

    init();

    return () => {
      destroyed = true;
      if (appRef.current) {
        // Do NOT call app.destroy(true) — it destroys the WebGL renderer
        // which can invalidate shared GPU resources (texture pools, buffers)
        // used by the village's PIXI Application, blanking the village.
        appRef.current.ticker.stop();
        const canvas = appRef.current.canvas;
        if (canvas.parentElement) {
          canvas.parentElement.removeChild(canvas);
        }
        appRef.current.stage.removeChildren().forEach(c => c.destroy({ children: true }));
        appRef.current = null;
      }
    };
  }, [project.id]);

  const accent = getAccentForProject(project.name);
  const workingCount = project.agents.filter(a => a.status === 'working').length;
  const waitingCount = project.agents.filter(a => a.status === 'waiting').length;
  const statusSummary = friendlyWorkerStatus(workingCount, waitingCount, project.agents.length);
  const nameMap = friendlyNames(project.agents);

  return (
    <>
      <div className="fixed inset-0 bg-black/75 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-village-900 rounded-xl shadow-2xl overflow-hidden max-w-3xl w-full animate-slideIn"
          style={{ maxHeight: '90vh' }}
        >
          {/* Interior canvas */}
          <div className="relative">
            <div
              ref={canvasRef}
              className="w-full flex justify-center bg-village-950"
              style={{ imageRendering: 'pixelated' }}
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-white/70 hover:text-white bg-village-900/70 rounded-full w-7 h-7 flex items-center justify-center text-sm font-pixel"
            >
              x
            </button>
          </div>

          {/* Store sign bar */}
          <div
            className="px-5 py-3 flex items-center gap-4"
            style={{ backgroundColor: `#${accent.toString(16).padStart(6, '0')}44` }}
          >
            <div className="flex-1">
              <h2 className="font-pixel text-sm text-white">{project.name}</h2>
              <p className="text-[10px] text-white/70 font-mono truncate mt-0.5">{project.path}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <span className={`text-[10px] font-pixel ${workingCount > 0 ? 'text-green-400' : 'text-white/70'}`}>
                {statusSummary}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={humanLingo.toggle}
                  className={`font-pixel text-[10px] px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${
                    humanLingo.loading
                      ? 'bg-amber-900/50 text-amber-300 border-amber-700 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                      : humanLingo.active
                        ? 'bg-amber-900/50 text-amber-300 border-amber-700 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'bg-village-800 text-white/50 border-village-600 hover:text-white/70 hover:border-village-500'
                  }`}
                >
                  {humanLingo.loading && (
                    <span className="inline-block w-3 h-3 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                  )}
                  {humanLingo.loading
                    ? 'Translating...'
                    : humanLingo.active
                      ? 'Human Lingo ON'
                      : 'Human Lingo'}
                </button>
                {humanLingo.active && humanLingo.degraded && (
                  <span
                    className="text-[9px] font-pixel text-red-400/80 cursor-help"
                    title="ANTHROPIC_API_KEY not set in .env — using basic text cleanup instead of LLM translation"
                  >
                    No API key
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Agent cards */}
          <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: '40vh' }}>
            {project.agents.map(agent => (
              <AgentRow
                key={agent.id}
                agent={agent}
                displayName={nameMap.get(agent.id)!}
                isExpanded={expanded === agent.id}
                onToggle={() => setExpanded(expanded === agent.id ? null : agent.id)}
                getLabel={humanLingo.getLabel}
                isTranslating={humanLingo.active && humanLingo.loading}
              />
            ))}
            {project.agents.length === 0 && (
              <p className="text-white/50 text-xs font-pixel text-center py-6">
                No agents detected
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function AgentRow({ agent, displayName, isExpanded, onToggle, getLabel, isTranslating }: { agent: Agent; displayName: string; isExpanded: boolean; onToggle: () => void; getLabel: (agent: Agent) => string | undefined; isTranslating: boolean }) {
  const name = displayName;
  const task = getLabel(agent);
  const avatarUrl = getAvatarDataUrl(agent.id, 32);

  return (
    <div
      className="bg-village-800 rounded-lg px-3 py-2.5 hover:bg-village-750 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        {/* Pixel character avatar */}
        <div className="flex-shrink-0 relative">
          <img
            src={avatarUrl}
            alt={name}
            className="w-8 h-8"
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Status dot on avatar */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-village-800 ${
            agent.status === 'working'
              ? 'bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]'
              : 'bg-gray-500'
          }`} />
        </div>

        {/* Name and task */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[10px] text-white">{name}</span>
            <span className={`text-[9px] font-pixel px-1.5 py-0.5 rounded ${
              agent.source === 'cursor'
                ? 'bg-blue-900/40 text-blue-300 border border-blue-800'
                : 'bg-orange-900/40 text-orange-300 border border-orange-800'
            }`}>
              {friendlySource(agent.source)}
            </span>
          </div>
          {isTranslating ? (
            <div className="mt-1 h-3 w-3/4 rounded bg-gradient-to-r from-village-700 via-village-600 to-village-700 bg-[length:200%_100%] animate-shimmer" />
          ) : task ? (
            <p className="text-[10px] text-white/70 truncate mt-0.5">{task}</p>
          ) : null}
        </div>

        {/* Right side: time */}
        {agent.startedAt && <FriendlyTime startedAt={agent.startedAt} />}
      </div>
    </div>
  );
}

function FriendlyTime({ startedAt }: { startedAt: string }) {
  const [text, setText] = useState('');

  useEffect(() => {
    const update = () => setText(friendlyElapsed(startedAt));
    update();
    const iv = setInterval(update, 10_000);
    return () => clearInterval(iv);
  }, [startedAt]);

  return <span className="text-[9px] font-pixel text-white/60 flex-shrink-0">{text}</span>;
}

function getAccentForProject(name: string): number {
  return hashColor(name, PALETTE.accentColors);
}

function drawCrate(g: PIXI.Graphics, x: number, y: number, w: number, h: number, color: number): void {
  const d = 3;

  // Top face
  g.poly([x, y, x + d, y - d, x + w + d, y - d, x + w, y], true);
  g.fill(lightenColor(color, 1.25));

  // Right face
  g.poly([x + w, y, x + w + d, y - d, x + w + d, y + h - d, x + w, y + h], true);
  g.fill(darkenColor(color, 0.7));

  // Front face
  g.rect(x, y, w, h);
  g.fill(color);

  // Wooden bands
  g.rect(x + 1, y + Math.floor(h * 0.35), w - 2, 1);
  g.fill({ color: darkenColor(color, 0.75), alpha: 0.6 });
  g.rect(x + 1, y + Math.floor(h * 0.65), w - 2, 1);
  g.fill({ color: darkenColor(color, 0.75), alpha: 0.6 });
}

function drawInterior(app: PIXI.Application, project: Project): void {
  const g = new PIXI.Graphics();
  const accent = getAccentForProject(project.name);
  const W = INTERIOR_W;
  const H = INTERIOR_H;
  const floorY = Math.floor(H * 0.62);

  // === BACK WALL ===
  g.rect(0, 0, W, floorY);
  g.fill(0x8a7a68);

  // Lower wall section (wainscoting)
  g.rect(0, Math.floor(H * 0.35), W, floorY - Math.floor(H * 0.35));
  g.fill(0x7a6a58);

  // === FLOOR ===
  g.rect(0, floorY, W, H - floorY);
  g.fill(0x4a3a28);

  // Floor planks - horizontal
  for (let i = 0; i < 9; i++) {
    g.rect(0, floorY + i * 15, W, 1);
    g.fill({ color: 0x3a2a18, alpha: 0.35 });
  }
  // Floor planks - vertical
  for (let i = 0; i < 12; i++) {
    g.rect(i * 48 + 20, floorY, 1, H - floorY);
    g.fill({ color: 0x3a2a18, alpha: 0.18 });
  }

  // === WINDOW (right side) ===
  const winX = W - 90;
  const winY = 18;
  const winW = 60;
  const winH = 70;
  g.rect(winX - 4, winY - 4, winW + 8, winH + 8);
  g.fill(0x6a5a48);
  g.rect(winX, winY, winW, winH);
  g.fill(0x8abacc);
  g.rect(winX + winW / 2 - 1, winY, 2, winH);
  g.fill(0x6a5a48);
  g.rect(winX, winY + winH / 2 - 1, winW, 2);
  g.fill(0x6a5a48);
  // Light rays
  g.poly([winX + winW, winY + winH, winX + winW + 35, floorY, winX + winW, floorY], true);
  g.fill({ color: 0xf8e8c0, alpha: 0.06 });
  // Curtains
  g.rect(winX - 6, winY - 4, 7, winH + 12);
  g.fill(0xb89868);
  g.rect(winX + winW - 1, winY - 4, 7, winH + 12);
  g.fill(0xb89868);

  // === LARGE SHELF SYSTEM ===
  const shelfX = 14;
  const shelfW = Math.floor(W * 0.62);
  const shelfLevels = [35, 78, 120];

  // Shelf frame - vertical posts
  g.rect(shelfX, 8, 4, floorY - 14);
  g.fill(0x5a4030);
  g.rect(shelfX + shelfW - 4, 8, 4, floorY - 14);
  g.fill(0x5a4030);
  g.rect(shelfX + Math.floor(shelfW / 2), 8, 3, floorY - 14);
  g.fill(0x5a4030);

  const crateColors = [accent, 0xc87533, 0x6b9ebe, 0x8b6b33, 0xa08060, 0x4a7a4a, 0x8868a8, 0xc85050];

  for (let si = 0; si < shelfLevels.length; si++) {
    const shelfY = shelfLevels[si];

    // Shelf board
    g.rect(shelfX, shelfY, shelfW, 4);
    g.fill(0x6a5040);
    // Shelf board edge highlight
    g.rect(shelfX, shelfY, shelfW, 1);
    g.fill({ color: 0x8a7060, alpha: 0.5 });

    // Crates on this shelf
    let cx = shelfX + 8;
    for (let i = 0; cx < shelfX + shelfW - 14; i++) {
      const cw = 14 + ((i * 7 + si * 5) % 10);
      const ch = 14 + ((i * 5 + si * 7) % 12);
      const color = crateColors[(i + si * 3) % crateColors.length];
      drawCrate(g, cx, shelfY - ch, cw, ch, color);
      cx += cw + 3 + (i % 3);
    }
  }

  // === HANGING LIGHTS ===
  for (let lx = 0; lx < 3; lx++) {
    const lightX = 80 + lx * 180;
    g.rect(lightX, 0, 1, 14);
    g.fill(0x4a4a4a);
    g.poly([lightX - 6, 14, lightX + 6, 14, lightX + 4, 20, lightX - 4, 20], true);
    g.fill(0x3a3a3a);
    g.circle(lightX, 24, 16);
    g.fill({ color: 0xf8e8c0, alpha: 0.07 });
    g.circle(lightX, 22, 9);
    g.fill({ color: 0xf8e8c0, alpha: 0.11 });
    g.circle(lightX, 19, 2.5);
    g.fill(0xf8e8c0);
  }

  // === FLOOR CRATE STACKS ===
  // Stack left
  drawCrate(g, 28, floorY + 18, 22, 18, 0x8b6b33);
  drawCrate(g, 32, floorY + 2, 18, 16, 0xc87533);

  // Stack center-right
  drawCrate(g, W - 160, floorY + 22, 24, 20, 0xa08060);
  drawCrate(g, W - 157, floorY + 5, 20, 17, accent);

  // Single crate right
  drawCrate(g, W - 58, floorY + 28, 26, 22, 0x6b9ebe);

  // Small crate center
  drawCrate(g, Math.floor(W / 2) + 30, floorY + 38, 18, 14, 0x4a7a4a);

  // Open crate (no lid, showing items inside)
  const openX = Math.floor(W / 2) - 40;
  const openY = floorY + 30;
  g.rect(openX, openY, 20, 16);
  g.fill(0x8b6b33);
  g.rect(openX + 2, openY + 2, 16, 8);
  g.fill(darkenColor(0x8b6b33, 0.6));
  // Items peeking out
  g.rect(openX + 3, openY + 3, 5, 6);
  g.fill(0xc87533);
  g.rect(openX + 10, openY + 4, 4, 5);
  g.fill(0x6b9ebe);

  // === HAND CART / DOLLY ===
  const cartX = W - 108;
  const cartY = floorY + 65;
  g.rect(cartX, cartY, 32, 3);
  g.fill(0x5a4030);
  g.rect(cartX + 30, cartY - 22, 2, 24);
  g.fill(0x4a4a4a);
  // Handle grip
  g.rect(cartX + 28, cartY - 22, 6, 2);
  g.fill(0x3a3a3a);
  // Wheels
  g.circle(cartX + 6, cartY + 5, 4);
  g.fill(0x3a3a3a);
  g.circle(cartX + 6, cartY + 5, 2);
  g.fill(0x2a2a2a);
  g.circle(cartX + 26, cartY + 5, 4);
  g.fill(0x3a3a3a);
  g.circle(cartX + 26, cartY + 5, 2);
  g.fill(0x2a2a2a);
  // Crate on cart
  drawCrate(g, cartX + 4, cartY - 16, 20, 16, 0xc85050);

  // === WALL POSTER with project accent ===
  g.rect(Math.floor(W * 0.68), 32, 42, 36);
  g.fill(accent);
  g.rect(Math.floor(W * 0.68), 32, 42, 36);
  g.stroke({ width: 2, color: darkenColor(accent, 0.7) });

  app.stage.addChild(g);

  // === AGENTS (walking around the interior) ===
  const agents = project.agents;
  const walkers: {
    container: PIXI.Container;
    sprite: PIXI.Sprite;
    textures: { active: PIXI.Texture[]; idle: PIXI.Texture };
    box: PIXI.Graphics;
    speed: number;
    dir: number;
    minX: number;
    maxX: number;
    isActive: boolean;
    frame: number;
  }[] = [];

  const floorMinY = floorY + 36;
  const floorMidY = floorY + 49;
  const floorMaxY = floorY + 62;
  const floorRows = [floorMinY, floorMaxY, floorMidY];

  const padX = 40;
  const usableW = W - padX * 2;
  const spacing = Math.max(36, Math.min(70, usableW / agents.length));

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const textures = createCharacterTextures(app.renderer, agent.id);
    const isActive = agent.status === 'working';

    const container = new PIXI.Container();
    const startX = padX + i * spacing + spacing / 2;
    const rowY = floorRows[i % floorRows.length];
    container.x = startX;
    container.y = rowY;

    const sprite = new PIXI.Sprite(isActive ? textures.active[0] : textures.idle);
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(1.4);
    container.addChild(sprite);

    // Carried box (Graphics child so it moves with the container)
    const boxColor = hashColor(agent.id + 'box', PALETTE.accentColors);
    const box = new PIXI.Graphics();
    box.rect(-6, -31, 12, 10);
    box.fill(boxColor);
    box.rect(-6, -31, 12, 1);
    box.fill(lightenColor(boxColor, 1.3));
    box.rect(-5, -27, 10, 1);
    box.fill({ color: darkenColor(boxColor, 0.7), alpha: 0.5 });
    box.visible = isActive;
    container.addChild(box);

    app.stage.addChild(container);

    const speed = 0.3 + ((i * 7) % 5) * 0.12;
    walkers.push({
      container,
      sprite,
      textures,
      box,
      speed,
      dir: i % 2 === 0 ? 1 : -1,
      minX: 30,
      maxX: W - 30,
      isActive,
      frame: 0,
    });
  }

  // Animate only working agents; idle ones stand still
  app.ticker.add(() => {
    for (const w of walkers) {
      if (!w.isActive) continue;

      w.container.x += w.speed * w.dir;
      if (w.container.x >= w.maxX) {
        w.dir = -1;
        w.sprite.scale.x = -1.4;
      }
      if (w.container.x <= w.minX) {
        w.dir = 1;
        w.sprite.scale.x = 1.4;
      }

      w.frame = (w.frame + 1) % 30;
      if (w.frame === 0 || w.frame === 15) {
        w.sprite.texture = w.textures.active[w.frame === 0 ? 0 : 1];
      }
    }
  });

  // === FLOOR RUG ===
  const rugG = new PIXI.Graphics();
  rugG.rect(Math.floor(W / 2) - 55, Math.floor(H * 0.83), 110, 32);
  rugG.fill({ color: accent, alpha: 0.12 });
  rugG.rect(Math.floor(W / 2) - 51, Math.floor(H * 0.83) + 3, 102, 26);
  rugG.fill({ color: accent, alpha: 0.08 });
  app.stage.addChild(rugG);
}
