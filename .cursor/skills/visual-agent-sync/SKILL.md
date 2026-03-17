---
name: visual-agent-sync
description: Ensures visual and agent-level changes stay in sync. Triggers when modifying sprites, scenes, UI components, animations, or status mappings. Prompts a review of whether the visual change requires a corresponding update to watchers, state manager, shared types, or vice versa.
---

# Visual-Agent Sync Review

When a change touches the visual layer or the agent layer of Builders Village, pause and evaluate whether the other layer also needs updating. These two layers are tightly coupled through a data-driven rendering pipeline:

```
Watchers → StateManager → socket.io → useVillageState → VillageScene + InteriorView
```

## When to trigger

Activate this review whenever a change touches any of these areas:

### Visual layer

- `client/src/village/` — `VillageScene.ts`, `IsometricGrid.ts`, anything under `sprites/`
- `client/src/components/` — `InteriorView.tsx`, `VillageCanvas.tsx`, `Header.tsx`, `DetailPanel.tsx`
- Any sprite rendering, animation logic, color palette, or status-to-visual mapping

### Agent layer

- `server/src/watchers/` — `cursorWatcher.ts`, `claudeWatcher.ts`, `codexWatcher.ts`, `fireEventWatcher.ts`
- `server/src/stateManager.ts`
- `shared/types.ts` — `AgentStatus`, `Agent`, `Project`, `VillageState`
- `server/src/utils/` — terminal/transcript parsers

## Review checklist

When you detect a change in either layer, walk through these questions with the user before finalizing:

### Visual change → Agent impact

If the change is visual (new animation, new sprite state, new UI element, color change):

1. **New status or state?** Does this visual introduce a status that doesn't exist yet in `AgentStatus` or `shared/types.ts`? If so, the type and watchers need updating.
2. **Data dependency?** Does the visual rely on data the agent layer doesn't currently provide (e.g., a new field on `Agent` or `Project`)? If so, add the field to shared types and populate it in the watchers/state manager.
3. **Both scenes?** If the change affects `VillageScene.ts`, does `InteriorView.tsx` need a matching update (or vice versa)? Both consume the same agent state and should stay visually consistent.
4. **Status mapping?** If the change alters how a status is displayed (e.g., new fire tint, different idle animation), does the status-to-visual mapping table still hold?

### Agent change → Visual impact

If the change is in watchers, state manager, or shared types:

1. **New status value?** If a new `AgentStatus` is added, both `VillageScene.ts` and `InteriorView.tsx` need branches to handle it visually (sprite frame, animation, status light color, building tint).
2. **New data field?** If a new field is added to `Agent` or `Project`, should the UI display it? Consider `Header.tsx` stats, `InteriorView.tsx` agent rows, and `DetailPanel.tsx`.
3. **Changed semantics?** If the meaning of an existing status changes (e.g., `waiting` now includes a sub-state), do the visual mappings still make sense?
4. **Character sprites?** If agent identity or source data changes, does `characters.ts` need new frames or color logic?

## Current status-to-visual mapping

Reference this when evaluating changes:

| AgentStatus | Status light | Building | VillageScene agent | InteriorView agent |
|-------------|-------------|----------|-------------------|-------------------|
| `working`   | Green       | Normal   | Walks, carries box | Walks floor, carries crate |
| `waiting`   | Gray        | Dulled   | Centered, idle    | Stands still |
| `done`      | Gray        | Dulled   | Centered, idle    | Stands still |
| `error`     | Red         | Orange tint, fire | Shakes, red `!` | Shakes, circles |

## How to respond

After reviewing the checklist, present findings to the user in this format:

```
Visual-Agent Sync Review:
- Change type: [visual / agent / both]
- Files touched: [list]
- Cross-layer impact: [yes / no]
- If yes, recommended updates: [specific files and what to change]
- If no, brief explanation of why the change is self-contained
```

Only flag genuine coupling concerns — don't block purely cosmetic changes (e.g., adjusting a color shade) that have no agent-layer dependency.
