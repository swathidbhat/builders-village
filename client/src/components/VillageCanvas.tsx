import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { VillageScene } from '../village/VillageScene.js';
import type { VillageState, Project } from '@shared/types';

interface Props {
  state: VillageState;
  onStoreClick: (project: Project) => void;
}

export function VillageCanvas({ state, onStoreClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VillageScene | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const pendingStateRef = useRef<VillageState>(state);
  const readyRef = useRef(false);

  // Always track the latest state
  pendingStateRef.current = state;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const app = new PIXI.Application();
    let destroyed = false;

    const init = async () => {
      await app.init({
        resizeTo: container,
        backgroundColor: 0x3a5a7e,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) return;

      container.appendChild(app.canvas);
      appRef.current = app;

      const scene = new VillageScene(app);
      scene.setStoreClickHandler(onStoreClick);
      sceneRef.current = scene;
      readyRef.current = true;

      // Apply whatever state has arrived by now
      if (pendingStateRef.current.projects.length > 0) {
        scene.updateState(pendingStateRef.current);
      }
    };

    init();

    return () => {
      destroyed = true;
      readyRef.current = false;
      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
      appRef.current = null;
    };
  }, []);

  // Apply state updates once the scene is ready
  useEffect(() => {
    if (readyRef.current && sceneRef.current && state) {
      sceneRef.current.updateState(state);
    }
  }, [state]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setStoreClickHandler(onStoreClick);
    }
  }, [onStoreClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
