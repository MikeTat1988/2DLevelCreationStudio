# 2DLevelCreationStudio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. After each milestone, stop for user inspection before proceeding.

**Goal:** Build a local browser-based studio that creates structured 2D kids adventure games with connected levels, imported Rig Studio characters, reusable mechanics, AI/Codex-assisted authoring, and previewable level interactions.

**Architecture:** The first version is a standalone static web app in `C:\Dev\2DLevelCreationStudio`. It stores a full game project tree in JSON, renders a level viewer in the browser, lets the user author levels/objects/mechanics visually, and provides an AI Mode handoff surface that can start as copy-context and later connect to a local Codex bridge. It is not a Godot/Popochiu project and does not depend on Godot at runtime.

**Tech Stack:** Static HTML/CSS/JavaScript, Canvas or DOM overlay viewer, `localStorage` for working state, JSON import/export for project truth, optional later local Node/PowerShell bridge for Codex CLI.

---

## Product Definition

`2DLevelCreationStudio` is not just an image generator and not just an asset exporter. It is the authoring environment for a real 2D adventure game project.

The studio owns this tree:

```text
Game Project
├── Characters
│   └── imported from Rig Studio output
├── Inventory / Items
├── Mechanics Library
├── Levels
│   ├── Level 1
│   ├── Level 2
│   └── linked rooms / exits / conditional transitions
└── Game Flow
    ├── start level
    ├── level graph
    └── future display mode: separated levels or continuous game
```

The studio uses generated/imported images as assets, but the main deliverable is a structured playable game project model: levels, objects, hotspots, mechanics, inventory, links, prompts, and preview state.

---

## Repository / Folder Layout

Create this folder structure:

```text
C:\Dev\2DLevelCreationStudio
├── README.md
├── 2DLevelCreationStudio_IMPLEMENTATION_PLAN.md
├── app.manifest.json
├── docs
│   ├── data-model.md
│   ├── mechanics-library.md
│   └── ai-mode.md
└── wwwroot
    ├── index.html
    ├── style.css
    ├── app.js
    ├── sample-project.json
    └── assets
        └── placeholder-level.svg
```

File responsibilities:

- `wwwroot/index.html`: static app shell and main UI regions.
- `wwwroot/style.css`: compact studio UI, panels, viewer, dialogs, mechanics preview styling.
- `wwwroot/app.js`: state model, rendering, import/export, level viewer, AI Mode, mechanics preview.
- `wwwroot/sample-project.json`: bundled demo project used for first load and tests.
- `README.md`: how to run, what the tool is, and what it is not.
- `docs/data-model.md`: JSON schema and field meanings.
- `docs/mechanics-library.md`: reusable mechanics descriptions and role contracts.
- `docs/ai-mode.md`: AI Mode and future Codex bridge behavior.

---

## Core Data Model

Use a single project object as the source of truth:

```js
const project = {
  schemaVersion: 1,
  game: {
    id: 'new-game',
    title: 'New Kids Adventure',
    startLevelId: 'level_1',
    notes: ''
  },
  characters: [],
  inventory: [],
  mechanicsLibrary: [],
  levels: [],
  flow: {
    links: []
  },
  assets: [],
  aiHistory: []
};
```

A level stores playable authoring data:

```js
const level = {
  id: 'level_1',
  name: 'Level 1',
  canvas: { width: 1536, height: 864, aspect: '16:9' },
  phaseStatus: {
    conceptApproved: false,
    layersApproved: false,
    assetsApproved: false,
    mechanicsApproved: false
  },
  prompts: {
    concept: '',
    fullLevelImage: '',
    layerSeparation: ''
  },
  layers: [
    { id: 'background', name: 'Background', order: 0, visible: true },
    { id: 'background_objects', name: 'Background Objects', order: 1, visible: true },
    { id: 'player', name: 'Player Space', order: 2, visible: true },
    { id: 'foreground_1', name: 'Foreground 1', order: 3, visible: true },
    { id: 'foreground_2', name: 'Foreground 2', order: 4, visible: true }
  ],
  objects: [],
  hotspots: [],
  mechanics: [],
  exits: [],
  engineNotes: ''
};
```

Objects are visual and gameplay-addressable:

```js
const object = {
  id: 'obj_table',
  name: 'Long table',
  layerId: 'foreground_1',
  position: { x: 640, y: 610 },
  size: { width: 360, height: 120 },
  interactive: true,
  exportSeparately: true,
  occludesPlayer: 'legs',
  assetRef: null,
  notes: ''
};
```

Mechanic instances connect objects and game state:

