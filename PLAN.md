# Builder's Village - Project Plan

## Vision

A web app that auto-detects running Cursor and Claude Code agents across all local projects and visualizes them as an **isometric pixel-art village**. Each project is a store building; each agent is an animated character inside it.

## Architecture

```
┌─────────────── Browser (localhost:5173) ───────────────┐
│                                                         │
│  ┌──────────────────────┐  ┌────────────────────────┐  │
│  │   PixiJS Village     │  │   React Detail Panel   │  │
│  │   (isometric canvas) │  │   (agent cards, stats)  │  │
│  └──────────┬───────────┘  └────────────┬───────────┘  │
│             └──────────┬────────────────┘               │
│                        │ useVillageState (socket.io)    │
└────────────────────────┼────────────────────────────────┘
                         │ WebSocket
┌────────────────────────┼────────────────────────────────┐
│          Node.js Server (localhost:3001)                 │
│                        │                                │
│  ┌─────────────────────┴─────────────────────────────┐ │
│  │              StateManager                          │ │
│  │  (aggregates all watcher data into VillageState)   │ │
│  └───────┬──────────────────────────────┬────────────┘ │
│          │                              │              │
│  ┌───────┴────────┐          ┌──────────┴───────────┐  │
│  │ CursorWatcher  │          │ ClaudeCodeWatcher     │  │
│  │ (chokidar)     │          │ (chokidar + ps scan)  │  │
│  └───────┬────────┘          └──────────┬───────────┘  │
└──────────┼──────────────────────────────┼──────────────┘
           │                              │
    ~/.cursor/projects/            ~/.claude/projects/
    ├── */terminals/*.txt          ├── */*.jsonl
    └── */agent-transcripts/*      └── */memory/
```

## Tech Stack

| Layer             | Technology                          |
|-------------------|-------------------------------------|
| Village rendering | PixiJS v8 (isometric 2D)            |
| Frontend UI       | React 18 + TypeScript + Tailwind    |
| Build tool        | Vite                                |
| Backend           | Node.js + Express + socket.io       |
| File watching     | chokidar                            |
| Pixel art         | Programmatic canvas sprite gen      |

## Data Model

```typescript
VillageState {
  projects: Project[]     // one per detected project
  lastUpdated: string     // ISO timestamp
}

Project {
  id: string              // hash of path
  name: string            // "infinity-canvas"
  path: string            // "/Users/.../infinity_canvas"
  agents: Agent[]
  gridPosition: {x, y}   // village tile coordinates
}

Agent {
  id: string              // PID or session UUID
  name: string            // "Cursor Agent 1"
  status: active | idle
  source: cursor | claude-code
  currentTask?: string    // user query or command
  startedAt?: string
  elapsedMs?: number
}
```

## Detection Strategy

### Cursor
- Watch `~/.cursor/projects/*/terminals/*.txt`
- Parse YAML frontmatter (pid, cwd, command, started_at)
- No `exit_code` footer + live PID = active agent
- Watch `agent-transcripts/*.txt` for task descriptions

### Claude Code
- Watch `~/.claude/projects/*/*.jsonl`
- Parse JSONL for session + message data
- Cross-reference with `ps aux` for live processes
- Latest user message = current task

## Milestones

1. **M1 - Scaffold** - Monorepo, types, dev tooling
2. **M2 - Backend** - Watchers, state manager, WebSocket
3. **M3 - Village Core** - PixiJS scene, sprites, isometric grid
4. **M4 - Interactions** - Click stores, detail panel, camera controls
5. **M5 - Integration** - Real-time sync, live elapsed times
6. **M6 - Polish** - Vibrant palette, ambient animations, transitions
