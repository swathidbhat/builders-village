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

export function friendlyName(agent: Agent): string {
  return WORKER_NAMES[stableHash(agent.id) % WORKER_NAMES.length];
}

/**
 * Convert a raw `lastAction` string (which may be a tool_use reference like
 * "Write:foo.ts" or "Shell:npm test" or plain text) into human-friendly language.
 */
export function humanizeLastAction(action: string | undefined): string | undefined {
  if (!action) return undefined;

  const colonIdx = action.indexOf(':');
  if (colonIdx > 0 && colonIdx < 20) {
    const toolName = action.slice(0, colonIdx);
    const detail = action.slice(colonIdx + 1).trim();
    return humanizeToolUse(toolName, detail);
  }

  return humanizeTask(action);
}

const TOOL_LABELS: Record<string, string> = {
  Write: 'Writing',
  Read: 'Reading',
  Edit: 'Editing',
  StrReplace: 'Editing',
  Shell: 'Running',
  Bash: 'Running',
  Search: 'Searching for',
  Grep: 'Searching for',
  Glob: 'Finding files',
  ListFiles: 'Finding files',
  WebSearch: 'Researching',
  WebFetch: 'Fetching a page',
  Task: 'Delegating a subtask',
  TodoWrite: 'Updating task list',
  GenerateImage: 'Generating an image',
  SwitchMode: 'Switching modes',
  AskQuestion: 'Asking a question',
  EnterPlanMode: 'Planning',
  ExitPlanMode: 'Starting implementation',
};

export function humanizeToolUse(toolName: string, detail?: string): string {
  const label = TOOL_LABELS[toolName];
  if (!label) return detail ? `${toolName}: ${shortDetail(detail)}` : toolName;

  if (!detail || detail === 'subtask') return label;

  switch (toolName) {
    case 'Write':
    case 'Read':
    case 'Edit':
    case 'StrReplace':
      return `${label} ${shortDetail(detail)}`;
    case 'Shell':
    case 'Bash':
      return humanizeShellCommand(detail) || `${label} a command`;
    case 'Search':
    case 'Grep':
      return `${label} "${shortDetail(detail, 30)}"`;
    case 'Glob':
    case 'ListFiles':
      return `${label} matching ${shortDetail(detail, 30)}`;
    case 'WebSearch':
      return `${label} "${shortDetail(detail, 30)}"`;
    default:
      return label;
  }
}

function shortDetail(s: string, max = 30): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3).replace(/\s+\S*$/, '') + '...';
}

/**
 * Turn raw shell commands and verbose user queries into
 * short, glanceable summaries a non-technical person can understand.
 */
export function humanizeTask(task: string | undefined): string | undefined {
  if (!task) return undefined;

  let t = task.trim();
  const cdMatch = t.match(/^cd\s[^&;]*?(?:&&|;)\s*(.+)/s);
  if (cdMatch) t = cdMatch[1].trim();

  t = t.replace(/\s*2>&1.*$/, '').replace(/\s*&\s*$/, '').trim();

  if (t.includes('&&')) {
    const parts = t.split('&&').map(p => p.trim());
    const meaningful = parts.find(p => !p.startsWith('cd ') && !p.startsWith('sleep'));
    if (meaningful) t = meaningful;
  }

  const result = humanizeShellCommand(t);
  if (result) return result;

  if (/[a-zA-Z]/.test(t) && t.length > 3) {
    return summarizeQuery(t);
  }

  return undefined;
}

