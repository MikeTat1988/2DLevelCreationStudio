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

## Codex UI Automation Generation Flow

1. Open the app.
2. Type a short level idea, for example `Inside of a pirate ship`.
3. Optionally add short level plan notes.
4. Click `Generate`.
5. The app writes the current level package:

```text
C:\Dev\2DLevelCreationStudio\docs\handoff\general-image-guidelines.md
C:\Dev\2DLevelCreationStudio\handoff\requests\<level-id>\image-brief-current.md
C:\Dev\2DLevelCreationStudio\handoff\requests\<level-id>\structured-plan-current.json
C:\Dev\2DLevelCreationStudio\handoff\requests\<level-id>\automation-prompt-current.md
```

6. The server calls the shared UIAutomation app API:

```powershell
dotnet run --project "C:\Dev\Uiautomation\CodexUiAutomation.Cli\CodexUiAutomation.Cli.csproj" -- app send --app "2DLevelCreationStudio" --text "<combined prompt>"
```

The Studio does not manage chats and does not pass output folders. UIAutomation opens the `C:\Dev\Uiautomation` Codex project, creates/reuses the app chat, and gives Codex this output folder:

```text
C:\Dev\Uiautomation\2DLevelCreationStudio
```

7. Studio shows a spinning `Generating image in Codex` indicator and polls:

```text
C:\Dev\Uiautomation\2DLevelCreationStudio
```

8. When a new image appears, Studio imports it into the current level:

```text
C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\<level-id>\backgrounds\<revision>-background.png
C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\<level-id>\current.png
```

9. Background generations are kept under the level, and the Studio UI lets you switch previous background versions back to `current.png`. The external UIAutomation folder is treated as temporary staging and cleaned between runs.
10. The same app-send contract is used for future generation stages: one request, one external output folder, then Studio imports the newest result into the right project location.

The first pass should not create treasure chests, crates, keys, books, props, characters, or foreground clutter. It should only create the playable room shell/floor.

If you regenerate, the app overwrites the current brief and current plan for that level. Runtime handoff files and generated images are intentionally gitignored except for directory keepers.

The Studio UI should stay simple: collapsible generation prompt at the top, then the element tree. File paths are accessed from each element node using `Reveal image`, `Reveal prompt`, or `Copy id`.

## Fast File Map

- Server: `C:\Dev\2DLevelCreationStudio\server.js`
- Studio UI: `C:\Dev\2DLevelCreationStudio\wwwroot\app.js`
- UIAutomation CLI: `C:\Dev\Uiautomation\CodexUiAutomation.Cli\CodexUiAutomation.Cli.csproj`
- UIAutomation output folder: `C:\Dev\Uiautomation\2DLevelCreationStudio`
- General generation rules: `C:\Dev\2DLevelCreationStudio\docs\handoff\general-image-guidelines.md`
- Current generation brief: `C:\Dev\2DLevelCreationStudio\handoff\requests\level_1\image-brief-current.md`
- Current structured plan: `C:\Dev\2DLevelCreationStudio\handoff\requests\level_1\structured-plan-current.json`
- Current automation prompt: `C:\Dev\2DLevelCreationStudio\handoff\requests\level_1\automation-prompt-current.md`
- Current generated image: `C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\level_1\current.png`
- Background history: `C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\level_1\backgrounds\`
- Per-element prompts: `C:\Dev\2DLevelCreationStudio\handoff\requests\level_1\elements\`

## What It Is

- A project authoring studio for kids 2D adventure games.
- A structured JSON model for characters, inventory, mechanics, levels, flow, assets, and AI history.
- A local-first tool that can export and import the complete game project.

## What It Is Not

- It is not a Godot or Popochiu runtime.
- It does not edit Rig Studio rigs.
- It does not generate images inside the browser. The local server starts a Windows UIAutomation helper that sends the generation prompt to Codex UI.
