# Codex Notes For Clean Sessions

Default language for user-facing replies: Russian.

## Run Studio

```powershell
cd C:\Dev\2DLevelCreationStudio
node server.js
```

Open:

```text
http://127.0.0.1:5190/
```

## Current Handoff Contract

The studio does not generate images in-browser. It writes a handoff for Codex, Codex generates locally, then the studio applies the result.

Always find these three generation inputs first:

```text
C:\Dev\2DLevelCreationStudio\docs\handoff\general-image-guidelines.md
C:\Dev\2DLevelCreationStudio\handoff\requests\level_1-image-brief-current.md
C:\Dev\2DLevelCreationStudio\handoff\requests\level_1-structured-plan-current.json
```

Codex should save the current level image here:

```text
C:\Dev\2DLevelCreationStudio\wwwroot\assets\generated\level_1-current.png
```

Then use the Studio button `Apply Codex result`, or call:

```text
GET /api/current-generation-result?levelId=level_1
```

## Git Hygiene

Runtime handoff Markdown/JSON and generated images are gitignored. Commit source/docs changes, not generated runtime outputs.
