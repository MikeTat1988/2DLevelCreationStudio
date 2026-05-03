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
4. The app writes the current request to:

```text
C:\Dev\2DLevelCreationStudio\handoff\requests
```

5. Ask Codex to generate from the latest request.
6. Codex saves the image to:

```text
C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\<level-id>-current.png
```

The request file includes the internal generation brief, layer plan, asset slots, and logic rules.

## What It Is

- A project authoring studio for kids 2D adventure games.
- A structured JSON model for characters, inventory, mechanics, levels, flow, assets, and AI history.
- A local-first tool that can export and import the complete game project.

## What It Is Not

- It is not a Godot or Popochiu runtime.
- It does not edit Rig Studio rigs.
- It does not execute Codex or other local CLI tools from the browser.
