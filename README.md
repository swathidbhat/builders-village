# Builder's Village

A pixel-art village that visualizes your running coding agents across projects. Each project becomes a storefront, each agent becomes a character working inside it. The village is designed for non-technical builders who use AI agents -- every visual element maps to something meaningful about their work.

## Why

If you use AI coding agents (Cursor, Claude Code, Codex), your work is invisible. Agents run in terminals and log files -- there's no ambient awareness of what's happening across your projects. Builder's Village gives you a single glanceable view: which projects have active agents, what they're doing right now, and how much has been accomplished this session. Instead of switching between terminals, you watch a village come alive.

## Prerequisites

- **Node.js** 18+ and **npm** 9+
- One or more supported coding agents installed (Cursor, Claude Code, or Codex)
- Optional: an [Anthropic API key](https://console.anthropic.com/) for the "Human Lingo" feature that rewrites agent activity into plain English

> **Note:** Builder's Village reads session data that your coding agents already store locally (`~/.cursor/projects/`, `~/.claude/projects/`, `~/.codex/sessions/`). If you don't have any of these tools installed, the village will be empty. Everything runs on your machine — no data leaves your laptop, no accounts, no cloud.

## Quick Start

```bash
git clone <repo-url>
cd build-village-opus
npm run install:all
cp .env.example .env          # optional: add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:5177](http://localhost:5177) in your browser.

## Environment Setup

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Enables the Human Lingo feature (rewrites raw agent output into friendly language). Without it, raw activity text is shown instead. |
| `HUMANIZER_MODEL` | No | Which Claude model to use for Human Lingo. Defaults to `claude-haiku-4-5-20251001`. |

## What Each Visual Means

### The Village Skyline

Every project you're working on becomes a building in the village. The **building's size scales with the project's lines of code** -- small experiments are small cottages, large codebases become tall multi-story buildings. You glance at the skyline and immediately know which projects are substantial and which are lightweight. This uses LOC as a heuristic because it's the metric hardest to inflate accidentally and correlates most with actual effort over time. The data is the filesystem itself -- no tracking needed.

### Store Exteriors

Each building has a **unique accent color** (awning, sign, poster) derived from the project name, so you can recognize your projects at a glance without reading labels. A **green status light** next to the building turns on when agents are actively working. When no agents are active, the light goes off and the building appears **dulled** -- you can tell at a glance which projects have work happening and which are idle.

### Thought Bubbles

When an agent is actively working, a **parchment-colored bubble** floats above the building showing what the agent is doing in plain language ("Writing foo.ts", "Running tests"). This answers the most common question: "What is my agent doing right now?" Bubbles appear only during active work and disappear when the agent is idle. They bob gently so your eye catches them.

### The Interior (click a building)

Clicking a building opens a **warehouse-style interior** that shows two things:

**Boxes on shelves** represent **completed requests** -- each box is one thing you asked for that got done. "Add a login page" becomes a box. "Fix the checkout bug" becomes another. The shelves fill up over a work session, giving you a tangible sense of accomplishment. This is session-scoped: shelves start empty each time you restart the server, like starting a fresh workday.

**Agents carrying boxes** represent **work in progress**. An active agent is shown carrying a crate across the floor -- your current request being fulfilled. Idle agents stand without a box, waiting for your next instruction.

Why boxes and not files or code? Because a non-technical builder doesn't think in files. They think: "I asked for something -- did it get done?" The box is the only unit of work that matches that mental model.

### Agent Characters

Each agent gets a **unique pixel-art appearance** (skin tone, hair, shirt color) derived from its ID, so the same agent always looks the same across sessions. The **name** (Ada, Blake, Casey, etc.) is also stable per agent.

- **Active agents** bounce and carry a sparkle effect
- **Idle agents** stand still with small "Zzz" dots
- A **status dot** on their avatar shows green (working) or gray (idle)
- A **source badge** (Cursor / Claude / Codex) shows which tool is running them

### The Sky and Atmosphere

The sky uses a **gradient from deep blue to warm sage** rather than a flat color, with drifting clouds. This isn't decorative -- it provides visual depth so buildings at different distances read clearly against the background. The warm horizon glow ties the sky to the earthy village palette.

### Header Stats

The header shows three numbers: **Shops** (how many projects have agents), **Workers** (total agents detected), and **Working** (how many are actively running). The connection dot shows whether the server is reachable.

## How It Works

- **Auto-detects** Cursor, Claude Code, and Codex agents from `~/.cursor/projects/`, `~/.claude/projects/`, and `~/.codex/sessions/`
- **Real-time updates** via WebSocket -- agents appear and disappear as you start and stop them
- **Pan & zoom** the village with mouse drag and scroll wheel
- **Click** any building to open its interior and see agent details

## Architecture

```
Server (Node.js :3001)          Client (React + PixiJS :5177)
├── CursorWatcher (chokidar)    ├── VillageScene (isometric renderer)
├── ClaudeCodeWatcher           ├── InteriorView (warehouse interior)
├── CodexWatcher                └── useVillageState (socket.io hook)
├── StateManager
└── WebSocket (socket.io)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Village rendering | PixiJS v8 |
| Frontend UI | React 18 + TypeScript + Tailwind |
| Build | Vite 6 |
| Backend | Node.js + Express + socket.io |
| File watching | chokidar |
| Sprites | Programmatic canvas generation |
| Testing | Vitest |

## Running Tests

```bash
npm test
```

This runs the Vitest test suites in both the client and server packages.

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes and add tests where appropriate
4. Run `npm test` to verify everything passes
5. Commit your changes and open a pull request

Please keep PRs focused on a single change and include a clear description of what and why.