```js
const mechanic = {
  id: 'mech_reveal_key_under_pillow',
  type: 'move_to_reveal_collectible',
  name: 'Reveal key under pillow',
  enabled: true,
  roles: {
    coverObjectId: 'obj_pillow',
    hiddenObjectId: 'obj_small_key',
    inventoryItemId: 'item_small_key'
  },
  animation: { direction: 'right', distance: 70, durationMs: 450, popScale: 1.25 },
  result: { collectToInventory: true, persistentReveal: false },
  notes: ''
};
```

---

## Milestone 1: App Shell + Game Tree

**Goal:** Open a usable studio shell that can create a game, add levels, and show a game tree.

**Files:**
- Create: `C:\Dev\2DLevelCreationStudio\wwwroot\index.html`
- Create: `C:\Dev\2DLevelCreationStudio\wwwroot\style.css`
- Create: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- Create: `C:\Dev\2DLevelCreationStudio\wwwroot\sample-project.json`
- Create: `C:\Dev\2DLevelCreationStudio\README.md`
- Create: `C:\Dev\2DLevelCreationStudio\app.manifest.json`

- [x] Step 1: Create the static app shell with a three-column layout: game tree, level viewer, inspector.
- [x] Step 2: Add initial state with one game and one level.
- [x] Step 3: Render the game tree with sections: Characters, Inventory, Mechanics Library, Levels, Game Flow.
- [x] Step 4: Add buttons: `Start Game`, `Add Level`, `Export Project`, `Import Project`.
- [x] Step 5: Implement `Add Level` so it creates `Level 2`, `Level 3`, etc. and selects the new level.
- [x] Step 6: Implement JSON export/import for the full project object.
- [x] Step 7: Serve the app locally:

```powershell
cd C:\Dev\2DLevelCreationStudio\wwwroot
python -m http.server 5190 --bind 127.0.0.1
```

- [x] Step 8: Open in IAB at `http://127.0.0.1:5190/` and inspect visually.
- [ ] Stop: User inspects shell, game tree, add-level flow, export/import flow.

Acceptance criteria:

- App loads with no visible crash.
- User can add at least two levels.
- Project JSON export contains all levels.
- Re-imported JSON restores the same game tree.

---

## Milestone 2: Level Viewer + Layers + Objects

**Goal:** Make each level visually authorable with layers, objects, selection, bounding boxes, and inspector editing.

**Files:**
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\index.html`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\style.css`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`

- [ ] Step 1: Add a 16:9 level viewer with internal canvas coordinates `1536 x 864`.
- [ ] Step 2: Render layer toggles for `Background`, `Background Objects`, `Player Space`, `Foreground 1`, `Foreground 2`.
- [ ] Step 3: Add `Add Object` command that creates an object at the last clicked point or center of the level.
- [ ] Step 4: Draw object bounding boxes over the viewer.
- [ ] Step 5: Selecting an object updates inspector fields: name, layer, x, y, width, height, interactive, occlusion, export name, notes.
- [ ] Step 6: Inspector edits update the viewer immediately.
- [ ] Step 7: Add drag-to-move object boxes.
- [ ] Step 8: Add basic image asset assignment through file picker and object URL preview.
- [ ] Step 9: Export/import verifies object metadata survives.
- [ ] Stop: User inspects level viewer, layer toggles, object editing, and asset assignment.

Acceptance criteria:

- Objects can be created, selected, moved, and edited.
- Each object belongs to a layer.
- Layer visibility affects object display.
- Imported asset can be assigned to an object.

---

## Milestone 3: Rig Studio Character Import

**Goal:** Use existing Rig Studio character output; do not create or edit rigs in this studio.

**Files:**
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\index.html`
- Create: `C:\Dev\2DLevelCreationStudio\docs\data-model.md`

- [ ] Step 1: Add `Import Character` UI under Characters.
- [ ] Step 2: Accept a Rig Studio JSON file and optional PNG assets selected by user.
- [ ] Step 3: Store character metadata: id, name, baseline, scale, modes, asset filenames.
- [ ] Step 4: Require at least `idle_side` and `walk_side` modes for gameplay preview.
- [ ] Step 5: Show imported character in the tree.
- [ ] Step 6: Add selected character preview marker in level viewer using simple placeholder if real sprites are missing.
- [ ] Step 7: Save/load character metadata in Project JSON.
- [ ] Stop: User imports or simulates Tom character and confirms studio treats it as external rig output.

Acceptance criteria:

- Studio never edits rig anchors or body parts.
- Character appears as a project resource.
- Mechanics can later reference character modes by name.

---

## Milestone 4: Mechanics Library + Preview

**Goal:** Add reusable mechanics as first-class project items with role binding and preview animation.

