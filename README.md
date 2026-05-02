# 2DLevelCreationStudio

Local browser-based studio for creating structured 2D kids adventure game projects.

This first version is a standalone static web app. It stores the full project model as JSON, lets you add levels, shows the game tree, and supports full project export/import.

## Run

```powershell
cd C:\Dev\2DLevelCreationStudio\wwwroot
python -m http.server 5190 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5190/
```

## What It Is

- A project authoring studio for kids 2D adventure games.
- A structured JSON model for characters, inventory, mechanics, levels, flow, assets, and AI history.
- A local-first tool that can export and import the complete game project.

## What It Is Not

- It is not a Godot or Popochiu runtime.
- It does not edit Rig Studio rigs.
- It does not execute Codex or other local CLI tools from the browser.

