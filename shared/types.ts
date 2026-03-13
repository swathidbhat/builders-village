export type AgentStatus = 'working' | 'waiting' | 'done';
export type AgentSource = 'cursor' | 'claude-code' | 'codex';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  source: AgentSource;
  currentTask?: string;
  lastAction?: string;
  startedAt?: string;
  elapsedMs?: number;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  agents: Agent[];
  gridPosition: { x: number; y: number };
}

export interface VillageState {
  projects: Project[];
  lastUpdated: string;
}

export interface ServerToClientEvents {
  'village:state': (state: VillageState) => void;
}

export interface HumanizeResponse {
  texts: Record<string, string>;
  usedLLM: boolean;
}

export interface ClientToServerEvents {
  'village:request-state': () => void;
  'village:humanize': (
    texts: string[],
    callback: (result: HumanizeResponse) => void,
  ) => void;
}
