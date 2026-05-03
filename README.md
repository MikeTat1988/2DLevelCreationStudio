# 2DLevelCreationStudio

Local browser-based studio for creating structured 2D kids adventure game projects.

This is a local browser studio for authoring a level request, handing it to Codex for generation, then applying the generated image and structured elements back into the studio tree.

## Run

```powershell
cd C:\Dev\2DLevelCreationStudio
node server.js
```

Then open:

```text
http://127.0.0.1:5190/
```

The app needs `server.js` for the local Codex handoff flow. A plain static server can show the UI, but it cannot write/read the local handoff files.

## Codex Handoff Flow

1. Open the app.
2. Type a short level idea, for example `Inside of a pirate ship`.
3. Optionally add short level plan notes.
4. Click `Prepare handoff`.
5. The app writes the current handoff files:

```text
C:\Dev\2DLevelCreationStudio\docs\handoff\general-image-guidelines.md
C:\Dev\2DLevelCreationStudio\handoff\requests\<level-id>-image-brief-current.md
C:\Dev\2DLevelCreationStudio\handoff\requests\<level-id>-structured-plan-current.json
```

6. Codex reads those three files, generates the image/assets, and saves the current full level image to:

```text
C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\<level-id>-current.png
```

7. Codex should also create per-element prompt/image files when the structured plan includes `promptPath` and `imagePath`.
8. Click `Apply Codex result` in the studio. The app reads the current structured plan and image, refreshes the level image, updates the level tree, and records the generated assets.

If you regenerate, the app overwrites the current brief and current plan for that level. Runtime handoff files and generated images are intentionally gitignored except for directory keepers.

The Studio UI should stay simple: collapsible generation prompt at the top, then the element tree. File paths are accessed from each element node using `Reveal image`, `Reveal prompt`, or `Copy id`.

## Fast File Map

- Server: `C:\Dev\2DLevelCreationStudio\server.js`
- Studio UI: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- General generation rules: `C:\Dev\2DLevelCreationStudio\docs\handoff\general-image-guidelines.md`
- Current generation brief: `C:\Dev\2DLevelCreationStudio\handoff\requests\level_1-image-brief-current.md`
- Current elements list: `C:\Dev\2DLevelCreationStudio\handoff\requests\level_1-structured-plan-current.json`
- Current generated image: `C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\level_1-current.png`
- Per-element prompts: `C:\Dev\2DLevelCreationStudio\handoff\requests\elements\`
- Per-element images: `C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\level_1-*.png`

## What It Is

- A project authoring studio for kids 2D adventure games.
- A structured JSON model for characters, inventory, mechanics, levels, flow, assets, and AI history.
- A local-first tool that can export and import the complete game project.

## What It Is Not

- It is not a Godot or Popochiu runtime.
- It does not edit Rig Studio rigs.
- It does not execute Codex or other local CLI tools from the browser.
