/**
 * Converts Cursor/Claude Code encoded directory names to human-readable project names.
 *
 * Strategy: find the last occurrence of a "known parent directory" in the
 * hyphen-delimited segments, then take everything after it as the project name.
 *
 * "Users-swathibhat-Documents-GitHub-infinity-canvas" -> "infinity-canvas"
 * "-Users-swathibhat-Documents-GitHub-fallacy-chrome-extension" -> "fallacy-chrome-extension"
 * "Users-swathibhat-Documents-CODE-GitHub-research-paper-analyzer" -> "research-paper-analyzer"
 */
export function extractProjectName(dirName: string): string {
  const cleaned = dirName.startsWith('-') ? dirName.slice(1) : dirName;

  const knownParents = ['Users', 'Documents', 'GitHub', 'CODE', 'Downloads', 'Desktop', 'home'];
  const userRoots = ['Users', 'home'];

  const segments = cleaned.split('-');
  let lastKnownIdx = -1;

  for (let i = 0; i < segments.length; i++) {
    if (knownParents.includes(segments[i])) {
      lastKnownIdx = i;

      // If this is "Users" or "home", the next segment is the username -- skip it too
      if (userRoots.includes(segments[i]) && i + 1 < segments.length && !knownParents.includes(segments[i + 1])) {
        lastKnownIdx = i + 1;
        i++;
      }
    }
  }

  if (lastKnownIdx >= 0 && lastKnownIdx < segments.length - 1) {
    return segments.slice(lastKnownIdx + 1).join('-');
  }

  // Fallback: return the last segment
  return segments[segments.length - 1];
}

/**
 * Extracts the actual filesystem path from a Cursor project directory name.
 *
 * This is approximate since hyphens in the original path are indistinguishable
 * from hyphens used as separators. We try to reconstruct using known path segments.
 */
export function dirNameToPath(dirName: string): string {
  const cleaned = dirName.startsWith('-') ? dirName.slice(1) : dirName;

  // Known path components that should become directory separators
  const pathRoots = ['Users', 'home'];
  const pathDirs = ['Documents', 'GitHub', 'CODE', 'Downloads', 'Desktop'];

  const segments = cleaned.split('-');
  const pathParts: string[] = [];
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];

    if (pathRoots.includes(seg) || pathDirs.includes(seg)) {
      pathParts.push(seg);
      i++;
    } else if (i === 1 && pathRoots.includes(segments[0])) {
      // Username segment after "Users"
      pathParts.push(seg);
      i++;
    } else {
      // Remaining segments are the project name (keep hyphens)
      pathParts.push(segments.slice(i).join('-'));
      break;
    }
  }

  return '/' + pathParts.join('/');
}
