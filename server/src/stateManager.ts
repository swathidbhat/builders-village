import { EventEmitter } from 'events';
import type { VillageState, Project, AgentSource } from '../../shared/types.js';

interface FireEvent {
  source: AgentSource;
  sessionId: string;
  reason: string;
  cwd?: string;
  timestamp: number;
}

export class StateManager extends EventEmitter {
  private cursorProjects = new Map<string, Project>();
  private claudeProjects = new Map<string, Project>();
  private codexProjects = new Map<string, Project>();
  private pendingFireEvents: FireEvent[] = [];
  private state: VillageState = { projects: [], lastUpdated: new Date().toISOString() };

  updateCursorProjects(projects: Map<string, Project>): void {
    this.cursorProjects = projects;
    this.rebuild();
  }

  updateClaudeProjects(projects: Map<string, Project>): void {
    this.claudeProjects = projects;
    this.rebuild();
  }

  updateCodexProjects(projects: Map<string, Project>): void {
    this.codexProjects = projects;
    this.rebuild();
  }

  getState(): VillageState {
    return this.state;
  }

  reportFireEvent(source: AgentSource, sessionId: string, reason: string, cwd?: string): void {
    this.pendingFireEvents.push({ source, sessionId, reason, cwd, timestamp: Date.now() });
    this.rebuild();
  }

  private rebuild(): void {
    const merged = new Map<string, Project>();

    for (const [_key, project] of this.cursorProjects) {
      merged.set(this.normalizeKey(project.path), { ...project });
    }

    for (const [_key, project] of this.claudeProjects) {
      const normalizedKey = this.normalizeKey(project.path);
      const existing = merged.get(normalizedKey);
      if (existing) {
        existing.agents = [...existing.agents, ...project.agents];
      } else {
        merged.set(normalizedKey, { ...project });
      }
    }

    for (const [_key, project] of this.codexProjects) {
      const normalizedKey = this.normalizeKey(project.path);
      const existing = merged.get(normalizedKey);
      if (existing) {
        existing.agents = [...existing.agents, ...project.agents];
      } else {
        merged.set(normalizedKey, { ...project });
      }
    }

    const projects = Array.from(merged.values());

    const survivingEvents: FireEvent[] = [];
    for (const event of this.pendingFireEvents) {
      let kept = false;
      for (const project of projects) {
        if (!event.cwd || project.path.toLowerCase() !== event.cwd.toLowerCase()) continue;

        let target = event.sessionId
          ? project.agents.find(a => a.id.includes(event.sessionId))
          : null;

        if (!target) target = project.agents[0] ?? null;
        if (!target) break;

        const hasNewActivity = target.lastActivityMs != null
          && target.lastActivityMs > event.timestamp;

        if (hasNewActivity) {
          break;
        }

        target.status = 'error';
        target.errorReason = event.reason;
        survivingEvents.push(event);
        kept = true;
        break;
      }
      if (!kept) {
        const noProjectMatch = !projects.some(
          p => event.cwd && p.path.toLowerCase() === event.cwd.toLowerCase()
        );
        if (noProjectMatch) {
          survivingEvents.push(event);
        }
      }
    }
    this.pendingFireEvents = survivingEvents;

    this.assignGridPositions(projects);

    this.state = {
      projects,
      lastUpdated: new Date().toISOString(),
    };

    this.emit('change', this.state);
  }

  private normalizeKey(path: string): string {
    return path.toLowerCase().replace(/[_\s]/g, '-').replace(/\/+$/, '');
  }

  private assignGridPositions(projects: Project[]): void {
    const positions = generateSpiralPositions(projects.length);
    for (let i = 0; i < projects.length; i++) {
      projects[i].gridPosition = positions[i];
    }
  }
}

function generateSpiralPositions(count: number): { x: number; y: number }[] {
  if (count === 0) return [];

  const positions: { x: number; y: number }[] = [];
  const spacing = 7;

  let x = 0, y = 0;
  let dx = spacing, dy = 0;
  let stepsInDir = 1, stepsTaken = 0, dirChanges = 0;

  positions.push({ x, y });

  for (let i = 1; i < count; i++) {
    x += dx;
    y += dy;
    positions.push({ x, y });
    stepsTaken++;

    if (stepsTaken >= stepsInDir) {
      stepsTaken = 0;
      dirChanges++;

      const temp = dx;
      dx = -dy;
      dy = temp;

      if (dirChanges % 2 === 0) stepsInDir++;
    }
  }

  return positions;
}
