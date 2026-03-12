import { describe, it, expect } from 'vitest';
import {
  friendlyName,
  humanizeTask,
  humanizeLastAction,
  humanizeToolUse,
  friendlyElapsed,
  friendlyWorkerStatus,
  friendlySource,
} from '../humanize.js';
import type { Agent } from '@shared/types';

function makeAgent(id: string): Agent {
  return { id, name: id, status: 'active', source: 'cursor' };
}

describe('friendlyName', () => {
  it('returns a name from the worker names list', () => {
    const name = friendlyName(makeAgent('test-agent-123'));
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('returns the same name for the same agent ID', () => {
    const a = friendlyName(makeAgent('stable-id'));
    const b = friendlyName(makeAgent('stable-id'));
    expect(a).toBe(b);
  });

  it('returns different names for different IDs (usually)', () => {
    const names = new Set(
      ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'].map(id => friendlyName(makeAgent(id)))
    );
    expect(names.size).toBeGreaterThan(1);
  });
});

describe('humanizeTask', () => {
  it('humanizes npm run dev', () => {
    expect(humanizeTask('npm run dev')).toBe('Running dev server');
  });

  it('humanizes npm install', () => {
    expect(humanizeTask('npm install')).toBe('Installing packages');
  });

  it('humanizes git push', () => {
    expect(humanizeTask('git push')).toBe('Pushing code');
  });

  it('humanizes git commit', () => {
    expect(humanizeTask('git commit -m "fix"')).toBe('Saving a snapshot');
  });

  it('strips cd prefix before humanizing', () => {
    expect(humanizeTask('cd /some/path && npm run dev')).toBe('Running dev server');
  });

  it('returns undefined for empty/null input', () => {
    expect(humanizeTask(undefined)).toBeUndefined();
    expect(humanizeTask('')).toBeUndefined();
  });

  it('summarizes natural language queries', () => {
    const result = humanizeTask('Add a dark mode toggle to the settings page');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});

describe('humanizeToolUse', () => {
  it('formats Write with file path', () => {
    expect(humanizeToolUse('Write', 'src/app.ts')).toBe('Writing src/app.ts');
  });

  it('formats Read with file path', () => {
    expect(humanizeToolUse('Read', 'config.json')).toBe('Reading config.json');
  });

  it('formats Shell with command', () => {
    expect(humanizeToolUse('Shell', 'npm run test')).toBe('Running tests');
    expect(humanizeToolUse('Shell', 'npm test')).toBe('Running a command');
  });

  it('formats Search with pattern', () => {
    expect(humanizeToolUse('Grep', 'handleClick')).toBe('Searching for "handleClick"');
  });

  it('formats unknown tool name', () => {
    expect(humanizeToolUse('CustomTool', 'some detail')).toBe('CustomTool: some detail');
  });

  it('returns label alone when no detail', () => {
    expect(humanizeToolUse('WebFetch')).toBe('Fetching a page');
  });
});

describe('humanizeLastAction', () => {
  it('parses tool_use format (Tool:detail)', () => {
    expect(humanizeLastAction('Write:app.tsx')).toBe('Writing app.tsx');
  });

  it('parses Shell commands', () => {
    expect(humanizeLastAction('Shell:npm run build')).toBe('Building the project');
  });

  it('falls through to humanizeTask for plain text', () => {
    const result = humanizeLastAction('Add a login page');
    expect(result).toBeDefined();
  });

  it('returns undefined for empty input', () => {
    expect(humanizeLastAction(undefined)).toBeUndefined();
  });
});

describe('friendlyElapsed', () => {
  it('shows "just now" for recent timestamps', () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(friendlyElapsed(recent)).toBe('just now');
  });

  it('shows minutes for older timestamps', () => {
    const mins = new Date(Date.now() - 15 * 60_000).toISOString();
    expect(friendlyElapsed(mins)).toBe('15 min ago');
  });

  it('shows hours for much older timestamps', () => {
    const hours = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(friendlyElapsed(hours)).toBe('3 hours ago');
  });

  it('shows days for very old timestamps', () => {
    const days = new Date(Date.now() - 3 * 86400_000).toISOString();
    expect(friendlyElapsed(days)).toBe('3 days ago');
  });
});

describe('friendlyWorkerStatus', () => {
  it('reports all working', () => {
    expect(friendlyWorkerStatus(3, 0, 3)).toBe('All 3 working');
  });

  it('reports mixed status', () => {
    expect(friendlyWorkerStatus(2, 1, 3)).toBe('2 working, 1 waiting');
  });

  it('reports all waiting', () => {
    expect(friendlyWorkerStatus(0, 3, 3)).toBe('3 waiting for you');
  });

  it('reports no workers', () => {
    expect(friendlyWorkerStatus(0, 0, 0)).toBe('No workers here');
  });

  it('reports all done', () => {
    expect(friendlyWorkerStatus(0, 0, 5)).toBe('All 5 done');
  });
});

describe('friendlySource', () => {
  it('labels cursor', () => {
    expect(friendlySource('cursor')).toBe('Cursor');
  });

  it('labels claude-code', () => {
    expect(friendlySource('claude-code')).toBe('Claude');
  });

  it('passes through unknown sources', () => {
    expect(friendlySource('other')).toBe('other');
  });
});
