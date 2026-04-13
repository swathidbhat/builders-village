export type AgentStatus = 'working' | 'waiting' | 'done' | 'error';
export type AgentSource = 'cursor' | 'claude-code' | 'codex';
export type AgentStatusSource = 'realtime' | 'inferred';

export interface SessionMeta {
  projectPath: string;
  transcriptPath?: string;
  sessionId?: string;
  cwd?: string;
}

export interface Agent {
  id: string;
  name: string;
  sessionId: string;
  status: AgentStatus;
  statusSource?: AgentStatusSource;
  source: AgentSource;
  currentTask?: string;
  lastAction?: string;
  errorReason?: string;
  startedAt?: string;
  elapsedMs?: number;
  lastActivityMs?: number;
  sessionMeta?: SessionMeta;
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
