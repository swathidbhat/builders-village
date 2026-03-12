# Builder's Village

A pixel-art village that visualizes your running coding agents across projects. Each project becomes a storefront, each agent becomes a character working inside it. The village is designed for non-technical builders who use AI agents -- every visual element maps to something meaningful about their work.

## Quick Start

```bash
npm run install:all
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) (port may vary) in your browser.

## What Each Visual Means

### The Village Skyline

Every project you're working on becomes a building in the village. The **building's size scales with the project's lines of code** -- small experiments are small cottages, large codebases become tall multi-story buildings. You glance at the skyline and immediately know which projects are substantial and which are lightweight. This uses LOC as a heuristic because it's the metric hardest to inflate accidentally and correlates most with actual effort over time. The data is the filesystem itself -- no tracking needed.

### Store Exteriors

Each building has a **unique accent color** (awning, sign, poster) derived from the project name, so you can recognize your projects at a glance without reading labels. The **warm glow** beneath each building intensifies when agents inside are actively working -- a brighter store means something is happening right now.

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
- A **source badge** (Cursor / Claude) shows which tool is running them

### The Sky and Atmosphere

The sky uses a **gradient from deep blue to warm sage** rather than a flat color, with drifting clouds. This isn't decorative -- it provides visual depth so buildings at different distances read clearly against the background. The warm horizon glow ties the sky to the earthy village palette.

### Header Stats

The header shows three numbers: **Shops** (how many projects have agents), **Workers** (total agents detected), and **Working** (how many are actively running). The connection dot shows whether the server is reachable.

## How It Works

- **Auto-detects** Cursor and Claude Code agents from `~/.cursor/projects/` and `~/.claude/projects/`
- **Real-time updates** via WebSocket -- agents appear and disappear as you start and stop them
- **Pan & zoom** the village with mouse drag and scroll wheel
- **Click** any building to open its interior and see agent details

## Architecture

```
Server (Node.js :3001)          Client (React + PixiJS :5173)
├── CursorWatcher (chokidar)    ├── VillageScene (isometric renderer)
├── ClaudeCodeWatcher           ├── InteriorView (warehouse interior)
├── StateManager                └── useVillageState (socket.io hook)
└── WebSocket (socket.io)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Village rendering | PixiJS v8 |
| Frontend UI | React 18 + TypeScript + Tailwind |
| Build | Vite |
| Backend | Node.js + Express + socket.io |
| File watching | chokidar |
| Sprites | Programmatic canvas generation |
