# 2DLevelCreationStudio Data Model

The project JSON is the source of truth for the studio and for future playable exports.

## Project Root

```json
{
  "schemaVersion": 1,
  "game": {
    "id": "new-game",
    "title": "New Kids Adventure",
    "startLevelId": "level_1",
    "notes": ""
  },
  "characters": [],
  "inventory": [],
  "mechanicsLibrary": [],
  "levels": [],
  "flow": { "links": [] },
  "assets": [],
  "aiHistory": []
}
```

## RigStudio Character Export Contract

RigStudio should export whole character states, not internal rig parts. This studio treats the character as a draggable/scalable entity with named states such as idle, walk, and reach.

Required states for gameplay preview:

- `idle_side`
- `walk_side`

Recommended export shape:

```json
{
  "schema": "RigStudioCharacterExport",
  "schemaVersion": 1,
  "character": {
    "id": "tom",
    "name": "Tom",
    "baseline": { "x": 0.5, "y": 0.92 },
    "defaultScale": 1,
    "states": [
      {
        "id": "idle_front",
        "label": "Idle Front",
        "kind": "idle",
        "direction": "front",
        "asset": "tom_idle_front.png"
      },
      {
        "id": "idle_side",
        "label": "Idle Side",
        "kind": "idle",
        "direction": "side",
        "asset": "tom_idle_side.png"
      },
      {
        "id": "walk_side",
        "label": "Walk Side",
        "kind": "walk",
        "direction": "side",
        "asset": "tom_walk_side.png"
      },
      {
        "id": "reach_side",
        "label": "Reach Side",
        "kind": "reach",
        "direction": "side",
        "asset": "tom_reach_side.png"
      }
    ],
    "notes": "Whole-state export. Do not expose body-part anchors to 2DLevelCreationStudio."
  }
}
```

`baseline` uses normalized coordinates inside the sprite frame. `defaultScale` is the starting scale in the level viewer. `asset` is a filename hint; binary PNG selection can be added later.

## Level Logic

Each level has a `logicScript` field for readable puzzle pseudocode:

```json
{
  "logicScript": "Goal: Character reaches the exit after solving the level.\nRules:\n- Character must find item_y before object_n can open.\n- Character can try item_j on object_k, but it should fail with child-safe feedback.\n- Successful actions update inventory or level state explicitly."
}
```

This is not executable code. It is the author-facing bridge between story intent and future mechanics bindings. Later, mechanics can compile or validate parts of this script, but v1 keeps it readable and editable.

## Generation Pipeline

Each level has a `generation` object. It describes the art-generation workflow and the gameplay-facing outputs that must be produced.

```json
{
  "generation": {
    "step": 1,
    "userRequest": "generate me a level that is a prison cell",
    "summary": "Short level idea",
    "composition": "Layer plan and separation notes",
    "gameplayPurpose": "What puzzle logic the room supports",
    "safetyCheck": "Child-safe constraints",
    "fullLevelPrompt": "Prompt for the composed level image",
    "extractionNotes": "How to create clean cutouts",
    "testPrompt": "Internal model brief, normally hidden from the user",
    "draftPlan": null,
    "approvedPlan": null,
    "generatedImageRef": null,
    "assetSlots": []
  }
}
```

Recommended generation order:

1. User writes a short request, such as `generate me a level that is a prison cell`.
2. The studio builds an internal model brief using app context, child-safe rules, layer rules, output dimensions, and gameplay expectations.
3. The model generates the image and the draft structured level plan at the same time.
4. User approves or rejects the combined image plus plan.
5. On approval, `approvedPlan`, `assetSlots`, layer tree objects, and `logicScript` become the next-step source of truth.
6. Cutout/background-removal generation uses the approved asset slots, not a fresh image-analysis pass.

## Asset Slots

Asset slots are planned outputs before real images exist.

```json
{
  "id": "asset_pillow",
  "name": "pillow",
  "layerId": "foreground_1",
  "kind": "movable_prop",
  "movable": true,
  "needsBgRemoval": true,
  "source": "separate_cutout_generation",
  "logicRole": "move_to_reveal_collectible cover object"
}
```

`needsBgRemoval` means the final asset should be a transparent PNG. Prefer separate cutout generation for important movable objects; crop/background-removal from the composed image is acceptable only when edges are clean and the object is not fused into shadows or neighboring props.
