# Decisions Log

Newest decisions at the top.

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