**Files:**
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\index.html`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\style.css`
- Create: `C:\Dev\2DLevelCreationStudio\docs\mechanics-library.md`

- [ ] Step 1: Define built-in mechanics library entries:
  - `move_to_reveal_collectible`
  - `move_to_reveal_persistent`
  - `open_container_collectible`
  - `locked_object_requires_item`
  - `inspect_clue`
  - `level_exit`
  - `conditional_level_exit`
- [ ] Step 2: Show mechanics library in left sidebar.
- [ ] Step 3: Add `Attach Mechanic` to selected object or level.
- [ ] Step 4: Inspector shows mechanic roles and lets user bind project objects/items/exits.
- [ ] Step 5: Implement preview animation for `move_to_reveal_collectible`: cover object moves, hidden object appears, hidden object pops larger, then returns to normal slot.
- [ ] Step 6: Implement preview for `move_to_reveal_persistent`: cover object moves and revealed object remains visible.
- [ ] Step 7: Save/load mechanic instances in Project JSON.
- [ ] Step 8: Add AI-readable descriptions for each mechanic in `docs/mechanics-library.md` and in app state.
- [ ] Stop: User attaches a reveal mechanic to two objects and reviews preview.

Acceptance criteria:

- Mechanics are reusable templates, not custom one-off scripts.
- A mechanic instance binds roles to objects/items/exits.
- Preview animation works without full game runtime.

---

## Milestone 5: Game Flow + Connected Levels

**Goal:** Represent levels as a connected adventure graph.

**Files:**
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\index.html`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\style.css`

- [ ] Step 1: Add `Game Flow` inspector view.
- [ ] Step 2: Add level exits to the selected level: id, name, from object/hotspot, target level, condition.
- [ ] Step 3: Add `Link Levels` UI to connect Level 1 to Level 2.
- [ ] Step 4: Add visual flow list or simple graph-like table showing `from level -> exit -> target level`.
- [ ] Step 5: Add `level_exit` and `conditional_level_exit` mechanics binding.
- [ ] Step 6: Save/load links in Project JSON.
- [ ] Stop: User creates Level 1, Level 2, and links an exit between them.

Acceptance criteria:

- Levels are not isolated exports.
- Game has a start level.
- Level links can be conditional or direct.

---

## Milestone 6: AI Mode Dialog + Copy Context Fallback

**Goal:** User clicks in the level viewer, types a short instruction, and gets a complete context package for Codex.

**Files:**
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\index.html`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\style.css`
- Create: `C:\Dev\2DLevelCreationStudio\docs\ai-mode.md`

- [ ] Step 1: Add `AI Mode` toggle in top toolbar.
- [ ] Step 2: When AI Mode is on, clicking level viewer opens modal dialog instead of selecting/moving objects.
- [ ] Step 3: Dialog includes user instruction field, e.g. `add a long table here`.
- [ ] Step 4: Dialog renders full structured context:
  - project title
  - current level id/name
  - canvas size
  - click coordinates and percent coordinates
  - selected/nearest objects
  - current layer
  - available mechanics
  - imported character summary
  - asset filename/path hints
  - child-safe style rules
  - recommended output dimensions
  - suggested target object id and filename
- [ ] Step 5: `Copy Context` copies a complete markdown request to clipboard.
- [ ] Step 6: `Create Placeholder From Instruction` creates a placeholder object at the clicked point using the short instruction as its name.
- [ ] Step 7: Save copied AI interactions into `aiHistory`.
- [ ] Stop: User opens IAB, clicks a point, types instruction, copies context, and verifies it is useful for Codex chat.

Acceptance criteria:

- “Here” becomes exact x/y and level context.
- Copy fallback is complete enough for Codex to answer without asking where/which level.
- AI Mode does not require Codex bridge yet.

---

## Milestone 7: Optional Codex Bridge Design Hook

**Goal:** Prepare the app for direct Codex CLI integration without blocking v1.

**Files:**
- Modify: `C:\Dev\2DLevelCreationStudio\docs\ai-mode.md`
- Optionally create later: `C:\Dev\2DLevelCreationStudio\bridge\codex-bridge.ps1`
- Optionally create later: `C:\Dev\2DLevelCreationStudio\bridge\server.js`

- [ ] Step 1: In docs, define bridge request JSON shape matching AI Mode context.
- [ ] Step 2: In docs, define expected bridge response JSON:
  - proposed objects
  - proposed mechanics
  - generated prompts
  - target asset slots
  - warnings
- [ ] Step 3: Add disabled/future `Ask Codex` button in AI dialog with status text: `Codex bridge not connected`.
- [ ] Step 4: Do not implement direct CLI execution in browser.
- [ ] Stop: User reviews whether bridge should be implemented next or stay as future enhancement.

