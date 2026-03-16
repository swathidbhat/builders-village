# Decisions Log

Newest decisions at the top.

---

## 2026-03-16 | Fire clears on new activity, not a timer

**Decision**: Fire events persist until the errored agent shows new activity (its `lastActivityMs` exceeds the fire event's timestamp), replacing the previous 10-minute TTL that blindly expired.

**Principles applied**: Visual state should reflect reality, not arbitrary timers.

**Why**: The original implementation expired fire events after 10 minutes regardless of whether the agent recovered. This meant fires auto-extinguished even if the agent was still broken. A first attempt to fix this checked the agent's watcher-assigned status (`'working'`), but that was also wrong — when a session ends (even in error), the transcript file is updated, and the watcher briefly marks it `'working'` because the file was recently modified. This caused fires to be dropped the moment they were created.

**Example scenario**: Agent A errors at hour 1 while agents B, C, and D continue working on the same project. At hour 2, agent A is still idle — building stays on fire, B/C/D keep working normally. At hour 3, agent A starts a new session — new transcript entries give it a `lastActivityMs` after the fire event's timestamp. Fire clears. The key insight is that "recently modified file" (from the session ending) is not the same as "new work after the error." Comparing timestamps makes this distinction correctly.

**Tradeoffs accepted**: Added a `lastActivityMs` field to the `Agent` type, populated by all three watchers. Fire events for projects that disappear entirely (e.g., aged out by the 48-hour cap) are also cleaned up. If a fire event can't find its target agent or project, it's kept (in case the agent appears in a future scan).

---

## 2026-03-16 | 48-hour age cap and idle terminal detection

**Decision**: All three watchers (Cursor, Claude, Codex) now drop agents whose last activity is older than 48 hours. Additionally, Cursor terminal agents that have a live PID but no terminal output for 10+ minutes are marked `waiting` instead of `working`.

**Principles applied**: Consistent behavior across all sources. Show what's actually happening, not what's technically alive.

**Why (age cap)**: Previously, Cursor and Claude had no age limit (every historical session appeared forever), while Codex had a 1-hour cutoff that was too aggressive — projects disappeared as soon as you took a break. Now all three use the same 48-hour window: recent enough to show projects you're actively working on, old enough to survive overnight breaks.

**Why (idle terminal)**: A Cursor terminal process stays alive as long as the Cursor window is open, even if nobody is using it. The old logic checked "is the PID alive?" and marked it `working` if yes — which was misleading. Now we check the terminal file's modification time: if nothing has been written to the terminal in 10+ minutes, the process is idle regardless of PID liveness. This prevents ghost "working" status on terminals that are just sitting open.

**Tradeoffs accepted**: The 48-hour threshold is a heuristic — a user who takes a 3-day weekend will lose their shops. The 10-minute idle threshold may occasionally mark a legitimately slow long-running command as idle. Both thresholds can be tuned if needed.

---

## 2026-03-16 | Click agent panel to open IDE session

**Decision**: Clicking an agent row in the interior view opens/focuses the IDE window where that agent is running, via a server-side `POST /api/open-session` endpoint that runs `open -a "Cursor"` (or `open -a "Terminal"` for Claude/Codex). Agent objects now carry a `sessionMeta` field with source-specific data (project path, transcript path, session ID, working directory).

**Principles applied**: The village should be a launchpad, not just a dashboard. Clicking should take you where you need to go.

**Why**: Previously, clicking an agent row only expanded/collapsed a detail card — a dead end. The user still had to manually find and switch to the right IDE window. Now one click gets them there.

**Tradeoffs accepted**: For Cursor agents, there's no deep link into a specific agent chat — we can only focus the project window. A toast explains this limitation. For Claude/Codex, we open the project directory in Terminal rather than resuming the specific session.

---

## 2026-03-16 | Error agents shown as representative in village view

**Decision**: `getRepresentativeAgent` now includes `error` agents in its priority order: `working` → `error` → `waiting`. Previously, errored agents were not candidates for the representative character, so a project with only an errored agent would show a burning building with no character visible.

**Principles applied**: If something went wrong, show the agent — don't hide it. The visual should match what the builder expects: a burning building should have someone standing in it.

**Why**: When the only agent on a project hit an error, the building caught fire but the character disappeared entirely (since `getRepresentativeAgent` only looked for `working` and `waiting`). This was confusing — the fire said "something's wrong" but the absent character said "nobody's here." Showing the errored agent standing idle at the burning shop window makes the visual coherent: the agent is there, the building is on fire, something needs attention.

**Tradeoffs accepted**: The errored agent appears as a still idle character (same as `waiting`), not a unique error pose. The fire effect and red status light on the building are the primary error indicators. A dedicated error animation could be added later but isn't necessary — the combination of idle character + fire is clear enough.

---

## 2026-03-14 | Buildings catch fire on session errors

**Decision**: Buildings visually catch fire (PixiJS particle effect + red status light + orange tint) when an agent session ends in error. Detection is entirely hook-based via one-click opt-in for all three tools — Claude Code (`Stop` in `~/.claude/settings.json`), Cursor (`sessionEnd` in `~/.cursor/hooks.json`), and Codex (`hooks.stop` in `~/.codex/config.toml`). Each tool is configured independently via its own config file and format. Fire auto-extinguishes when the agent shows new successful activity.

**Principles applied**: Show the builder what they need to know at a glance. Single, clean detection mechanism over layered heuristics.

**Why**: When an agent session fails, nothing in the village currently communicates this. The builder might not notice for minutes. Fire is an unmistakable visual signal that maps to the builder's mental model: "something went wrong with my agent on this project." The metaphor is immediate and requires no explanation.

**Why not JSONL scanning**: An earlier design included a zero-setup layer that scanned Claude Code JSONL files for `api_error` entries with high retry counts. This was dropped because: (1) the heuristic was narrow — it only covered Claude Code, and only one error type; (2) it was prone to false positives during the gap between retry storms and recovery, and false negatives for errors that don't produce `api_error` entries; (3) it became redundant the moment hooks were enabled; (4) maintaining two detection code paths adds complexity for marginal value. Hooks provide definitive session-outcome signals for all three tools.

**Detection design**: All detection is hook-based. The three tools expose different signals:
- **Claude Code**: `Stop` hook fires when a session ends. Payload includes `status` field. We fire on `status: "error"`, filter out `"aborted"` (user-initiated). Does not reveal the specific error type.
- **Cursor**: `sessionEnd` hook provides the richest signal: `reason: "error"` plus an `error_message` string with whatever detail Cursor provides. We filter out `"aborted"`, `"window_close"`, `"user_close"`. NOT using `postToolUseFailure` because it fires on every individual tool failure (grep no-match, file-not-found) and would cause constant false-positive fires.
- **Codex**: Hooks engine merged March 10, 2026 (PR #13276). `Stop` hook assumed to include status payload. New and potentially unstable — UI includes a disclaimer.

**Hook setup UX**: One-click "Enable Fire Alerts" button in the village UI. The hook script lives at `~/.village/hooks/fire-hook.sh` (stable path independent of project location) and writes event files to `~/.village/events/`. Safe config modification strategy: if the tool's config file doesn't exist, create it; if it exists without hooks, take a backup and add the hooks section; if it already has hooks configured, show the builder a copy-paste snippet instead of auto-merging. This avoids the risk of corrupting existing hook configurations.

**Tradeoffs accepted**: Hook-based detection requires explicit user opt-in — nothing works out of the box. This is intentional: modifying tool config files without consent would be worse than requiring a click. Hook-based detection only catches session-ending failures, not transient hiccups that the tool retries and recovers from — but this is correct behavior (transient retries shouldn't cause fire). Codex hooks are new and may not be in all released versions. The one-click setup modifies files outside the project directory (`~/.claude/`, `~/.cursor/`, `~/.codex/`) but only with explicit user consent and backup. The fire particle system adds rendering overhead per burning building (~40 sprites) but is destroyed when fire clears.

---

## 2026-03-12 | Codex agent support

**Decision**: Added a `CodexWatcher` that detects Codex (OpenAI) agent sessions alongside the existing Cursor and Claude Code watchers. Added `'codex'` to the `AgentSource` type. Sessions are discovered from `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` files.

**Principles applied**: Same architecture, additive change. Each watcher is independent.

**Why**: The user runs Codex agents in addition to Cursor and Claude Code. The village should show all active agents regardless of which tool launched them.

**Tradeoffs accepted**: Codex stores sessions by date rather than by project. The watcher must read the `session_meta` record (first line of each JSONL) to extract the `cwd` and group sessions by project. Multi-megabyte session files are handled by only reading the first line during scan. Running process detection uses `ps aux` + `lsof`, same approach as the Claude watcher.

---

## 2026-03-12 | Status light replaces glow, inactive shops dulled via tint

**Decision**: Removed the yellow glow ellipse beneath buildings. Replaced it with a small wall-mounted status light next to each building: bright green when any agent is working, dark/off when not. Inactive shops are dulled using a `tint` on the building sprite (`0x8a8a8a`) instead of reducing alpha.

**Principles applied**: Clear binary signal over ambient effect. Dull means muted, not invisible.

**Why**: The glow effect was visually ambiguous — a fuzzy yellow ellipse beneath the building didn't clearly communicate "active vs inactive." A green light is an unambiguous signal. Dulling via tint darkens and desaturates the building while keeping it fully opaque and readable, which is distinct from the old approach of fading (alpha) that made inactive buildings look ghostly.

**Tradeoffs accepted**: The status light is a small element that may be hard to see at max zoom-out, but it works in tandem with the tint — even without noticing the light, the dull building communicates inactivity.

---

## 2026-03-10 | Building size scales with lines of code

**Decision**: The exterior building height/complexity scales with the project's total lines of code (excluding `node_modules`, `.git`, `dist`, and other dependency/build directories). Small projects are small single-story shops. Large codebases become tall multi-story buildings with richer architectural detail.

**Principles applied**: The village skyline should honestly reflect relative project scale. Use data that already exists on disk -- no tracking infrastructure needed.

**Why**: LOC is a better proxy for "how much work has gone into this" than file count. File count is easily inflated by scaffolding (50+ files before writing a line) and can't represent a dense 10,000-line file. LOC isn't perfect, but it's the metric hardest to inflate accidentally and correlates most with actual builder effort over time. Combined with the interior shelf system (session-scoped completed tasks), the exterior tells you *what you've built* while the interior tells you *what you did today*.

**Tradeoffs accepted**: LOC is a rough heuristic -- generated code, verbose languages, and copy-paste inflate it. Counting lines requires a filesystem scan per project (mitigated by caching and only recounting on file change events). Building textures need regeneration when size tier changes, but tier transitions are infrequent (not every line added triggers a visual change).

---

## 2026-03-10 | Boxes = completed builder requests (session-scoped history)

**Decision**: Each crate/box in the store interior represents one completed request from the builder. The server accumulates a `completedTasks` history per project (in-memory, session-scoped). Shelf boxes = fulfilled requests. Carried boxes = the current request being worked on. Empty shelves = fresh project.

**Principles applied**: Show what matters to the user, not implementation details. The builder thinks in requests ("add a login page"), not files or tool calls.

**Why**: A non-technical builder doesn't care about files touched or git commits. They care about "I asked for something — did it get done?" Each box maps to one request→delivery cycle. The shelf filling up over a session creates a tangible sense of accomplishment. This is the only unit of work that matches the builder's mental model.

**Tradeoffs accepted**: Requires the server to detect task transitions (when `currentTask` changes, the old one is "completed"). Session-scoped only — shelves reset on server restart, which matches a "workday" metaphor. Capped at ~20-24 visible boxes to keep the interior clean; older tasks scroll off visually but remain in the data. No persistence layer (no DB) — intentionally lightweight.

---

## 2026-03-10 | Warm UI chrome + sky gradient + thought bubbles + warehouse interior

**Decision**: Three visual cohesion changes plus an interior redesign. (1) Replaced all cold Tailwind grays with a custom warm `village` color scale derived from the PixiJS palette. (2) Added a 10-step sky gradient (deep blue → warm sage) as a fixed stage layer, and amplified building window glow 2-3x. (3) Added parchment-colored thought bubbles above buildings with active agents, showing humanized task text in a dedicated UI layer. (4) Redesigned the interior from a desk/monitor office to a warehouse with shelf systems, 3D pixel-art crates, hand carts, and agents carrying boxes.

**Principles applied**: Visual cohesion between rendering layers; the metaphor should be consistent everywhere.

**Why**: The PixiJS village used warm earthy tones but the React UI overlay used cold generic dark-mode grays — they felt like two different apps. The flat sky was the largest visual surface but the least interesting. Active agents were only indicated by tiny 2.5px status dots. The desk/monitor interior didn't match the emerging warehouse/workshop metaphor.

**Tradeoffs accepted**: Custom Tailwind colors mean less interoperability with standard gray utilities. The sky gradient is a large Graphics object (5000x4000) for viewport coverage. Thought bubbles in a separate layer add rendering overhead. The warehouse interior is more complex to draw than the old desk scene. All acceptable for visual impact.

---

## 2026-03-10 | Front-facing storefront buildings with interior view

**Decision**: Replace the isometric rooftop buildings with tall front-facing storefronts (140x200px) featuring display windows, awnings, and signage. Agents are rendered inside the shop window area. Clicking a store opens a pixel-art interior scene (PixiJS canvas) showing agents at workstations.

**Principles applied**: Match user's visual references; UI should communicate state at a glance.

**Why**: The user provided pixel art reference images showing cafe/shop exteriors (front-facing facades with large windows) and cozy interiors. The original isometric rooftop buildings didn't convey the "workshop" feel. Front-facing storefronts with visible agents working inside immediately communicate each project's activity level.

**Tradeoffs accepted**: Front-facing buildings on an isometric grid is a visual compromise — buildings don't tilt isometrically. However, the result reads better as a "village street" and matches the reference aesthetic. The interior view uses a second PixiJS canvas, adding memory overhead per click.

---

## 2026-03-10 | Warmer color palette and richer detail

**Decision**: Shifted the entire color palette from bright/cool tones to warm earth tones (stone, brick, wood, amber glow). Added flower boxes, hanging lights, lamp posts next to each building, and shelf items inside windows.

**Principles applied**: Warmth conveys coziness; detail conveys life.

**Why**: Reference images had a distinctly warm, cozy aesthetic (dark wood, amber lighting, earth tones). The previous palette used bright primary colors that felt more game-like than workshop-like.

**Tradeoffs accepted**: More drawing operations per building (complex sprite generator). Warm tones may reduce contrast between buildings — mitigated by using unique accent colors for awnings and signs.

---

## 2026-03-10 | Username-aware project name extraction

**Decision**: When parsing encoded directory names like `Users-alice-Documents-GitHub-foo`, skip the username segment that follows `Users` or `home` in addition to known path prefixes.

**Principles applied**: Correctness; user-facing display quality.

**Why**: The first implementation only tracked "known prefixes" (Users, Documents, GitHub, etc.) but treated the username as a regular segment, causing names like "alice-ad-hoc" instead of "ad-hoc". Since the username always immediately follows a user-root directory, we can reliably skip it.

**Tradeoffs accepted**: Hard-codes the assumption that usernames are a single segment (no hyphens in the username itself). Works for typical setups.

---

## 2026-03-10 | PixiJS v8 Graphics API pattern: shape-then-fill

**Decision**: All programmatic sprite generators use the `g.poly([...]).fill(color)` / `g.rect(...).fill(color)` pattern where the shape is defined before fill is called.

**Principles applied**: Follow library conventions; avoid silent failures.

**Why**: PixiJS v8 changed the Graphics API from v7. The old `beginFill()...endFill()` pattern was replaced with a declarative shape-then-style approach. Using the wrong order produces empty textures with no error.

**Tradeoffs accepted**: More verbose than method chaining for complex shapes. Each shape+fill is a separate call pair.

---

## 2026-03-10 | Pending-state ref pattern for async PixiJS initialization

**Decision**: Use a React ref (`pendingStateRef`) to track the latest WebSocket state, applying it after PixiJS async `app.init()` completes.

**Principles applied**: Correct async state management; avoid race conditions.

**Why**: PixiJS `app.init()` is async. WebSocket state can arrive before initialization finishes. A `useEffect([state])` won't re-fire if the state arrived during init. The ref ensures the latest state is always applied regardless of timing.

**Tradeoffs accepted**: Slightly more complex React lifecycle management. An alternative would be initializing PixiJS synchronously, but v8 requires async init.

---

## 2026-03-10 | Programmatic sprite generation over asset files

**Decision**: Generate all pixel art (buildings, characters, tiles, decorations) via canvas API at runtime rather than using static PNG assets.

**Principles applied**: Minimize external dependencies; enable dynamic theming.

**Why**: Allows buildings to be dynamically colored per project without maintaining dozens of asset variants. No need for an artist or asset pipeline. Easy to iterate.

**Tradeoffs accepted**: Sprites will be simpler than hand-drawn pixel art. Visual quality is bounded by what we can draw programmatically. Can swap in real assets later without architectural changes.

---

## 2026-03-10 | PixiJS over CSS isometric rendering

**Decision**: Use PixiJS v8 as the village renderer instead of CSS transforms + HTML elements.

**Principles applied**: Match the user's vision (vibrant, Sims-like); choose the right tool for the job.

**Why**: CSS isometric can handle static layouts but struggles with smooth sprite animations, z-ordering across many elements, and pixel-perfect rendering. PixiJS is battle-tested for 2D games, handles thousands of sprites at 60fps, and provides built-in interaction events.

**Tradeoffs accepted**: Adds ~200KB to bundle. Steeper learning curve than pure CSS. React can't directly manage PixiJS objects (need a bridge layer). Worth it for the visual quality.

---

## 2026-03-10 | socket.io over raw WebSocket

**Decision**: Use socket.io for real-time communication between server and client.

**Principles applied**: Reduce boilerplate; reliability over minimalism.

**Why**: socket.io provides auto-reconnection, fallback transports, and a clean event API. Raw WebSocket would require implementing reconnection logic, heartbeats, and message framing manually.

**Tradeoffs accepted**: Slightly larger bundle than raw WS. Tied to socket.io protocol (not interchangeable with plain WS clients). Acceptable for a local-only tool.

---

## 2026-03-10 | chokidar file watching over periodic polling

**Decision**: Use chokidar to watch Cursor/Claude Code directories for changes rather than polling on an interval.

**Principles applied**: Responsiveness; efficiency.

**Why**: File-system events fire within milliseconds of a change. Polling would require choosing an interval (too fast = CPU waste, too slow = stale data). chokidar handles cross-platform FS events reliably.

**Tradeoffs accepted**: chokidar adds a native dependency. Watching many directories can consume file descriptors. Mitigated by watching at the project root level with glob patterns.

---

## 2026-03-10 | Web app (localhost) over desktop app

**Decision**: Build as a web app served on localhost rather than an Electron/Tauri desktop app.

**Principles applied**: Simplicity; fast iteration; user preference.

**Why**: User chose web app. No need for native OS integration. Faster to develop. Can run alongside existing dev tools. No app signing or distribution complexity.

**Tradeoffs accepted**: Requires starting a server manually (or via npm script). No system tray icon. No native notifications. All acceptable for a developer tool.

---

## 2026-03-10 | Monorepo with separate package.json files

**Decision**: Structure as `server/` and `client/` directories with their own package.json, coordinated by a root package.json using concurrently.

**Principles applied**: Separation of concerns; independent dependency trees.

**Why**: Server needs Node.js-only packages (chokidar, express). Client needs browser packages (pixi.js, react). Keeping them separate avoids dependency conflicts and keeps each side's node_modules clean.

**Tradeoffs accepted**: Slightly more complex setup than a single package.json. Need `concurrently` to run both. Shared types require a `shared/` directory with path references.

---

## 2026-03-10 | Accurate agent activity (lastAction from agent POV)

**Decision**: Replace showing the user's request as the agent's task with the agent's **last actual action** extracted from transcript/session data. Add a `lastAction` field to the `Agent` interface, populated from the last assistant message (Cursor transcripts) or last `tool_use` call (Claude Code sessions). Original user request is preserved in `currentTask` and shown on expand.

**Principles applied**: Show what the agent IS doing, not what it was asked to do. Honest, glanceable status.

**Why**: The user pointed out that "task description describes what I asked the agent to do. It doesn't describe what the agent is actually doing from its POV." A data audit revealed that Cursor JSONL transcripts contain full assistant messages and Claude Code sessions contain typed tool_use entries, both of which provide accurate agent-POV activity.

**Tradeoffs accepted**: Parsing JSONL files line-by-line is more expensive than grabbing the first user_query tag, but necessary for accuracy. The `lastAction` for Cursor agents is the first sentence of the last assistant message, which may sometimes be a preamble rather than a concrete action (Claude Code's tool_use is more precise).

---

## 2026-03-10 | Three-state status model (working / waiting / done)

**Decision**: Replace the binary `active`/`idle` status with a three-state model: `working` (agent actively executing), `waiting` (finished but session recent, needs user input), `done` (session old or completed). Color coding: green pulsing (working), yellow (waiting), gray (done).

**Principles applied**: Honest status labels. "On break" implies the agent chose to rest; "waiting" correctly indicates it's waiting for the user.

**Why**: The old "active/idle" model conflated three distinct states. A terminal with an exit code is fundamentally different from an agent that just finished responding and is waiting for the next instruction. The new model communicates this clearly.

**Tradeoffs accepted**: Three states require slightly more complex detection logic (checking timestamps, PID liveness, exit codes, and recency thresholds). The 2-minute "working" threshold and 1-hour "waiting" threshold are heuristics that may need tuning.
