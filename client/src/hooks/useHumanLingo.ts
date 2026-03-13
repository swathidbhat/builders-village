import { useState, useCallback, useRef, useEffect } from 'react';
import type { RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { VillageState, Agent, HumanizeResponse, ServerToClientEvents, ClientToServerEvents } from '@shared/types';
import { formatActivity } from '../utils/humanize.js';

export interface HumanLingo {
  active: boolean;
  loading: boolean;
  /** True when the server returned fallback text (no API key). */
  degraded: boolean;
  toggle: () => void;
  /** Returns the best display label for an agent's activity. */
  getLabel: (agent: Agent) => string | undefined;
}

export function useHumanLingo(
  state: VillageState,
  socketRef: RefObject<Socket<ServerToClientEvents, ClientToServerEvents> | null>,
): HumanLingo {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const cacheRef = useRef(new Map<string, string>());

  const toggle = useCallback(() => setActive(prev => !prev), []);

  useEffect(() => {
    if (!active || !socketRef.current) return;

    const rawSet = new Set<string>();
    for (const project of state.projects) {
      for (const agent of project.agents) {
        const raw = agent.lastAction || agent.currentTask;
        if (raw && !cacheRef.current.has(raw)) {
          rawSet.add(raw);
        }
      }
    }

    if (rawSet.size === 0) return;

    const uncached = Array.from(rawSet);
    setLoading(true);

    socketRef.current.emit('village:humanize', uncached, (result: HumanizeResponse) => {
      for (const [raw, humanized] of Object.entries(result.texts)) {
        cacheRef.current.set(raw, humanized);
      }
      if (!result.usedLLM) {
        setDegraded(true);
      }
      setRenderTick(t => t + 1);
      setLoading(false);
    });
  }, [active, state.lastUpdated, socketRef]);

  const getLabel = useCallback((agent: Agent): string | undefined => {
    const raw = agent.lastAction || agent.currentTask;
    if (!raw) return undefined;
    if (active) {
      return cacheRef.current.get(raw) || formatActivity(raw);
    }
    return formatActivity(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, renderTick]);

  return { active, loading, degraded, toggle, getLabel };
}
