# TLDR FAQ

### 1. What does this app do?

Builder's Village is a pixel-art isometric village that visualizes your running AI coding agents in real time. Each project you're working on becomes a **storefront** in the village, and each agent becomes a **character** working inside it. You get a living, at-a-glance view of what all your agents are doing across all your projects — without opening terminals or reading logs.

### 2. Who does it help?

It's built for **non-technical builders who use AI agents** (Cursor, Claude Code, Codex) to build software. If you're running multiple agents across several projects and want to know what's happening without digging through files and terminals, this gives you that visibility. Every visual element — buildings, characters, status lights, worker animations — maps to something real about your work.

### 3. How does it work?

- **Scans for projects automatically.** The server watches `~/.cursor/projects/`, `~/.claude/projects/`, and `~/.codex/sessions/` using file watchers (chokidar). It reads terminal files, agent transcripts (JSONL), and session rollout files, and checks running processes to detect active agents. When **Agent Hooks** are enabled, the server also receives real-time lifecycle events (session start, tool use, stop, end) that override file-based inference for higher accuracy.
- **Projects become shops.** Each project with at least one agent becomes a building in the village, with a unique accent color derived from the project name.
- **Agents become workers.** Each agent gets a unique pixel-art character (stable appearance and name like Ada, Blake, Casey) shown inside or near its shop. Active agents carry crates and bounce; idle agents stand still.
- **Shows when agents are blocked or need help.** Agents that have finished and are waiting for your next instruction show as **"waiting"** — they appear idle at the shop window, their status dot turns gray, and the header displays "N waiting for you." Buildings with no active agents appear **dulled** with their status light off, while active shops stay bright with a **green light**. You can tell at a glance which projects need your attention.
- **Real-time updates.** The server pushes state changes over WebSocket (socket.io), so the village updates live as agents start, work, and finish.

### 4. What do the visuals convey?

**Buildings** reflect the current state of the project:

| Visual | Technical Condition | What It Means |
|--------|---------------------|---------------|
| Dull gray building, dark gray status dot | All agents are `waiting` or `done` — none actively running | Your agents are idle. They've finished and are waiting for your next instruction, or completed a while ago. This project needs your attention. |
| Bright full-color building, green glowing status dot | At least one agent is actively `working`, no errors | An agent is actively working — writing files, running commands, thinking. No action needed from you. |
| Orange-tinted building on fire, red glowing status dot | At least one agent ended in `error` | Something went wrong. An agent session hit an error. The building catches fire with animated flames and smoke. You should investigate. |

**Agent characters** reflect the individual agent's state. One representative agent is shown per building, chosen by priority: `working` first, then `error`, then `waiting`.

| Visual | Technical Condition | What It Means |
|--------|---------------------|---------------|
| Animated character walking back and forth carrying a crate, green status dot | Agent status is `working` | Agent is actively working — editing files, running commands, thinking. Let it cook. |
| Wobbling character near shop (building on fire), red status dot, error reason shown in interior | Agent status is `error` | Something went wrong. The agent session hit an error. Investigate the error reason shown in the interior panel. |
| Still character standing at shop window, gray status dot | Agent status is `waiting` | Agent finished its task and is waiting for your next instruction. |
| No character shown | Agent status is `done` | Session is stale (finished over an hour ago). Not shown as the representative. Sessions older than 48 hours disappear entirely. |

### 5. When does a fire start and stop?

A building catches fire when an agent session ends in error (detected via hooks — see "Enable Agent Hooks" in the UI). The fire persists until the errored agent shows **new activity** — meaning it starts a new session or resumes work. Other agents on the same project are unaffected and keep working normally. Hook-based error overlays expire after 1 hour (terminal TTL) if no new activity is detected.

**Example:** You have agents A, B, C, and D on one project. At hour 1, agent A hits an error. The building catches fire, but B, C, and D keep working — their characters still animate, and the interior panel shows them as green/working while agent A shows red/error. At hour 2, agent A is still idle — the fire keeps burning. At hour 3, you restart agent A on a new task. It begins producing new activity, the fire clears, and the building returns to normal.

Fires do **not** clear on a timer. They stay until the specific agent that errored recovers.

### 6. Can I click on an agent to go to its session?

**Yes.** Clicking an agent row in the interior view opens the session. For **Cursor** agents, it focuses the Cursor window for that project (you'll need to find the specific chat in the sidebar). For **Claude Code** and **Codex** agents, idle/done/error agents are resumed directly via `claude --resume` / `codex resume` in a new terminal tab. Working agents open a terminal at the project path instead, to avoid interfering with the running session.

### 7. Does it require an API key?

**Optionally, yes** — an **Anthropic API key** (`ANTHROPIC_API_KEY`).

It powers the **"Human Lingo"** feature, which translates raw agent activity (e.g. `Write:src/utils.ts`, `Shell:npm run build`) into plain-language labels (e.g. "Writing utils", "Running build"). This uses a lightweight Anthropic model (`claude-haiku-4-5-20251001` by default) with a 1-hour cache so API calls are minimal.

**Without the key**, the app still works — it falls back to basic rule-based formatting of activity strings. You just won't get the LLM-polished labels.

### 8. How to set it up?

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

This starts the server (port 3001) and the client (Vite dev server). Open [http://localhost:5177](http://localhost:5177) in your browser.

**Data sources:** Agents appear automatically if you have Cursor projects in `~/.cursor/projects/`, Claude Code sessions in `~/.claude/projects/`, or Codex sessions in `~/.codex/sessions/`. No extra configuration needed.

### 9. What's the difference between "realtime" and "inferred" status?

Each agent's status has a **source**: either `realtime` or `inferred`.

- **Inferred** means the status was determined by reading files on disk — file modification times, JSONL content, and running process checks. This is the default when no hooks are configured. It works well but has a slight delay (up to 2 minutes to detect activity changes).

- **Realtime** means the status came directly from an agent hook event (SessionStart, PostToolUse, Stop, SessionEnd). This is immediate and authoritative — it overrides any inferred status while active.

Realtime overlays expire automatically: **10 minutes** for non-terminal states (working, waiting) and **1 hour** for terminal states (done, error). After expiry, the agent reverts to inferred status. This prevents stale hook data from permanently overriding filesystem observations.

You don't need to do anything differently — enable Agent Hooks for the best accuracy, and the system handles the rest transparently.
