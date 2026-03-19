import type { Agent } from '@shared/types';

const WORKER_NAMES = [
  'Ada', 'Blake', 'Casey', 'Drew', 'Ellis',
  'Finn', 'Gray', 'Harper', 'Indigo', 'Jules',
  'Kit', 'Lane', 'Morgan', 'Noel', 'Onyx',
  'Parker', 'Quinn', 'Reese', 'Sage', 'Tatum',
  'Uri', 'Val', 'Wren', 'Xen', 'Yael', 'Zara',
];

function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const SUFFIXES = ['Jr', 'III', 'IV', 'V', 'VI'];

export function friendlyName(agent: Agent): string {
  return WORKER_NAMES[stableHash(agent.id) % WORKER_NAMES.length];
}

export function friendlyNames(agents: Agent[]): Map<string, string> {
  const baseName = new Map<string, string>();
  const nameCount = new Map<string, number>();

  for (const agent of agents) {
    const name = friendlyName(agent);
    baseName.set(agent.id, name);
    nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  const result = new Map<string, string>();
  for (const agent of agents) {
    const name = baseName.get(agent.id)!;
    if (nameCount.get(name)! === 1) {
      result.set(agent.id, name);
    } else {
      const idx = seen.get(name) ?? 0;
      seen.set(name, idx + 1);
      result.set(agent.id, idx === 0 ? name : `${name} ${SUFFIXES[Math.min(idx - 1, SUFFIXES.length - 1)]}`);
    }
  }
  return result;
}

export function friendlyElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 0) return 'just now';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 1) return `${days} days ago`;
  if (days === 1) return 'since yesterday';
  if (hours > 1) return `${hours} hours ago`;
  if (hours === 1) return 'about an hour ago';
  if (minutes > 10) return `${minutes} min ago`;
  if (minutes > 1) return 'a few minutes ago';
  return 'just now';
}

export function friendlyWorkerStatus(workingCount: number, waitingCount: number, totalCount: number): string {
  if (totalCount === 0) return 'No workers here';
  if (workingCount === totalCount) return `All ${totalCount} working`;
  if (workingCount > 0) return `${workingCount} working, ${waitingCount} waiting`;
  if (waitingCount > 0) return `${waitingCount} waiting for you`;
  return `All ${totalCount} done`;
}

export function friendlySource(source: string): string {
  if (source === 'cursor') return 'Cursor';
  if (source === 'claude-code') return 'Claude';
  if (source === 'codex') return 'Codex';
  return source;
}

const TOOL_VERBS: Record<string, string> = {
  Write: 'Writing', Read: 'Reading', Edit: 'Editing',
  Shell: 'Running', Bash: 'Running', Search: 'Searching',
  Grep: 'Searching', Glob: 'Finding files', WebSearch: 'Researching',
  WebFetch: 'Fetching a page', Task: 'Delegating work',
  TodoWrite: 'Planning tasks',
};

/**
 * Lightweight client-side formatting for raw agent activity strings.
 * Handles Tool:detail format and basic text cleanup — no LLM involved.
 */
export function formatActivity(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let t = raw.trim();

  const colonIdx = t.indexOf(':');
  if (colonIdx > 0 && colonIdx < 20) {
    const tool = t.slice(0, colonIdx);
    const detail = t.slice(colonIdx + 1).trim();
    const verb = TOOL_VERBS[tool];
    if (verb) {
      if (!detail || detail === 'subtask') return verb;
      const short = detail.length > 25 ? detail.slice(0, 22) + '...' : detail;
      return `${verb} ${short}`;
    }
  }

  t = t.replace(/<[^>]+>/g, '').trim();
  if (!t || t.length < 2) return undefined;

  if (t.length <= 40) return capitalizeFirst(t);
  const cut = t.slice(0, 37).replace(/\s+\S*$/, '');
  return capitalizeFirst(cut) + '...';
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
