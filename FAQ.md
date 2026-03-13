# TLDR FAQ

### 1. What does this app do?

Builder's Village is a pixel-art isometric village that visualizes your running AI coding agents in real time. Each project you're working on becomes a **storefront** in the village, and each agent becomes a **character** working inside it. You get a living, at-a-glance view of what all your agents are doing across all your projects — without opening terminals or reading logs.

### 2. Who does it help?

It's built for **non-technical builders who use AI agents** (Cursor, Claude Code, Codex) to build software. If you're running multiple agents across several projects and want to know what's happening without digging through files and terminals, this gives you that visibility. Every visual element — buildings, characters, status lights, worker animations — maps to something real about your work.

### 3. How does it work?

- **Scans for projects automatically.** The server watches `~/.cursor/projects/`, `~/.claude/projects/`, and `~/.codex/sessions/` using file watchers (chokidar). It reads terminal files, agent transcripts (JSONL), and session rollout files, and checks running processes to detect active agents.
- **Projects become shops.** Each project with at least one agent becomes a building in the village, with a unique accent color derived from the project name.
- **Agents become workers.** Each agent gets a unique pixel-art character (stable appearance and name like Ada, Blake, Casey) shown inside or near its shop. Active agents carry crates and bounce; idle agents stand still.
- **Shows when agents are blocked or need help.** Agents that have finished and are waiting for your next instruction show as **"waiting"** — they appear idle at the shop window, their status dot turns gray, and the header displays "N waiting for you." Buildings with no active agents appear **dulled** with their status light off, while active shops stay bright with a **green light**. You can tell at a glance which projects need your attention.
- **Real-time updates.** The server pushes state changes over WebSocket (socket.io), so the village updates live as agents start, work, and finish.

### 4. Does it require an API key?

**Optionally, yes** — an **Anthropic API key** (`ANTHROPIC_API_KEY`).

It powers the **"Human Lingo"** feature, which translates raw agent activity (e.g. `Write:src/utils.ts`, `Shell:npm run build`) into plain-language labels (e.g. "Writing utils", "Running build"). This uses a lightweight Anthropic model (`claude-haiku-4-5-20251001` by default) with a 1-hour cache so API calls are minimal.

**Without the key**, the app still works — it falls back to basic rule-based formatting of activity strings. You just won't get the LLM-polished labels.

### 5. How to set it up?

**Prerequisites:** Node.js and npm.

**Install:**

```bash
npm run install:all
```

**Optional — add API key for Human Lingo:**

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

**Run:**

```bash
npm run dev
```

This starts the server (port 3001) and the client (Vite dev server). Open the URL Vite prints (typically `http://localhost:5174`) in your browser.

**Data sources:** Agents appear automatically if you have Cursor projects in `~/.cursor/projects/`, Claude Code sessions in `~/.claude/projects/`, or Codex sessions in `~/.codex/sessions/`. No extra configuration needed.
