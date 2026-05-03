# 2DLevelCreationStudio

Local browser-based studio for creating structured 2D kids adventure game projects.

This first version is a standalone static web app. It stores the full project model as JSON, lets you add levels, shows the game tree, and supports full project export/import.

## Run

```powershell
cd C:\Dev\2DLevelCreationStudio
$env:OPENAI_API_KEY='your-api-key'
node server.js
```

Then open:

```text
http://127.0.0.1:5190/
```

The app needs `server.js` for the local Codex handoff flow. A plain static server can show the UI, but `Generate draft` will not write the Markdown request file.

## Codex Handoff Flow

1. Open the app.
2. Type a short level idea, for example `generate me a level that is a prison cell`.
3. Click `Generate draft`.
4. The app writes a short current image brief to:

```text
C:\Dev\2DLevelCreationStudio\handoff\requests
```

It also writes a structured plan JSON next to the brief. The user-facing brief is intentionally short; stable rules live in `docs/handoff/general-image-guidelines.md`.

5. Ask Codex to generate from the latest image brief.
6. Codex reads the general guidelines and structured plan, then saves the image to:

```text
C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\<level-id>-current.png
```

If you regenerate, the app overwrites the current brief and current plan for that level. If you edit the brief, the next generation should use the edited brief and then update the nearby structured plan before proceeding.

## What It Is

- A project authoring studio for kids 2D adventure games.
- A structured JSON model for characters, inventory, mechanics, levels, flow, assets, and AI history.
- A local-first tool that can export and import the complete game project.

## What It Is Not

- It is not a Godot or Popochiu runtime.
- It does not edit Rig Studio rigs.
- It does not execute Codex or other local CLI tools from the browser.
