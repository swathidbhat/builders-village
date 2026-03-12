# Test Cases

## Server - Cursor Watcher

| ID | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| CW-1 | Parse terminal file with active process | Terminal file with YAML frontmatter, no exit_code footer | Agent with status `active`, correct pid/cwd/command | pending |
| CW-2 | Parse terminal file with completed process | Terminal file with `exit_code` footer | Agent with status `idle` | pending |
| CW-3 | Detect new terminal file added | New .txt file created in terminals/ | New agent appears in state | pending |
| CW-4 | Detect terminal file removed | .txt file deleted from terminals/ | Agent removed from state | pending |
| CW-5 | Extract project name from directory | `Users-swathibhat-Documents-GitHub-infinity-canvas` | `infinity-canvas` | pending |
| CW-6 | Extract project name with nested path | `Users-swathibhat-Documents-CODE-GitHub-research-paper-analyzer` | `research-paper-analyzer` | pending |
| CW-7 | Parse agent transcript for task | Transcript .txt with `<user_query>` block | currentTask contains the user query text | pending |
| CW-8 | Handle malformed terminal file | File with missing/corrupt YAML | Gracefully skip, no crash | pending |
| CW-9 | PID liveness check - dead process | Terminal file with PID that no longer exists | Agent status set to `idle` | pending |

## Server - Claude Code Watcher

| ID | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| CC-1 | Parse JSONL session file | Valid JSONL with user/assistant messages | Agent with sessionId, cwd, latest task | pending |
| CC-2 | Detect active Claude Code process | Running `claude` process matching project CWD | Agent with status `active` | pending |
| CC-3 | Detect no active process | No running `claude` process for project | Agent with status `idle` | pending |
| CC-4 | Extract latest user task | JSONL with multiple user messages | currentTask = most recent user message | pending |
| CC-5 | Handle empty JSONL | Empty or zero-byte file | No agent created, no crash | pending |

## Server - State Manager

| ID | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| SM-1 | Aggregate multiple watchers | CursorWatcher + ClaudeCodeWatcher both report agents | VillageState with all projects and agents merged | pending |
| SM-2 | Deduplicate projects by path | Same CWD detected by both watchers | Single project with agents from both sources | pending |
| SM-3 | Assign grid positions | 5 projects added | Each project gets unique non-overlapping gridPosition | pending |
| SM-4 | Emit state on change | Agent status changes | WebSocket emits updated VillageState | pending |
| SM-5 | Initial snapshot on connect | New WebSocket client connects | Client receives full current VillageState | pending |

## Server - WebSocket

| ID | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| WS-1 | Client connection | Client connects via socket.io | Server sends `village:state` event with current state | pending |
| WS-2 | State update broadcast | StateManager emits change | All connected clients receive `village:state` | pending |
| WS-3 | Client reconnection | Client disconnects and reconnects | Receives fresh state snapshot | pending |

## Client - Village Rendering

| ID | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| VR-1 | Render empty village | VillageState with 0 projects | Isometric grid with decorations, no buildings | pending |
| VR-2 | Render single store | 1 project with 2 agents | One isometric building with 2 character sprites | pending |
| VR-3 | Render multiple stores | 5 projects | 5 buildings placed without overlap on grid | pending |
| VR-4 | Active agent animation | Agent with status `active` | Character sprite plays working animation | pending |
| VR-5 | Idle agent animation | Agent with status `idle` | Character sprite plays idle/resting animation | pending |
| VR-6 | Building color per project | 3 different projects | Each building has a distinct roof color | pending |

## Client - Interactions

| ID | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| IN-1 | Hover on store | Mouse over a building | Building brightens, name label appears | pending |
| IN-2 | Click on store | Click a building | Detail panel slides in with project info | pending |
| IN-3 | Close detail panel | Press Escape or click outside | Panel slides out | pending |
| IN-4 | Pan camera | Click + drag on empty ground | Village view pans | pending |
| IN-5 | Zoom camera | Scroll wheel | Village zooms in/out | pending |

## Client - Detail Panel

| ID | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| DP-1 | Show project header | Selected project | Project name, path, agent count displayed | pending |
| DP-2 | Show agent cards | Project with 3 agents | 3 agent cards with status, source, task | pending |
| DP-3 | Active status indicator | Agent with status `active` | Green pulsing dot | pending |
| DP-4 | Idle status indicator | Agent with status `idle` | Gray dot | pending |
| DP-5 | Live elapsed time | Agent started 5 minutes ago | Timer shows "5m" and increments live | pending |
| DP-6 | Task description truncation | Task longer than 100 chars | Truncated with "..." and expandable on click | pending |

## Integration

| ID | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| IT-1 | End-to-end: new agent appears | Start a Cursor agent in a project | New character appears in the village within seconds | pending |
| IT-2 | End-to-end: agent finishes | Cursor agent completes task | Character transitions from active to idle animation | pending |
| IT-3 | End-to-end: project with no agents | All agents in a project finish and terminals are cleaned | Building remains but no characters inside | pending |
| IT-4 | Real-time update | Agent starts while village is open | Village updates without page refresh | pending |
