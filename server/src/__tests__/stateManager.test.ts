import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager, HOOK_ACTIVE_TTL_MS, HOOK_TERMINAL_TTL_MS } from '../stateManager.js';
import type { Project, Agent, AgentSource } from '../../../shared/types.js';

function makeProject(overrides: Partial<Project> & { path: string }): Project {
  return {
    id: overrides.id ?? overrides.path,
    name: overrides.name ?? 'Test Project',
    path: overrides.path,
    agents: overrides.agents ?? [],
    gridPosition: overrides.gridPosition ?? { x: 0, y: 0 },
  };
}

function makeAgent(overrides: Partial<Agent> & { source: AgentSource; sessionId: string }): Agent {
  const { source, sessionId, ...rest } = overrides;
  return {
    id: `${source}-${sessionId}`,
    name: `Agent ${sessionId.slice(0, 8)}`,
    source,
    sessionId,
    status: 'working',
    ...rest,
  };
}

describe('StateManager', () => {
  let sm: StateManager;

  beforeEach(() => {
    sm = new StateManager();
  });

  // ── Existing core tests ─────────────────────────────────────────────

  it('starts with empty state', () => {
    expect(sm.getState().projects).toHaveLength(0);
  });

  it('merges cursor and claude projects', () => {
    sm.updateCursorProjects(new Map([
      ['p1', makeProject({
        path: '/Users/me/project-a',
        agents: [makeAgent({ source: 'cursor', sessionId: 'a1' })],
      })],
    ]));

    sm.updateClaudeProjects(new Map([
      ['p2', makeProject({
        path: '/Users/me/project-b',
        agents: [makeAgent({ source: 'claude-code', sessionId: 'a2' })],
      })],
    ]));

    const state = sm.getState();
    expect(state.projects).toHaveLength(2);
  });

  it('deduplicates projects by normalized path', () => {
    sm.updateCursorProjects(new Map([
      ['p1', makeProject({
        path: '/Users/me/my-project',
        agents: [makeAgent({ source: 'cursor', sessionId: 'a1' })],
      })],
    ]));

    sm.updateClaudeProjects(new Map([
      ['p2', makeProject({
        path: '/Users/me/my-project',
        agents: [makeAgent({ source: 'claude-code', sessionId: 'a2' })],
      })],
    ]));

    const state = sm.getState();
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].agents).toHaveLength(2);
  });

  it('normalizes paths with trailing slashes and underscores', () => {
    sm.updateCursorProjects(new Map([
      ['p1', makeProject({
        path: '/Users/me/my_project/',
        agents: [makeAgent({ source: 'cursor', sessionId: 'a1' })],
      })],
    ]));

    sm.updateClaudeProjects(new Map([
      ['p2', makeProject({
        path: '/Users/me/my-project',
        agents: [makeAgent({ source: 'claude-code', sessionId: 'a2' })],
      })],
    ]));

    const state = sm.getState();
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].agents).toHaveLength(2);
  });

  it('assigns unique grid positions to all projects', () => {
    const projects = new Map<string, Project>();
    for (let i = 0; i < 10; i++) {
      projects.set(`p${i}`, makeProject({ path: `/path/${i}` }));
    }
    sm.updateCursorProjects(projects);

    const state = sm.getState();
    const positions = state.projects.map(p => `${p.gridPosition.x},${p.gridPosition.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(10);
  });

  it('emits change event on update', () => {
    const handler = vi.fn();
    sm.on('change', handler);

    sm.updateCursorProjects(new Map([
      ['p1', makeProject({ path: '/path' })],
    ]));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].projects).toHaveLength(1);
  });

  it('removes projects when watcher reports empty', () => {
    sm.updateCursorProjects(new Map([
      ['p1', makeProject({ path: '/Users/me/project-a' })],
      ['p2', makeProject({ path: '/Users/me/project-b' })],
    ]));
    expect(sm.getState().projects).toHaveLength(2);

    sm.updateCursorProjects(new Map([
      ['p1', makeProject({ path: '/Users/me/project-a' })],
    ]));
    expect(sm.getState().projects).toHaveLength(1);
  });

  // ── Hook overlay: core authority scenarios ──────────────────────────

  describe('no overlays', () => {
    it('all agents emit statusSource = inferred', () => {
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({ source: 'claude-code', sessionId: 'sess1' })],
      }));
      sm.updateClaudeProjects(projects);

      const state = sm.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].agents[0].statusSource).toBe('inferred');
    });
  });

  describe('Claude realtime overlay', () => {
    it('flips agent to realtime and overrides status/errorReason/lastActivityMs', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastAction: 'Read:foo.ts',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('realtime');
      expect(agent.status).toBe('working');
      expect(agent.lastAction).toBe('Read:foo.ts');
      expect(agent.lastActivityMs).toBe(now);
    });
  });

  describe('Codex overlay with no lastAction', () => {
    it('preserves watcher-derived lastAction when overlay has none', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'codex',
          sessionId: 'sess1',
          status: 'waiting',
          lastAction: 'Write:main.py',
          lastActivityMs: now - 30_000,
        })],
      }));
      sm.updateCodexProjects(projects);

      sm.applyHookOverlay({
        source: 'codex',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('realtime');
      expect(agent.status).toBe('working');
      expect(agent.lastAction).toBe('Write:main.py');
    });
  });

  describe('Cursor realtime overlay', () => {
    it('sets error status and statusSource = realtime', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'cursor',
          sessionId: 'sess1',
          status: 'working',
          lastActivityMs: now - 10_000,
        })],
      }));
      sm.updateCursorProjects(projects);

      sm.applyHookOverlay({
        source: 'cursor',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'error',
        errorReason: 'Out of memory',
        lastEventAt: now,
        terminal: true,
        mode: 'realtime',
      });

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('realtime');
      expect(agent.status).toBe('error');
      expect(agent.errorReason).toBe('Out of memory');
      expect(agent.lastActivityMs).toBe(now);
    });
  });

  describe('watcher update during trust window', () => {
    it('does not overwrite hook-driven runtime fields', () => {
      const now = Date.now();

      const initialProjects = new Map<string, Project>();
      initialProjects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(initialProjects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastAction: 'Read:foo.ts',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      const updatedProjects = new Map<string, Project>();
      updatedProjects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'done',
          lastActivityMs: now - 30_000,
        })],
      }));
      sm.updateClaudeProjects(updatedProjects);

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('realtime');
      expect(agent.status).toBe('working');
      expect(agent.lastAction).toBe('Read:foo.ts');
    });
  });

  describe('clearHookRuntimeForSources', () => {
    it('immediately clears overlays and reverts agents to inferred', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      expect(sm.getState().projects[0].agents[0].statusSource).toBe('realtime');

      sm.clearHookRuntimeForSources(['claude-code']);

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('inferred');
      expect(agent.status).toBe('waiting');
    });
  });

  // ── Overlay expiry edge cases ───────────────────────────────────────

  describe('overlay expiry', () => {
    it('non-terminal overlay at exactly TTL boundary is still trusted', () => {
      const now = Date.now();
      const eventTime = now - HOOK_ACTIVE_TTL_MS;

      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'done',
          lastActivityMs: eventTime - 1000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastEventAt: eventTime,
        terminal: false,
        mode: 'realtime',
      });

      vi.useFakeTimers();
      vi.setSystemTime(now);

      sm.updateClaudeProjects(projects);
      const agentAtBoundary = sm.getState().projects[0].agents[0];
      expect(agentAtBoundary.statusSource).toBe('realtime');

      vi.setSystemTime(now + 1);
      sm.updateClaudeProjects(projects);
      const agentAfterBoundary = sm.getState().projects[0].agents[0];
      expect(agentAfterBoundary.statusSource).toBe('inferred');

      vi.useRealTimers();
    });

    it('terminal overlay persists for up to HOOK_TERMINAL_TTL_MS', () => {
      const now = Date.now();
      const eventTime = now - HOOK_TERMINAL_TTL_MS + 1000;

      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: eventTime - 1000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'done',
        lastEventAt: eventTime,
        terminal: true,
        mode: 'realtime',
      });

      vi.useFakeTimers();
      vi.setSystemTime(now);

      sm.updateClaudeProjects(projects);
      expect(sm.getState().projects[0].agents[0].statusSource).toBe('realtime');
      expect(sm.getState().projects[0].agents[0].status).toBe('done');

      vi.setSystemTime(eventTime + HOOK_TERMINAL_TTL_MS + 1);
      sm.updateClaudeProjects(projects);
      expect(sm.getState().projects[0].agents[0].statusSource).toBe('inferred');

      vi.useRealTimers();
    });

    it('Cursor realtime error overlay wins over newer watcher lastActivityMs until TTL', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'cursor',
          sessionId: 'sess1',
          status: 'working',
          lastActivityMs: now - 10_000,
        })],
      }));
      sm.updateCursorProjects(projects);

      sm.applyHookOverlay({
        source: 'cursor',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'error',
        errorReason: 'Crash',
        lastEventAt: now,
        terminal: true,
        mode: 'realtime',
      });

      const updatedProjects = new Map<string, Project>();
      updatedProjects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'cursor',
          sessionId: 'sess1',
          status: 'working',
          lastActivityMs: now + 5_000,
        })],
      }));
      sm.updateCursorProjects(updatedProjects);

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.status).toBe('error');
      expect(agent.errorReason).toBe('Crash');
      expect(agent.statusSource).toBe('realtime');
    });
  });

  // ── Deletion edge cases ─────────────────────────────────────────────

  describe('deletion edge cases', () => {
    it('pre-discovery: overlay stored before watcher discovers agent, applies on next rebuild', () => {
      const now = Date.now();

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastAction: 'Read:foo.ts',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      expect(sm.getState().projects).toHaveLength(0);

      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 10_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('realtime');
      expect(agent.status).toBe('working');
    });

    it('multiple overlays for different agents in the same project match independently', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [
          makeAgent({ source: 'claude-code', sessionId: 'sess1', status: 'waiting', lastActivityMs: now - 60_000 }),
          makeAgent({ source: 'claude-code', sessionId: 'sess2', status: 'waiting', lastActivityMs: now - 60_000 }),
        ],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });
      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess2',
        cwd: '/proj',
        status: 'error',
        errorReason: 'Fail',
        lastEventAt: now,
        terminal: true,
        mode: 'realtime',
      });

      const agents = sm.getState().projects[0].agents;
      const agent1 = agents.find(a => a.sessionId === 'sess1')!;
      const agent2 = agents.find(a => a.sessionId === 'sess2')!;

      expect(agent1.status).toBe('working');
      expect(agent1.statusSource).toBe('realtime');
      expect(agent2.status).toBe('error');
      expect(agent2.statusSource).toBe('realtime');
    });

    it('overlay for agent that watcher stops reporting has no visible effect', () => {
      const now = Date.now();

      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      expect(sm.getState().projects[0].agents[0].statusSource).toBe('realtime');

      const emptyProjects = new Map<string, Project>();
      sm.updateClaudeProjects(emptyProjects);

      const agents = sm.getState().projects.flatMap(p => p.agents);
      const orphan = agents.find(a => a.sessionId === 'sess1');
      expect(orphan).toBeUndefined();
    });

    it('rapid events for same agent: latest event wins in overlay', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'error',
        errorReason: 'Fail',
        lastEventAt: now,
        terminal: true,
        mode: 'realtime',
      });

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastEventAt: now + 100,
        terminal: false,
        mode: 'realtime',
      });

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.status).toBe('working');
      expect(agent.errorReason).toBeUndefined();
    });

    it('event with empty sessionId and valid cwd falls through to cwd-based matching', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: '',
        cwd: '/proj',
        status: 'working',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('realtime');
      expect(agent.status).toBe('working');
    });

    it('event with empty sessionId AND empty cwd: overlay stored but never matches', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: '',
        cwd: '',
        status: 'working',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('inferred');
    });

    it('clearHookRuntimeForSources with empty array is a no-op', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.applyHookOverlay({
        source: 'claude-code',
        sessionId: 'sess1',
        cwd: '/proj',
        status: 'working',
        lastEventAt: now,
        terminal: false,
        mode: 'realtime',
      });

      sm.clearHookRuntimeForSources([]);

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('realtime');
    });

    it('clearHookRuntimeForSources for source with no overlays is a no-op', () => {
      const now = Date.now();
      const projects = new Map<string, Project>();
      projects.set('/proj', makeProject({
        path: '/proj',
        agents: [makeAgent({
          source: 'claude-code',
          sessionId: 'sess1',
          status: 'waiting',
          lastActivityMs: now - 60_000,
        })],
      }));
      sm.updateClaudeProjects(projects);

      sm.clearHookRuntimeForSources(['codex']);

      const agent = sm.getState().projects[0].agents[0];
      expect(agent.statusSource).toBe('inferred');
    });

    it('rebuild with zero projects and zero overlays emits empty state', () => {
      const state = sm.getState();
      expect(state.projects).toHaveLength(0);
      expect(state.lastUpdated).toBeTruthy();
    });
  });
});
