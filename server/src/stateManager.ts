import { EventEmitter } from 'events';
import type { VillageState, Project } from '../../shared/types.js';

export class StateManager extends EventEmitter {
  private cursorProjects = new Map<string, Project>();
  private claudeProjects = new Map<string, Project>();
  private state: VillageState = { projects: [], lastUpdated: new Date().toISOString() };

  updateCursorProjects(projects: Map<string, Project>): void {
    this.cursorProjects = projects;
    this.rebuild();
  }

  updateClaudeProjects(projects: Map<string, Project>): void {
    this.claudeProjects = projects;
    this.rebuild();
  }

  getState(): VillageState {
    return this.state;
  }

  private rebuild(): void {
    const merged = new Map<string, Project>();

    for (const [key, project] of this.cursorProjects) {
      merged.set(this.normalizeKey(project.path), { ...project });
    }

    for (const [key, project] of this.claudeProjects) {
      const normalizedKey = this.normalizeKey(project.path);
      const existing = merged.get(normalizedKey);
      if (existing) {
        existing.agents = [...existing.agents, ...project.agents];
      } else {
        merged.set(normalizedKey, { ...project });
      }
    }

    const projects = Array.from(merged.values());
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

  /**
   * Lay out buildings in a spiral pattern from the center of the village.
   */
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