Acceptance criteria:

- App design supports Codex CLI integration later.
- v1 remains useful without bridge.
- No browser security workaround is introduced.

---

## Milestone 8: Prompt Workflow From Level Instructions

**Goal:** Encode the provided 2D kids level creation instructions into app prompts and staged gates.

**Files:**
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\index.html`
- Modify: `C:\Dev\2DLevelCreationStudio\docs\data-model.md`

- [ ] Step 1: Add Phase 1 fields: summary, visual composition, gameplay purpose, safety check, full-level prompt.
- [ ] Step 2: Add Phase 2 layer separation table inside the level inspector.
- [ ] Step 3: Add Phase 3 asset slots for background, background objects, player space, foreground 1, foreground 2, and individual objects.
- [ ] Step 4: Add approval buttons per phase.
- [ ] Step 5: Prompt helpers include child-safe constraints by default.
- [ ] Step 6: Add warning if prompt text includes inappropriate themes: horror, gore, realistic violence, weapons, drugs, alcohol, adult themes.
- [ ] Stop: User checks that the staged workflow matches the original instruction file.

Acceptance criteria:

- The studio enforces staged thinking without preventing iteration.
- The level instructions are available through UI, not hidden only in docs.

---

## Milestone 9: Runtime Preview Lite

**Goal:** Give a lightweight preview of level interaction flow without becoming a full game engine.

**Files:**
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- Modify: `C:\Dev\2DLevelCreationStudio\wwwroot\style.css`

- [ ] Step 1: Add `Preview Mode` toggle.
- [ ] Step 2: In Preview Mode, clicking objects runs attached mechanic preview instead of editing.
- [ ] Step 3: Inventory panel shows collected items from preview state.
- [ ] Step 4: Level exit preview changes selected level when conditions are met.
- [ ] Step 5: Add `Reset Preview State`.
- [ ] Stop: User tests a tiny two-level flow with one reveal mechanic and one exit.

Acceptance criteria:

- Preview is enough to validate mechanics and flow.
- Preview state does not overwrite authoring data.

---

## Milestone 10: Final Verification + Cleanup Decision

**Goal:** Verify the studio, then remove Godot/Popochiu if user confirms.

**Files:**
- No studio code changes unless verification finds issues.

- [ ] Step 1: Run static app locally and inspect in IAB.
- [ ] Step 2: Create sample game with two levels, Tom placeholder/imported character, one reveal mechanic, one level link.
- [ ] Step 3: Export project JSON.
- [ ] Step 4: Reload page and import JSON.
- [ ] Step 5: Confirm restored game tree, objects, mechanics, level link, AI history.
- [ ] Step 6: Ask user whether to clean Godot/Popochiu now.
- [ ] Step 7: If user explicitly confirms cleanup, delete:

```text
C:\Dev\TomGame-PopochiuLab
C:\Dev\Tools\Godot-4.3
```

- [ ] Step 8: Remove this User PATH entry:

```text
C:\Dev\Tools\Godot-4.3
```

- [ ] Step 9: Verify cleanup:

```powershell
Test-Path 'C:\Dev\TomGame-PopochiuLab'
Test-Path 'C:\Dev\Tools\Godot-4.3'
[Environment]::GetEnvironmentVariable('Path','User') -split ';' | Where-Object { $_ -match 'Godot|Popochiu' }
```

Expected:

```text
False
False
(no matching PATH entries)
```

Acceptance criteria:

- Studio is verified before cleanup.
- Cleanup is explicit and not accidental.
- `C:\Dev\TomGame` remains untouched.

---

## Cleanup Timing Decision

We do not strictly need Godot or Popochiu anymore for this plan. We already extracted the useful product lessons:

- game tree and object concepts from Popochiu
- rooms/characters/props/hotspots/inventory/dialogue structure
- Godot-style inspector/project tree thinking
- addon separation lesson: external engine/plugin should not become part of this studio

So cleanup can be done now if the user wants a clean machine immediately.

However, recommended default is:

1. Keep Godot/Popochiu until Milestone 1 or 2 is implemented and visually inspected.
2. Then remove them once we know the new studio direction is working.

Reason: they are not needed for implementation, but having the sample lab available for one more visual comparison pass may help if we want to re-check UX vocabulary or mechanics structure.

---

## Implementation Checkpoints

After every milestone:

1. Stop implementation.
2. Open the app in IAB when relevant.
3. Inspect visible UI/state.
4. User says what feels wrong/right.
5. Only then proceed to the next milestone.

This project should not be built as one big uninterrupted pass.
