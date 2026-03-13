import { describe, it, expect } from 'vitest';
import {
  friendlyName,
  friendlyNames,
  friendlyElapsed,
  friendlyWorkerStatus,
  friendlySource,
} from '../humanize.js';
import type { Agent } from '@shared/types';

function makeAgent(id: string): Agent {
  return { id, name: id, status: 'working', source: 'cursor' };
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

describe('friendlyNames', () => {
  it('returns unique display names for all agents', () => {
    const agents = ['a', 'b', 'c'].map(makeAgent);
    const names = friendlyNames(agents);
    expect(names.size).toBe(3);
  });

  it('appends Jr for the second agent with the same base name', () => {
    const a1 = makeAgent('id-a');
    const a2 = makeAgent('id-b');
    const baseName1 = friendlyName(a1);
    const baseName2 = friendlyName(a2);

    if (baseName1 !== baseName2) return; // skip if no collision in this pair

    const names = friendlyNames([a1, a2]);
    expect(names.get(a1.id)).toBe(baseName1);
    expect(names.get(a2.id)).toBe(`${baseName1} Jr`);
  });

  it('keeps name unchanged when no collision', () => {
    const agents = [makeAgent('unique-1')];
    const names = friendlyNames(agents);
    expect(names.get('unique-1')).toBe(friendlyName(agents[0]));
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
