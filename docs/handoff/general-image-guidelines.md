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

- `background`: permanent room shell, sky, walls, floor, fixed lighting.
- `background_objects`: fixed readable objects attached to the scene.
- `player`: walkable/approachable gameplay area and larger props.
- `foreground_1`: clickable/movable objects and occluders.
- `foreground_2`: front-most occlusion frame if needed.

## Asset Rules

- Movable objects should be visually separable from the background.
- Collectibles should be small but readable.
- Important props should not be fused into heavy shadows or neighboring objects.
- If an object will move, reveal, or be collected, plan it as a future transparent PNG cutout.
- Permanent room shell stays baked into the background.

## Handoff Contract

The short user-facing brief is for approval. The structured plan is for the app and Codex. If the user rejects/regenerates, overwrite the current brief and current plan. If the user edits the brief, regenerate the plan from the edited brief before proceeding.

