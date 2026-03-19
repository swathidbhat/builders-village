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
git clone https://github.com/swathidbhat/builders-village.git
cd builders-village
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

### Store Exteriors

Each building has a **unique accent color** (awning, sign, poster) derived from the project name, so you can recognize your projects at a glance without reading labels. A **green status light** next to the building turns on when agents are actively working. When no agents are active, the light goes off and the building appears **dulled** -- you can tell at a glance which projects have work happening and which are idle.

### Fire on Errors

When an agent session ends with an error, the building **catches fire** -- flames and smoke particle effects, an orange tint, and a red status light make it impossible to miss. The fire **auto-extinguishes** when the agent shows new successful activity. This requires opt-in via the Fire Alerts setup card (see below).

### The Interior (click a building)

Clicking a building opens a **warehouse-style interior** with shelves of crates and your agents on the warehouse floor.

**Agents carrying boxes** represent **work in progress**. An active agent is shown carrying a crate across the floor -- your current request being fulfilled. Idle agents stand without a box, waiting for your next instruction. Error agents wobble in small circles without a box, visually distinct from both active and idle states.

**Click an agent row** to open its session -- Cursor opens the project window, and for Claude Code and Codex, idle/done/error agents are resumed directly via `claude --resume` / `codex resume` in a new terminal tab. Working agents open a terminal at the project path instead, to avoid interfering with the running session.

### Agent Characters

Each agent gets a **unique pixel-art appearance** (skin tone, hair, shirt color) derived from its ID, so the same agent always looks the same across sessions. The **name** (Ada, Blake, Casey, etc.) is also stable per agent.

- **Active agents** bounce and carry a sparkle effect
- **Idle agents** stand still
- **Error agents** wobble in place with raised arms, red eyes, and a red `!` above their head
- A **status dot** on their avatar shows green (working), gray (idle), or red (error)
- A **source badge** (Cursor / Claude / Codex) shows which tool is running them

### The Sky and Atmosphere

The sky uses a **gradient from deep blue to warm sage** rather than a flat color, with drifting clouds. This isn't decorative -- it provides visual depth so buildings at different distances read clearly against the background. The warm horizon glow ties the sky to the earthy village palette.

### Header Stats

The header shows three numbers: **Shops** (how many projects have agents), **Workers** (total agents detected), and **Working** (how many are actively running). When any buildings are on fire, a **Fires** count appears in orange. The connection dot shows whether the server is reachable.

## Fire Alerts Setup

Fire detection uses hooks that your coding agents already support. On first launch, a **Fire Alerts** card appears in the bottom-right corner. Click **Enable Fire Alerts** to configure hooks for all installed tools automatically:

- **Claude Code** -- uses the `Stop` hook
- **Cursor** -- uses the `sessionEnd` hook
- **Codex** -- uses the `hooks.stop` hook (requires March 2026+ CLI)

You can also disable hooks or dismiss the card. The card won't reappear once dismissed (stored in `localStorage`).

## How It Works

- **Auto-detects** Cursor, Claude Code, and Codex agents from `~/.cursor/projects/`, `~/.claude/projects/`, and `~/.codex/sessions/` (Claude Desktop Cowork sessions are not yet supported -- only terminal/IDE Claude Code)
- **Real-time updates** via WebSocket -- agents appear and disappear as you start and stop them
- **48-hour session window** -- agents older than 48 hours are automatically dropped to keep the village current
- **Idle detection** -- Cursor terminal agents with no output for 10+ minutes are marked waiting instead of working
- **Pan & zoom** the village with mouse drag and scroll wheel
- **Click** any building to open its interior and see agent details
- **Click** an agent row inside a building to jump to that session in your IDE

## Architecture

```
Server (Node.js :3001)          Client (React + PixiJS :5177)
├── CursorWatcher (chokidar)    ├── VillageScene (isometric renderer)
├── ClaudeWatcher               ├── InteriorView (warehouse interior)
├── CodexWatcher                ├── FireSetupCard (hook opt-in UI)
├── FireEventWatcher            ├── fireEffect (flame particles)
├── HookSetup (agent hooks)     └── useVillageState (socket.io hook)
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
