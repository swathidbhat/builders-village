import { describe, it, expect } from 'vitest';
import { extractProjectName, dirNameToPath } from '../projectName.js';

describe('extractProjectName', () => {
  it('extracts project name after known path segments', () => {
    expect(extractProjectName('Users-alice-Documents-GitHub-infinity-canvas'))
      .toBe('infinity-canvas');
  });

  it('handles CODE directory prefix', () => {
    expect(extractProjectName('Users-alice-Documents-CODE-GitHub-research-paper-analyzer'))
      .toBe('research-paper-analyzer');
  });

  it('handles leading dash', () => {
    expect(extractProjectName('-Users-alice-Documents-GitHub-fallacy-chrome-extension'))
      .toBe('fallacy-chrome-extension');
  });

  it('skips username after Users', () => {
    expect(extractProjectName('Users-john-Documents-my-app'))
      .toBe('my-app');
  });

  it('skips username after home', () => {
    expect(extractProjectName('home-deploy-Documents-GitHub-api-server'))
      .toBe('api-server');
  });

  it('falls back to last segment for unknown structure', () => {
    expect(extractProjectName('some-random-path'))
      .toBe('path');
  });

  it('handles Desktop prefix', () => {
    expect(extractProjectName('Users-alice-Desktop-quick-test'))
      .toBe('quick-test');
  });

  it('handles simple single-word project name', () => {
    expect(extractProjectName('Users-alice-Documents-GitHub-monorepo'))
      .toBe('monorepo');
  });
});

describe('dirNameToPath', () => {
  it('converts encoded dir name to filesystem path', () => {
    expect(dirNameToPath('Users-alice-Documents-GitHub-infinity-canvas'))
      .toBe('/Users/alice/Documents/GitHub/infinity-canvas');
  });

  it('handles leading dash', () => {
    expect(dirNameToPath('-Users-alice-Documents-GitHub-my-app'))
      .toBe('/Users/alice/Documents/GitHub/my-app');
  });

  it('handles CODE subdirectory', () => {
    expect(dirNameToPath('Users-alice-Documents-CODE-GitHub-thing'))
      .toBe('/Users/alice/Documents/CODE/GitHub/thing');
  });

  it('preserves hyphens in project name', () => {
    const result = dirNameToPath('Users-alice-Documents-GitHub-my-cool-project');
    expect(result).toBe('/Users/alice/Documents/GitHub/my-cool-project');
  });
});
