import { describe, it, expect, vi } from 'vitest';
import { StateManager } from '../stateManager.js';
import type { Project } from '../../../shared/types.js';

function makeProject(id: string, path: string, agents: Project['agents'] = []): Project {
  return { id, name: id, path, agents, gridPosition: { x: 0, y: 0 } };
}

describe('StateManager', () => {
  it('starts with empty state', () => {
    const sm = new StateManager();
    expect(sm.getState().projects).toHaveLength(0);
  });

  it('merges cursor and claude projects', () => {
    const sm = new StateManager();

    sm.updateCursorProjects(new Map([
      ['p1', makeProject('p1', '/Users/me/project-a', [{ id: 'a1', name: 'a1', status: 'working', source: 'cursor' }])],
    ]));

    sm.updateClaudeProjects(new Map([
      ['p2', makeProject('p2', '/Users/me/project-b', [{ id: 'a2', name: 'a2', status: 'working', source: 'claude-code' }])],
    ]));

    const state = sm.getState();
    expect(state.projects).toHaveLength(2);
  });

  it('deduplicates projects by normalized path', () => {
    const sm = new StateManager();

    sm.updateCursorProjects(new Map([
      ['p1', makeProject('p1', '/Users/me/my-project', [{ id: 'a1', name: 'a1', status: 'working', source: 'cursor' }])],
    ]));

    sm.updateClaudeProjects(new Map([
      ['p2', makeProject('p2', '/Users/me/my-project', [{ id: 'a2', name: 'a2', status: 'working', source: 'claude-code' }])],
    ]));

    const state = sm.getState();
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].agents).toHaveLength(2);
  });

  it('normalizes paths with trailing slashes and underscores', () => {
    const sm = new StateManager();

    sm.updateCursorProjects(new Map([
      ['p1', makeProject('p1', '/Users/me/my_project/', [{ id: 'a1', name: 'a1', status: 'working', source: 'cursor' }])],
    ]));

    sm.updateClaudeProjects(new Map([
      ['p2', makeProject('p2', '/Users/me/my-project', [{ id: 'a2', name: 'a2', status: 'working', source: 'claude-code' }])],
    ]));

    const state = sm.getState();
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].agents).toHaveLength(2);
  });

  it('assigns unique grid positions to all projects', () => {
    const sm = new StateManager();
    const projects = new Map<string, Project>();
    for (let i = 0; i < 10; i++) {
      projects.set(`p${i}`, makeProject(`p${i}`, `/path/${i}`));
    }
    sm.updateCursorProjects(projects);

    const state = sm.getState();
    const positions = state.projects.map(p => `${p.gridPosition.x},${p.gridPosition.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(10);
  });

  it('emits change event on update', () => {
    const sm = new StateManager();
    const handler = vi.fn();
    sm.on('change', handler);

    sm.updateCursorProjects(new Map([
      ['p1', makeProject('p1', '/path')],
    ]));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].projects).toHaveLength(1);
  });

  it('removes projects when watcher reports empty', () => {
    const sm = new StateManager();

    sm.updateCursorProjects(new Map([
      ['p1', makeProject('p1', '/Users/me/project-a')],
      ['p2', makeProject('p2', '/Users/me/project-b')],
    ]));
    expect(sm.getState().projects).toHaveLength(2);

    sm.updateCursorProjects(new Map([
      ['p1', makeProject('p1', '/Users/me/project-a')],
    ]));
    expect(sm.getState().projects).toHaveLength(1);
  });
});
