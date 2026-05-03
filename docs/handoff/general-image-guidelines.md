# General Image Guidelines

These rules apply to every generated level image. They stay stable and should not be repeated in the short user approval brief.

## Product Context

- The project is a 2D kids adventure game level authoring studio.
- The image is not just concept art. It will become a playable level with layers, objects, interactions, and logic.
- The model should plan the image and the structured level data together. Do not require a second image-analysis pass to discover what was generated.

## Canvas

- Target: `1536 x 864`.
- Aspect: `16:9`.
- Camera: side-view adventure room or scene.
- The level must remain readable at game scale.

## Safety

- Child-safe, friendly adventure tone.
- No horror, gore, realistic violence, weapons, drugs, alcohol, adult themes, or sexual content.
- Tension is allowed only as mild puzzle curiosity, not fear.

## Art Direction

- High-quality hand-painted 2D cartoon/adventure-game illustration.
- Clear silhouettes.
- Readable object shapes.
- Warm lighting when appropriate.
- Avoid tiny clutter that cannot become useful game data.

## Layer Planning

Every generated level should be planned into:

- `background`: clean permanent room shell and floor. This is the playable base plate. It should not contain movable props that need to be clicked, collected, moved, or removed later.
- `background_objects`: fixed readable objects attached to walls, ceiling, or permanent architecture. Examples: wall shelves, maps, portholes, pipes, lamps, fixed doors.
- `player`: walkable floor zone and large floor props the character can approach. These can be baked or separately exported depending on gameplay.
- `foreground_1`: clickable, movable, collectible, or puzzle props. These must be planned as individual transparent PNG assets.
- `foreground_2`: front-most occluders or frame pieces that draw over the character. Use sparingly and plan as separate transparent PNG assets if they occlude gameplay.

The structured elements list must be richer than one generic prop. Every meaningful visual/gameplay object should have:

- stable `id`
- readable `name`
- `layerId`
- `kind`
- `position` and `size` in 1536 x 864 coordinates
- `logicRole`
- `imagePath`
- `promptPath`
- `needsBgRemoval`
- `movable`
- `interactive`

## Asset Rules

- Movable objects should be visually separable from the background.
- Collectibles should be small but readable.
- Important props should not be fused into heavy shadows or neighboring objects.
- If an object will move, reveal, or be collected, plan it as a future transparent PNG cutout.
- Permanent room shell stays baked into the background.
- For every `foreground_1` or `foreground_2` movable/interactive object, generate a transparent-background PNG.
- For the background, generate a clean background plate with the room shell, walls, floor, fixed lighting, and no duplicate movable props.
- For floor objects, separate the floor itself from movable floor props.
- For wall objects, separate fixed wall decoration from interactive/clickable wall objects.

## Handoff Contract

Every new level starts with a background pass:

1. Generate only an empty background plate and walkable floor zone.
2. Do not include movable props, collectibles, puzzle objects, characters, or foreground clutter in the background pass.
3. Let the user inspect the empty background in Studio.
4. Only after the background is accepted, generate gameplay elements as separate transparent PNGs and place them on top by coordinates.

The short user-facing brief is for approval. The structured plan is for the app and Codex. If the user rejects/regenerates, overwrite the current brief and current plan. If the user edits the brief, regenerate the plan from the edited brief before proceeding.