function humanizeShellCommand(cmd: string): string | undefined {
  const commands: [RegExp, string][] = [
    [/^lsof\s.*kill/i, 'Clearing a stuck process'],
    [/^kill\s/i, 'Stopping a process'],
    [/npm\s+run\s+dev/i, 'Running dev server'],
    [/npm\s+run\s+build/i, 'Building the project'],
    [/npm\s+run\s+test/i, 'Running tests'],
    [/npm\s+run\s+start/i, 'Starting the app'],
    [/npm\s+run\s+lint/i, 'Checking code style'],
    [/npm\s+install/i, 'Installing packages'],
    [/npx\s+vite/i, 'Running dev server'],
    [/npx\s+playwright\s+test/i, 'Running browser tests'],
    [/npx\s+jest/i, 'Running tests'],
    [/npx\s+create-/i, 'Scaffolding a project'],
    [/npx\s+tsc/i, 'Checking types'],
    [/npx\s+eslint/i, 'Checking code style'],
    [/npx\s+prettier/i, 'Formatting code'],
    [/node\s+server/i, 'Running the server'],
    [/python3?\s+-m\s+http\.server/i, 'Hosting files locally'],
    [/python3?\s+.*\.py/i, 'Running a script'],
    [/pip\s+install/i, 'Installing packages'],
    [/git\s+push/i, 'Pushing code'],
    [/git\s+pull/i, 'Pulling latest code'],
    [/git\s+clone/i, 'Downloading a repo'],
    [/git\s+commit/i, 'Saving a snapshot'],
    [/git\s+merge/i, 'Merging branches'],
    [/git\s+checkout/i, 'Switching branches'],
    [/git\s+stash/i, 'Stashing changes'],
    [/git\s+rebase/i, 'Reorganizing history'],
    [/git\s+status/i, 'Checking changes'],
    [/git\s+diff/i, 'Reviewing changes'],
    [/docker\s+build/i, 'Building a container'],
    [/docker\s+run/i, 'Starting a container'],
    [/docker[\s-]compose\s+up/i, 'Starting services'],
    [/curl\s/i, 'Making a web request'],
    [/wget\s/i, 'Downloading a file'],
    [/mkdir\s/i, 'Creating directories'],
    [/cat\s/i, 'Reading a file'],
    [/ls\s/i, 'Listing files'],
    [/rm\s/i, 'Removing files'],
    [/cp\s/i, 'Copying files'],
    [/mv\s/i, 'Moving files'],
  ];

  for (const [pattern, label] of commands) {
    if (pattern.test(cmd)) return label;
  }

  return undefined;
}

function summarizeQuery(text: string): string {
  const t = text.trim();

  const wantMatch = t.match(/I\s+want\s+(?:you\s+)?to\s+(\w+\s+.{3,40}?)(?:[.,;!\n]|$)/i);
  if (wantMatch && wantMatch[1].length > 6) return capAndTrim(wantMatch[1]);

  const letsMatch = t.match(/Let'?s\s+(\w+\s+.{3,40}?)(?:[.,;!\n]|$)/i);
  if (letsMatch) return capAndTrim(letsMatch[1]);

  const canMatch = t.match(/Can\s+you\s+(\w+\s+.{3,40}?)(?:\?|[.,;!\n]|$)/i);
  if (canMatch) return capAndTrim(canMatch[1]);

  const verbMatch = t.match(/^(open|run|fix|add|create|build|deploy|test|check|update|remove|delete|install|explain|implement|set\s+up|start|stop|restart|show|list|make)\s+(.{3,40}?)(?:[.,;!\n?]|$)/i);
  if (verbMatch) return capAndTrim(`${verbMatch[1]} ${verbMatch[2]}`);

  const howMatch = t.match(/[Hh]ow\s+(?:do|can|would|should)\s+I\s+(.{5,40}?)(?:\?|[.,;!\n]|$)/i);
  if (howMatch && howMatch[1].length > 6) return capAndTrim('How to ' + howMatch[1]);

  const firstClause = t.split(/[.!?\n,;]/)[0].trim();
  if (firstClause.length <= 40) return capAndTrim(firstClause);
  const cut = firstClause.slice(0, 37).replace(/\s+\S*$/, '');
  return capitalizeFirst(cut) + '...';
}

function capAndTrim(s: string): string {
  const cleaned = trimAction(s);
  if (cleaned.length <= 42) return capitalizeFirst(cleaned);
  const cut = cleaned.slice(0, 39).replace(/\s+\S*$/, '');
  return capitalizeFirst(cut) + '...';
}

function trimAction(s: string): string {
  return s.replace(/\s+/g, ' ').trim().replace(/[.,;:!]+$/, '');
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  return source;
}

export function friendlyStatus(status: string): string {
  switch (status) {
    case 'working': return 'Working';
    case 'waiting': return 'Waiting';
    case 'done': return 'Done';
    default: return status;
  }
}
