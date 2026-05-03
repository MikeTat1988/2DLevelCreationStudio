const STORAGE_KEY = '2d-level-creation-studio-project';

const defaultLayers = [
  { id: 'background', name: 'Background', order: 0, visible: true },
  { id: 'background_objects', name: 'Background Objects', order: 1, visible: true },
  { id: 'player', name: 'Player Space', order: 2, visible: true },
  { id: 'foreground_1', name: 'Foreground 1', order: 3, visible: true },
  { id: 'foreground_2', name: 'Foreground 2', order: 4, visible: true }
];

const rigStudioCharacterSchema = {
  schema: 'RigStudioCharacterExport',
  schemaVersion: 1,
  character: {
    id: 'tom',
    name: 'Tom',
    baseline: { x: 0.5, y: 0.92 },
    defaultScale: 1,
    states: [
      { id: 'idle_front', label: 'Idle Front', kind: 'idle', direction: 'front', asset: 'tom_idle_front.png' },
      { id: 'idle_side', label: 'Idle Side', kind: 'idle', direction: 'side', asset: 'tom_idle_side.png' },
      { id: 'walk_side', label: 'Walk Side', kind: 'walk', direction: 'side', asset: 'tom_walk_side.png' },
      { id: 'reach_side', label: 'Reach Side', kind: 'reach', direction: 'side', asset: 'tom_reach_side.png' }
    ],
    notes: 'Studio controls this as whole-state entities only: drag/drop, state selection, and scale. It does not edit rig parts.'
  }
};

const generationPipelineTemplate = {
  outputSize: { width: 1536, height: 864, aspect: '16:9' },
  styleRules: [
    'child-safe 2D adventure game room',
    'hand-painted cartoon illustration',
    'clear silhouettes and readable object shapes',
    'no horror, gore, realistic violence, weapons, drugs, alcohol, or adult themes',
    'objects that may move later should not overlap too much with permanent background art'
  ],
  stages: [
    {
      id: 'concept',
      name: '1. Full Level Concept',
      goal: 'Generate one complete room image that establishes composition, lighting, mood, and puzzle affordances.'
    },
    {
      id: 'separation',
      name: '2. Layer And Object Separation',
      goal: 'Decide which parts stay baked into the background and which become movable/exported assets.'
    },
    {
      id: 'cutouts',
      name: '3. Cutouts And Gameplay Slots',
      goal: 'Generate or extract transparent PNGs for movable/interactive objects, then bind them to logic rules.'
    }
  ]
};

const cellRoomAssetSlots = [
  {
    id: 'asset_background_room',
    name: 'painted cell room background',
    layerId: 'background',
    kind: 'background',
    movable: false,
    needsBgRemoval: false,
    source: 'full_level_generation',
    logicRole: 'permanent room shell: stone frame, wall, floor, door, window, pipes, light cone'
  },
  {
    id: 'asset_bed',
    name: 'metal bed with blanket and pillow',
    layerId: 'player',
    kind: 'prop',
    movable: false,
    needsBgRemoval: true,
    source: 'separate_cutout_generation',
    logicRole: 'occluder and search area; can hide key under pillow or blanket'
  },
  {
    id: 'asset_pillow',
    name: 'pillow',
    layerId: 'foreground_1',
    kind: 'movable_prop',
    movable: true,
    needsBgRemoval: true,
    source: 'separate_cutout_generation',
    logicRole: 'move_to_reveal_collectible cover object'
  },
  {
    id: 'asset_small_key',
    name: 'small brass key',
    layerId: 'foreground_1',
    kind: 'collectible',
    movable: true,
    needsBgRemoval: true,
    source: 'separate_cutout_generation',
    logicRole: 'hidden collectible that unlocks the door'
  },
  {
    id: 'asset_door_lock',
    name: 'door lock plate',
    layerId: 'background_objects',
    kind: 'interactive_fixture',
    movable: false,
    needsBgRemoval: true,
    source: 'crop_or_cutout_from_level',
    logicRole: 'locked_object_requires_item target'
  },
  {
    id: 'asset_crate',
    name: 'wooden crate',
    layerId: 'foreground_1',
    kind: 'movable_prop',
    movable: true,
    needsBgRemoval: true,
    source: 'separate_cutout_generation',
    logicRole: 'can be inspected or moved; optional clue container'
  },
  {
    id: 'asset_broom',
    name: 'broom',
    layerId: 'player',
    kind: 'item_candidate',
    movable: true,
    needsBgRemoval: true,
    source: 'separate_cutout_generation',
    logicRole: 'wrong item for lock; useful for child-safe failure feedback'
  },
  {
    id: 'asset_shelf_books',
    name: 'wall shelf with books and plant',
    layerId: 'background_objects',
    kind: 'background_prop',
    movable: false,
    needsBgRemoval: false,
    source: 'baked_or_optional_cutout',
    logicRole: 'visual storytelling; optional inspect clue'
  }
];

const cellRoomLogicScript = [
  'Goal: Tom escapes the cozy puzzle cell by opening the blue door.',
  '',
  'Rules:',
  '- The blue door starts locked.',
  '- The pillow on the bed can be moved aside.',
  '- Moving the pillow reveals a small brass key.',
  '- Tom can collect the small brass key.',
  '- Using the brass key on the door lock opens the door.',
  '- Using the broom on the door lock does not work; show gentle feedback: "That will not fit the lock."',
  '- After the door opens, the door exit becomes active and leads to the next level.',
  '',
  'State:',
  '- has_small_key: false until collected.',
  '- door_unlocked: false until key is used on lock.',
  '- pillow_moved: false until reveal interaction runs.'
].join('\n');

const cellRoomTestPrompt = [
  'Create a child-safe 2D adventure game room in a cozy cartoon cell-room style.',
  '',
  'Scene requirements:',
  '- 16:9 side-view room, 1536x864 target.',
  '- Warm hand-painted cartoon style, clean silhouettes, readable object shapes.',
  '- Stone frame around the room, beige plaster walls, green lower wall paint, tiled floor.',
  '- Blue locked door on the left with visible lock plate.',
  '- Small barred window on the right with sunlight beam.',
  '- Metal bed on the right with pillow and folded blue blanket.',
  '- Wooden crate near the left floor, broom near the center, small shelf with books and plant, simple hanging lamp.',
  '- Friendly puzzle-room mood, not scary, no horror, no gore, no realistic violence.',
  '',
  'Gameplay planning:',
  '- The pillow must be separable as a movable transparent PNG cutout.',
  '- A small brass key should be hidden under or near the pillow as a collectible transparent PNG cutout.',
  '- The door lock plate should be identifiable as the locked-object target.',
  '- The broom should be a separate item/cutout but should fail when used on the lock.',
  '- Keep movable objects visually clean and not fused into the background.',
  '',
  'Return or prepare these outputs:',
  '1. Full composed level background preview.',
  '2. Clean background without movable pillow/key overlays where possible.',
  '3. Transparent PNG cutouts for pillow, small brass key, broom, crate, and door lock plate.',
  '4. Short object list with suggested layer, bounding box, and gameplay role.'
].join('\n');

const fallbackProject = {
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
  flow: { links: [] },
  assets: [],
  aiHistory: []
};

let project = null;
let selectedLevelId = null;
let generationPanelOpen = false;
let activeInspectorTab = 'plan';

const els = {
  projectSubtitle: document.getElementById('projectSubtitle'),
  projectTitleLabel: document.getElementById('projectTitleLabel'),
  gameTree: document.getElementById('gameTree'),
  inspector: document.getElementById('inspector'),
  levelSelect: document.getElementById('levelSelect'),
  levelMeta: document.getElementById('levelMeta'),
  levelStage: document.getElementById('levelStage'),
  levelEmptyState: document.getElementById('levelEmptyState'),
  addLevelButton: document.getElementById('addLevelButton'),
  exportGameButton: document.getElementById('exportGameButton'),
  generateLevelButton: document.getElementById('generateLevelButton'),
  characterImportInput: document.getElementById('characterImportInput'),
  renameDialog: document.getElementById('renameDialog'),
  renameForm: document.getElementById('renameForm'),
  renameLevelId: document.getElementById('renameLevelId'),
  renameLevelInput: document.getElementById('renameLevelInput'),
  cancelRenameButton: document.getElementById('cancelRenameButton'),
  startGameButton: document.getElementById('startGameButton')
};

function createLevel(index) {
  return {
    id: `level_${index}`,
    name: `Level ${index}`,
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
    generation: {
      step: 1,
      userRequest: '',
      summary: '',
      composition: '',
      gameplayPurpose: '',
      safetyCheck: '',
      fullLevelPrompt: '',
      pipeline: structuredClone(generationPipelineTemplate),
      assetSlots: [],
      draftPlan: null,
      approvedPlan: null,
      generatedImageRef: null,
      extractionNotes: '',
      testPrompt: ''
    },
    logicScript: [
      'Goal: Character reaches the exit after solving the level.',
      'Rules:',
      '- Character must find item_y before object_n can open.',
      '- Character can try item_j on object_k, but it should fail with a child-safe feedback line.',
      '- Successful actions should update inventory or level state explicitly.'
    ].join('\n'),
    layers: structuredClone(defaultLayers),
    objects: [],
    hotspots: [],
    mechanics: [],
    exits: [],
    engineNotes: ''
  };
}

function normalizeProject(raw) {
  const next = {
    ...structuredClone(fallbackProject),
    ...raw,
    game: { ...fallbackProject.game, ...(raw?.game ?? {}) },
    flow: { ...fallbackProject.flow, ...(raw?.flow ?? {}) }
  };

  next.characters = Array.isArray(raw?.characters) ? raw.characters : [];
  next.inventory = Array.isArray(raw?.inventory) ? raw.inventory : [];
  next.mechanicsLibrary = Array.isArray(raw?.mechanicsLibrary) ? raw.mechanicsLibrary : [];
  next.assets = Array.isArray(raw?.assets) ? raw.assets : [];
  next.aiHistory = Array.isArray(raw?.aiHistory) ? raw.aiHistory : [];
  next.levels = Array.isArray(raw?.levels) && raw.levels.length > 0 ? raw.levels : [createLevel(1)];
  next.flow.links = Array.isArray(raw?.flow?.links) ? raw.flow.links : [];

  next.levels = next.levels.map((level, index) => {
    const base = createLevel(index + 1);
    return {
      ...base,
      ...level,
      canvas: { ...base.canvas, ...(level.canvas ?? {}) },
      phaseStatus: { ...base.phaseStatus, ...(level.phaseStatus ?? {}) },
      prompts: { ...base.prompts, ...(level.prompts ?? {}) },
      generation: {
        ...base.generation,
        ...(level.generation ?? {}),
        pipeline: level.generation?.pipeline ?? structuredClone(generationPipelineTemplate),
        assetSlots: Array.isArray(level.generation?.assetSlots) ? level.generation.assetSlots : [],
        testPrompt: level.generation?.testPrompt ?? ''
      },
      logicScript: level.logicScript ?? base.logicScript,
      layers: Array.isArray(level.layers) && level.layers.length > 0 ? level.layers : structuredClone(defaultLayers),
      objects: Array.isArray(level.objects) ? level.objects : [],
      hotspots: Array.isArray(level.hotspots) ? level.hotspots : [],
      mechanics: Array.isArray(level.mechanics) ? level.mechanics : [],
      exits: Array.isArray(level.exits) ? level.exits : []
    };
  });

  if (!next.levels.some((level) => level.id === next.game.startLevelId)) {
    next.game.startLevelId = next.levels[0].id;
  }

  return next;
}

async function loadInitialProject() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      project = normalizeProject(JSON.parse(stored));
      selectedLevelId = project.game.startLevelId;
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  try {
    const response = await fetch('sample-project.json', { cache: 'no-store' });
    project = normalizeProject(await response.json());
  } catch {
    project = normalizeProject(fallbackProject);
  }
  selectedLevelId = project.game.startLevelId;
}

function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

function getSelectedLevel() {
  return project.levels.find((level) => level.id === selectedLevelId) ?? project.levels[0];
}

function renderTreeSection(title, items, renderItem, action) {
  const section = document.createElement('section');
  section.className = 'tree-section';

  const header = document.createElement('div');
  header.className = 'tree-section-title';
  header.innerHTML = `<span>${title}</span>`;
  if (action) header.append(action);
  section.append(header);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tree-empty';
    empty.textContent = 'No items yet';
    section.append(empty);
    return section;
  }

  items.forEach((item) => section.append(renderItem(item)));
  return section;
}

function createTreeButton(label, meta, selected, onClick, onDblClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tree-item${selected ? ' is-selected' : ''}`;
  button.addEventListener('click', onClick);
  if (onDblClick) button.addEventListener('dblclick', onDblClick);

  const text = document.createElement('span');
  text.textContent = label;
  button.append(text);

  if (meta) {
    const small = document.createElement('small');
    small.textContent = meta;
    button.append(small);
  }

  return button;
}

function renderGameTree() {
  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.className = 'mini-action';
  importButton.textContent = 'Import Character';
  importButton.addEventListener('click', () => els.characterImportInput.click());

  const levelsControl = document.createElement('div');
  levelsControl.className = 'level-dropdown-card';
  levelsControl.innerHTML = `
    <label for="sidebarLevelSelect">Level</label>
    <select id="sidebarLevelSelect"></select>
    <button type="button" id="renameLevelButton">Rename</button>
  `;

  const levelsSection = document.createElement('section');
  levelsSection.className = 'tree-section';
  const levelsHeader = document.createElement('div');
  levelsHeader.className = 'tree-section-title';
  levelsHeader.innerHTML = '<span>Levels</span>';
  levelsSection.append(levelsHeader, levelsControl);

  els.gameTree.replaceChildren(
    renderTreeSection('Characters', project.characters, (character) =>
      createTreeButton(character.name ?? character.id, stateSummary(character), false, () => {})
    , importButton),
    renderTreeSection('Inventory', project.inventory, (item) =>
      createTreeButton(item.name ?? item.id, 'Item', false, () => {})
    ),
    renderTreeSection('Mechanics Library', project.mechanicsLibrary, (mechanic) =>
      createTreeButton(mechanic.name ?? mechanic.type, 'Template', false, () => {})
    ),
    levelsSection
  );
  populateLevelSelect(document.getElementById('sidebarLevelSelect'));
  document.getElementById('sidebarLevelSelect').addEventListener('change', (event) => {
    selectedLevelId = event.target.value;
    saveProject();
    render();
  });
  document.getElementById('renameLevelButton').addEventListener('click', renameSelectedLevel);

  els.gameTree.append(
    renderTreeSection('Game Flow', project.flow.links, (link) =>
      createTreeButton(link.name ?? 'Level link', `${link.fromLevelId} -> ${link.toLevelId}`, false, () => {})
    )
  );
}

function renderInspector() {
  const level = getSelectedLevel();
  const hasDraft = Boolean(level.generation.draftPlan);
  const hasApproved = Boolean(level.generation.approvedPlan);
  els.inspector.innerHTML = `
    <section class="create-level-card">
      <div class="card-title-row">
        <div>
          <h2>Create Level</h2>
          <p>Say what you want. The studio adds the production context.</p>
        </div>
        <button type="button" class="help-icon" title="Write a short natural request. The app will build the internal prompt, image plan, layer plan, and cutout plan automatically.">?</button>
      </div>
      <label class="prompt-box-label" for="generationUserRequestInput">Level idea</label>
      <textarea id="generationUserRequestInput" class="short-request-input" placeholder="generate me a level that is a prison cell">${escapeHtml(level.generation.userRequest)}</textarea>
      <div class="primary-action-row">
        <button type="button" id="generateFromRequestButton" class="primary-action">Generate draft</button>
        <button type="button" id="approveGeneratedPlanButton" ${hasDraft ? '' : 'disabled'}>Approve & build</button>
      </div>
    </section>

    <div class="workflow-rail" aria-label="Generation progress">
      <div class="workflow-step ${hasDraft ? 'is-done' : 'is-current'}">
        <span>1</span>
        <strong>Draft</strong>
        <small>image + plan</small>
      </div>
      <div class="workflow-step ${hasDraft && !hasApproved ? 'is-current' : hasApproved ? 'is-done' : ''}">
        <span>2</span>
        <strong>Review</strong>
        <small>approve data</small>
      </div>
      <div class="workflow-step ${hasApproved ? 'is-current is-done' : ''}">
        <span>3</span>
        <strong>Edit</strong>
        <small>tree + logic</small>
      </div>
    </div>

    <nav class="inspector-tabs" aria-label="Right panel tabs">
      <button type="button" data-tab="plan" class="${activeInspectorTab === 'plan' ? 'is-active' : ''}">Plan</button>
      <button type="button" data-tab="tree" class="${activeInspectorTab === 'tree' ? 'is-active' : ''}">Tree</button>
      <button type="button" data-tab="logic" class="${activeInspectorTab === 'logic' ? 'is-active' : ''}">Logic</button>
    </nav>

    <div class="tab-panels">
      <section class="tab-panel ${activeInspectorTab === 'plan' ? 'is-active' : ''}" id="tabPlan">
        <div class="panel-heading-row">
          <h3>Draft Plan</h3>
          <button type="button" class="help-icon" title="This is the planned data returned together with the image. After approval, it becomes the editable level tree.">?</button>
        </div>
        <div id="draftPlanPreview" class="draft-plan-preview"></div>
        <div class="panel-heading-row">
          <h3>Assets To Produce</h3>
          <button type="button" class="help-icon" title="Movable objects and collectibles should become transparent PNGs. Permanent room shell stays baked into the background plate.">?</button>
        </div>
        <div id="assetSlotList" class="asset-slot-list"></div>
        <details class="internal-brief-details">
          <summary>Internal model brief</summary>
          <textarea id="testPromptInput" class="prompt-editor" placeholder="Internal prompt shown for debugging">${escapeHtml(level.generation.testPrompt)}</textarea>
        </details>
      </section>

      <section class="tab-panel ${activeInspectorTab === 'tree' ? 'is-active' : ''}" id="tabTree">
        <div class="panel-heading-row">
          <h3>Level Tree</h3>
          <button type="button" class="help-icon" title="Right-click an object later to send a focused edit request with only that object, its layer, and relevant logic.">?</button>
        </div>
        <div id="levelTree" class="level-tree-panel"></div>
      </section>

      <section class="tab-panel ${activeInspectorTab === 'logic' ? 'is-active' : ''}" id="tabLogic">
        <div class="panel-heading-row">
          <h3>Level Logic</h3>
          <button type="button" class="help-icon" title="Readable puzzle pseudocode. This describes what must happen, before it becomes mechanics bindings.">?</button>
        </div>
        <textarea id="logicScriptInput" class="logic-editor">${escapeHtml(level.logicScript)}</textarea>
        <details class="project-summary-details">
          <summary>Project data</summary>
          <div class="project-summary-body">
        <div class="hidden-field-store">
          <textarea id="generationSummaryInput">${escapeHtml(level.generation.summary)}</textarea>
          <textarea id="generationCompositionInput">${escapeHtml(level.generation.composition)}</textarea>
          <textarea id="generationPromptInput">${escapeHtml(level.generation.fullLevelPrompt)}</textarea>
        </div>
        <div class="field">
          <label for="gameTitleInput">Game title</label>
          <input id="gameTitleInput" value="${escapeHtml(project.game.title)}">
        </div>
        <div class="field">
          <label for="gameNotesInput">Game notes</label>
          <textarea id="gameNotesInput">${escapeHtml(project.game.notes)}</textarea>
        </div>
        <button type="button" id="openAssetsDirectoryButton">Open Assets Directory</button>
        <div class="summary-list">
          <div class="summary-row"><strong>Project id</strong><span>${escapeHtml(project.game.id)}</span></div>
          <div class="summary-row"><strong>Selected level id</strong><span>${escapeHtml(level.id)}</span></div>
          <div class="summary-row"><strong>Levels</strong><span>${project.levels.length}</span></div>
          <div class="summary-row"><strong>Characters</strong><span>${project.characters.length}</span></div>
          <div class="summary-row"><strong>Inventory</strong><span>${project.inventory.length}</span></div>
          <div class="summary-row"><strong>Assets</strong><span>${project.assets.length}</span></div>
          <div class="summary-row"><strong>Flow links</strong><span>${project.flow.links.length}</span></div>
          <div class="summary-row"><strong>Schema</strong><span>${project.schemaVersion}</span></div>
        </div>
          </div>
        </details>
      </section>
    </div>
  `;

  renderLevelTree(level);
  renderAssetSlots(level);
  renderDraftPlan(level);
  bindInspectorControls(level);
}

function renderDraftPlan(level) {
  const root = document.getElementById('draftPlanPreview');
  const plan = level.generation.draftPlan;
  if (!plan) {
    root.innerHTML = `
      <div class="empty-workflow">
        <strong>No draft yet</strong>
        <p>Type a short level idea above, then click Generate draft. The app will build the hidden production brief.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="draft-plan-card">
      <div class="draft-title-row">
        <strong>${escapeHtml(plan.title)}</strong>
        <span>${level.generation.approvedPlan ? 'approved' : 'draft'}</span>
      </div>
      <p>${escapeHtml(plan.intent)}</p>
      <div class="summary-list">
        <div class="summary-row"><strong>Background</strong><span>${plan.backgroundItems.length}</span></div>
        <div class="summary-row"><strong>Movable</strong><span>${plan.movableItems.length}</span></div>
        <div class="summary-row"><strong>Logic rules</strong><span>${plan.logicRules.length}</span></div>
      </div>
      <ul class="compact-list rule-list">
        ${plan.logicRules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderAssetSlots(level) {
  const list = document.getElementById('assetSlotList');
  const slots = level.generation.assetSlots ?? [];
  if (slots.length === 0) {
    list.innerHTML = '<div class="layer-empty">No asset slots yet. Generate a draft first.</div>';
    return;
  }

  list.replaceChildren(...slots.map((slot) => {
    const row = document.createElement('div');
    row.className = 'asset-slot-row';
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(slot.name)}</strong>
        <p>${escapeHtml(formatLayerName(slot.layerId))} | ${escapeHtml(slot.logicRole)}</p>
      </div>
      <span>${slot.needsBgRemoval ? 'BG remove' : 'baked'}</span>
    `;
    return row;
  }));
}

function renderLevelTree(level) {
  const root = document.getElementById('levelTree');
  const orderedLayers = [...level.layers].sort((a, b) => a.order - b.order);
  root.replaceChildren(...orderedLayers.map((layer) => {
    const layerNode = document.createElement('div');
    layerNode.className = 'layer-node';
    const objects = level.objects.filter((object) => object.layerId === layer.id);
    const plannedSlots = level.generation.approvedPlan
      ? []
      : (level.generation.assetSlots ?? []).filter((slot) => slot.layerId === layer.id);
    const characters = project.characters.filter((character) => character.levelId === level.id && character.layerId === layer.id);
    const childCount = objects.length + plannedSlots.length + characters.length;
    layerNode.innerHTML = `
      <div class="layer-row">
        <span class="layer-name">${escapeHtml(layer.name)}</span>
        <span class="layer-count">${childCount}</span>
      </div>
    `;

    const children = document.createElement('div');
    children.className = 'layer-children';
    [
      ...objects.map((item) => ({ ...item, nodeType: 'object' })),
      ...plannedSlots.map((item) => ({ ...item, nodeType: item.movable ? 'planned movable' : 'planned asset' })),
      ...characters.map((item) => ({ ...item, nodeType: 'character' }))
    ]
      .forEach((item) => {
        const child = document.createElement('button');
        child.type = 'button';
        child.className = 'asset-node';
        child.textContent = `${item.nodeType}: ${item.name ?? item.id}`;
        child.title = 'Future: right-click to create a focused Codex edit request for only this node and its direct context.';
        child.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          showStatus(`Future Codex edit: ${item.name ?? item.id}. Context will be scoped to this node, its layer, level id, and relevant mechanics only.`);
        });
        children.append(child);
      });

    if (children.childElementCount === 0) {
      const empty = document.createElement('div');
      empty.className = 'layer-empty';
      empty.textContent = 'No assets on this layer yet';
      children.append(empty);
    }
    layerNode.append(children);
    return layerNode;
  }));
}

function bindInspectorControls(level) {
  document.querySelectorAll('.inspector-tabs button').forEach((button) => {
    button.addEventListener('click', () => {
      activeInspectorTab = button.dataset.tab;
      renderInspector();
    });
  });

  document.querySelectorAll('.section-disclosure').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.toggle).classList.toggle('collapsed'));
  });

  document.getElementById('generateFromRequestButton').addEventListener('click', generateDraftFromRequest);
  document.getElementById('approveGeneratedPlanButton').addEventListener('click', approveGeneratedPlan);
  document.getElementById('generationUserRequestInput').addEventListener('input', (event) => {
    level.generation.userRequest = event.target.value;
    saveProject();
  });
  document.getElementById('generationSummaryInput').addEventListener('input', (event) => {
    level.generation.summary = event.target.value;
    saveProject();
  });
  document.getElementById('generationCompositionInput').addEventListener('input', (event) => {
    level.generation.composition = event.target.value;
    saveProject();
  });
  document.getElementById('generationPromptInput').addEventListener('input', (event) => {
    level.generation.fullLevelPrompt = event.target.value;
    saveProject();
  });
  document.getElementById('testPromptInput').addEventListener('input', (event) => {
    level.generation.testPrompt = event.target.value;
    saveProject();
  });
  document.getElementById('logicScriptInput').addEventListener('input', (event) => {
    level.logicScript = event.target.value;
    saveProject();
  });

  document.getElementById('gameTitleInput').addEventListener('input', (event) => {
    project.game.title = event.target.value;
    saveProject();
    renderHeader();
  });

  document.getElementById('gameNotesInput').addEventListener('input', (event) => {
    project.game.notes = event.target.value;
    saveProject();
  });

  document.getElementById('openAssetsDirectoryButton').addEventListener('click', () => {
    showStatus('Browser security blocks opening local directories directly. Use C:\\Dev\\2DLevelCreationStudio\\wwwroot\\assets for now.');
  });
}

function populateLevelSelect(select) {
  select.replaceChildren(...project.levels.map((level) => {
    const option = document.createElement('option');
    option.value = level.id;
    option.textContent = level.name;
    option.selected = level.id === selectedLevelId;
    return option;
  }));
}

function renderHeader() {
  const level = getSelectedLevel();
  els.projectSubtitle.textContent = project.game.title;
  els.projectTitleLabel.textContent = project.game.id;
  populateLevelSelect(els.levelSelect);
  els.levelMeta.textContent = `${level.id} | ${level.canvas.width} x ${level.canvas.height} canvas`;
}

function renderLevelStage() {
  const level = getSelectedLevel();
  const imageRef = level.generation.generatedImageRef;
  const imageSrc = imageRef?.previewUrl
    ? `${imageRef.previewUrl}?draft=${encodeURIComponent(imageRef.revision ?? 'current')}`
    : 'assets/placeholder-level.svg';
  const imageLabel = imageRef
    ? imageRef.status === 'approved'
      ? 'Approved generated level image'
      : 'Draft generated level image'
    : 'Level placeholder';

  const revisionLabel = imageRef?.revision ? `rev ${String(imageRef.revision).slice(-6)}` : '';

  els.levelStage.innerHTML = `
    <img class="level-placeholder ${imageRef ? 'is-generated' : ''}" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageLabel)}">
    <div class="level-empty-state">${escapeHtml(imageRef ? imageLabel : 'Ready for objects, layers, and mechanics')}</div>
    ${revisionLabel ? `<div class="level-revision-badge">${escapeHtml(revisionLabel)}</div>` : ''}
  `;
}

function render() {
  renderHeader();
  renderLevelStage();
  renderGameTree();
  renderInspector();
}

function addLevel() {
  const nextIndex = getNextLevelIndex();
  const level = createLevel(nextIndex);
  project.levels.push(level);
  selectedLevelId = level.id;
  saveProject();
  render();
}

function getNextLevelIndex() {
  const used = project.levels
    .map((level) => Number.parseInt(String(level.id).replace('level_', ''), 10))
    .filter(Number.isFinite);
  return used.length === 0 ? 1 : Math.max(...used) + 1;
}

function renameSelectedLevel() {
  const level = getSelectedLevel();
  els.renameLevelId.textContent = level.id;
  els.renameLevelInput.value = level.name;
  els.renameDialog.hidden = false;
  els.renameLevelInput.focus();
  els.renameLevelInput.select();
}

function exportGame() {
  showStatus('ExportGame UI is ready. Later this will export either a local HTML playable build or a local EXE wrapper.');
}

function openGenerateLevel() {
  const level = getSelectedLevel();
  if (generationPanelOpen && level.generation.userRequest.trim()) {
    generateDraftFromRequest();
    return;
  }

  generationPanelOpen = true;
  activeInspectorTab = 'plan';
  render();
  focusGenerationInput();
  showStatus(`Type a short level request, then Generate Draft`);
}

function focusGenerationInput() {
  requestAnimationFrame(() => {
    const inspector = document.querySelector('.inspector');
    const section = document.getElementById('levelGeneration');
    const input = document.getElementById('generationUserRequestInput');
    if (inspector) inspector.scrollTop = 0;
    if (section) section.scrollTop = 0;
    if (input) input.focus();
  });
}

function generateDraftFromRequest() {
  const level = getSelectedLevel();
  const request = (level.generation.userRequest || 'generate me a level that is a prison cell').trim();
  const isPrisonCell = /prison|cell|jail|locked/i.test(request);
  const plan = isPrisonCell ? buildPrisonCellPlan(request) : buildGenericRoomPlan(request);
  const revision = Date.now();

  level.generation.approvedPlan = null;
  level.generation.draftPlan = plan;
  level.generation.summary = plan.intent;
  level.generation.composition = plan.layerPlanText;
  level.generation.gameplayPurpose = plan.gameplayPurpose;
  level.generation.safetyCheck = plan.safetyCheck;
  level.generation.fullLevelPrompt = plan.internalBrief;
  level.generation.testPrompt = plan.internalBrief;
  level.generation.assetSlots = plan.assetSlots;
  level.logicScript = plan.logicScript;
  level.objects = [];
  level.generation.generatedImageRef = {
    status: 'draft_planned',
    previewUrl: isPrisonCell ? 'assets/cell-room-reference.jpg' : 'assets/placeholder-level.svg',
    revision,
    note: 'Draft preview. The current saved draft replaces the previous draft; future bridge output should write one current image reference here.'
  };
  saveProject();
  generationPanelOpen = true;
  activeInspectorTab = 'plan';
  render();
  showStatus('Draft image plan generated from short request');
}

function approveGeneratedPlan() {
  const level = getSelectedLevel();
  if (!level.generation.draftPlan) {
    showStatus('Generate a draft first');
    return;
  }

  level.generation.approvedPlan = structuredClone(level.generation.draftPlan);
  if (level.generation.generatedImageRef) {
    level.generation.generatedImageRef.status = 'approved';
  }
  level.generation.assetSlots = structuredClone(level.generation.draftPlan.assetSlots);
  level.objects = level.generation.assetSlots.map((slot, index) => ({
    id: slot.objectId,
    name: slot.name,
    layerId: slot.layerId,
    position: slot.position,
    size: slot.size,
    interactive: slot.interactive,
    exportSeparately: slot.needsBgRemoval,
    movable: slot.movable,
    occludesPlayer: slot.occludesPlayer ?? 'none',
    assetRef: slot.id,
    notes: slot.logicRole
  }));
  saveProject();
  activeInspectorTab = 'tree';
  render();
  showStatus('Approved plan applied to level tree');
}

function formatLayerName(layerId) {
  const layer = defaultLayers.find((item) => item.id === layerId);
  return layer?.name ?? layerId;
}

function buildPrisonCellPlan(request) {
  const assetSlots = cellRoomAssetSlots.map((slot, index) => ({
    ...structuredClone(slot),
    objectId: slot.id.replace('asset_', 'obj_'),
    interactive: slot.kind !== 'background',
    position: suggestedPositionForSlot(slot.id, index),
    size: suggestedSizeForSlot(slot.id),
    occludesPlayer: slot.layerId.startsWith('foreground') ? 'body' : 'none'
  }));

  const internalBrief = buildInternalBrief({
    request,
    title: 'Cozy Puzzle Prison Cell',
    style: 'warm hand-painted child-safe 2D adventure game room',
    mustPlan: assetSlots
  });

  return {
    title: 'Cozy Puzzle Prison Cell',
    intent: 'A friendly prison-cell puzzle room where Tom finds a hidden key and opens the locked door.',
    gameplayPurpose: 'Move a cover object, collect a key, try one wrong item, unlock the door, then exit.',
    safetyCheck: 'Friendly puzzle-room mood only. No horror, gore, realistic violence, weapons, drugs, alcohol, or adult themes.',
    backgroundItems: ['stone frame', 'plaster wall', 'green lower wall', 'tiled floor', 'blue locked door', 'barred window', 'lamp light cone'],
    movableItems: assetSlots.filter((slot) => slot.movable).map((slot) => slot.name),
    logicRules: [
      'pillow_moved reveals small brass key',
      'small brass key can be collected',
      'small brass key unlocks blue door',
      'broom on lock fails with gentle feedback'
    ],
    layerPlanText: [
      'Background: room shell, stone frame, wall, floor, door, window, pipes, lighting.',
      'Background Objects: shelves, books, wall drawings, door lock plate.',
      'Player Space: bed and broom approach zones.',
      'Foreground 1: pillow, key, crate, bucket, rug, table props.',
      'Foreground 2: optional front frame/occluders.'
    ].join('\n'),
    internalBrief,
    assetSlots,
    logicScript: cellRoomLogicScript
  };
}

function buildGenericRoomPlan(request) {
  const safeName = request.replace(/^generate me a level that is\s+/i, '').trim() || 'adventure room';
  const assetSlots = [
    {
      id: 'asset_background_room',
      objectId: 'obj_background_room',
      name: `${safeName} background`,
      layerId: 'background',
      kind: 'background',
      movable: false,
      interactive: false,
      needsBgRemoval: false,
      source: 'full_level_generation',
      logicRole: 'permanent room plate',
      position: { x: 768, y: 432 },
      size: { width: 1536, height: 864 }
    },
    {
      id: 'asset_primary_interactive_prop',
      objectId: 'obj_primary_interactive_prop',
      name: 'primary interactive prop',
      layerId: 'foreground_1',
      kind: 'movable_prop',
      movable: true,
      interactive: true,
      needsBgRemoval: true,
      source: 'separate_cutout_generation',
      logicRole: 'first puzzle interaction',
      position: { x: 660, y: 610 },
      size: { width: 180, height: 120 }
    }
  ];

  const internalBrief = buildInternalBrief({
    request,
    title: safeName,
    style: 'child-safe 2D adventure game level',
    mustPlan: assetSlots
  });

  return {
    title: safeName,
    intent: `A child-safe adventure level based on: ${request}`,
    gameplayPurpose: 'Create a readable room with at least one interaction, one collectible or clue, and one exit.',
    safetyCheck: 'No horror, gore, realistic violence, weapons, drugs, alcohol, or adult themes.',
    backgroundItems: ['room shell', 'walkable floor', 'exit area'],
    movableItems: ['primary interactive prop'],
    logicRules: ['interactive prop changes level state', 'success enables exit'],
    layerPlanText: 'Background: permanent room plate.\nForeground 1: movable interactive props.\nPlayer Space: walkable area and character approach zones.',
    internalBrief,
    assetSlots,
    logicScript: 'Goal: Solve the room puzzle and reach the exit.\nRules:\n- Interact with the primary prop.\n- Collect or reveal the needed clue.\n- Use the clue to activate the exit.'
  };
}

function buildInternalBrief({ request, title, style, mustPlan }) {
  return [
    `User request: "${request}"`,
    '',
    `Generate: ${title}`,
    `Style: ${style}.`,
    '',
    'Built-in app context:',
    '- This is a 2D kids adventure level authoring tool.',
    '- Generate the image and the structured level plan at the same time.',
    '- Do not require a later image-analysis pass to discover objects.',
    '- Keep all movable/interactive elements visually separable from the background.',
    '- Target canvas: 1536x864, 16:9 side-view room.',
    '- Output must be child-safe and readable for point-and-click gameplay.',
    '',
    'Return together with the generated image:',
    '- background plate description',
    '- layer assignment for each object',
    '- planned asset slots',
    '- movable/cutout flag',
    '- bg-removal needed flag',
    '- rough bounding boxes in 1536x864 coordinates',
    '- gameplay role and logic binding',
    '',
    'Planned asset slots:',
    ...mustPlan.map((slot) => `- ${slot.name}: layer=${slot.layerId}, movable=${slot.movable}, bgRemoval=${slot.needsBgRemoval}, role=${slot.logicRole}`)
  ].join('\n');
}

function suggestedPositionForSlot(id, index) {
  const positions = {
    asset_background_room: { x: 768, y: 432 },
    asset_bed: { x: 1040, y: 640 },
    asset_pillow: { x: 1180, y: 590 },
    asset_small_key: { x: 1160, y: 630 },
    asset_door_lock: { x: 210, y: 520 },
    asset_crate: { x: 330, y: 720 },
    asset_broom: { x: 620, y: 620 },
    asset_shelf_books: { x: 860, y: 315 }
  };
  return positions[id] ?? { x: 240 + index * 120, y: 600 };
}

function suggestedSizeForSlot(id) {
  const sizes = {
    asset_background_room: { width: 1536, height: 864 },
    asset_bed: { width: 520, height: 230 },
    asset_pillow: { width: 170, height: 70 },
    asset_small_key: { width: 46, height: 22 },
    asset_door_lock: { width: 72, height: 130 },
    asset_crate: { width: 210, height: 150 },
    asset_broom: { width: 80, height: 270 },
    asset_shelf_books: { width: 430, height: 130 }
  };
  return sizes[id] ?? { width: 160, height: 100 };
}

function seedCellRoomWorkflow() {
  const level = getSelectedLevel();
  level.generation.summary = 'Cozy child-safe puzzle cell room: Tom must find a hidden key under the pillow and use it on the blue door lock.';
  level.generation.composition = [
    'Background: stone room frame, plaster wall, green lower wall, tiled floor, door/window/pipes/light cone baked into room plate.',
    'Background Objects: shelves, books, wall drawings, door lock plate if kept as fixture.',
    'Player Space: bed, broom, walkable floor objects that Tom can approach.',
    'Foreground 1: pillow, key, crate, bucket, rug, table props that may occlude or be clicked.',
    'Foreground 2: optional front stone frame or objects that should draw over Tom.'
  ].join('\n');
  level.generation.gameplayPurpose = 'Teach simple adventure logic: move cover object, collect key, try wrong item, unlock door, exit.';
  level.generation.safetyCheck = 'Friendly puzzle-room mood only. No horror, gore, realistic violence, weapons, drugs, alcohol, or adult themes.';
  level.generation.fullLevelPrompt = cellRoomTestPrompt;
  level.generation.testPrompt = cellRoomTestPrompt;
  level.generation.assetSlots = structuredClone(cellRoomAssetSlots);
  level.generation.extractionNotes = 'Generate the full room first. Then request clean transparent cutouts for movable props instead of trying to crop messy overlapping pixels from the final image unless the source is very clean.';
  level.logicScript = cellRoomLogicScript;
  saveProject();
  generationPanelOpen = true;
  render();
  showStatus('Cell room generation workflow seeded');
}

async function copyTestPrompt() {
  const level = getSelectedLevel();
  const promptText = level.generation.testPrompt || level.generation.fullLevelPrompt || cellRoomTestPrompt;
  try {
    await navigator.clipboard.writeText(promptText);
    project.aiHistory.push({
      id: `ai_${Date.now()}`,
      type: 'generation_test_prompt',
      levelId: level.id,
      createdAt: new Date().toISOString(),
      prompt: promptText
    });
    saveProject();
    showStatus('Test prompt copied');
  } catch {
    showStatus('Clipboard blocked. Select the Test Prompt text manually.');
  }
}

async function importCharacter(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    const normalized = normalizeCharacter(imported);
    project.characters.push(normalized);
    saveProject();
    render();
    showStatus(`Imported character: ${normalized.name}`);
  } catch (error) {
    alert(`Character import failed: ${error.message}`);
  } finally {
    els.characterImportInput.value = '';
  }
}

function normalizeCharacter(imported) {
  const source = imported.character ?? imported;
  const states = Array.isArray(source.states) ? source.states : Array.isArray(source.modes) ? source.modes : [];
  const stateIds = states.map((state) => state.id ?? state.name);
  const missing = ['idle_side', 'walk_side'].filter((required) => !stateIds.includes(required));
  if (missing.length > 0) {
    throw new Error(`RigStudio export is missing required states: ${missing.join(', ')}`);
  }

  return {
    id: source.id ?? `character_${Date.now()}`,
    name: source.name ?? 'Imported Character',
    source: 'RigStudio',
    baseline: source.baseline ?? { x: 0.5, y: 0.92 },
    defaultScale: Number(source.defaultScale ?? source.scale ?? 1),
    states: states.map((state) => ({
      id: state.id ?? state.name,
      label: state.label ?? state.name ?? state.id,
      kind: state.kind ?? 'custom',
      direction: state.direction ?? 'side',
      asset: state.asset ?? state.filename ?? null
    })),
    assetFilenames: source.assetFilenames ?? states.map((state) => state.asset ?? state.filename).filter(Boolean),
    notes: source.notes ?? ''
  };
}

function startGame() {
  selectedLevelId = project.game.startLevelId;
  saveProject();
  render();
}

function stateSummary(character) {
  const count = Array.isArray(character.states) ? character.states.length : 0;
  return `${count} states`;
}

function showStatus(message) {
  const pill = document.getElementById('statusPill');
  pill.textContent = message;
  pill.classList.add('is-message');
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => {
    pill.textContent = 'Authoring';
    pill.classList.remove('is-message');
  }, 4200);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

els.addLevelButton.addEventListener('click', addLevel);
els.exportGameButton.addEventListener('click', exportGame);
els.generateLevelButton.addEventListener('click', openGenerateLevel);
els.characterImportInput.addEventListener('change', (event) => importCharacter(event.target.files[0]));
els.startGameButton.addEventListener('click', startGame);
els.cancelRenameButton.addEventListener('click', closeRenameDialog);
els.renameDialog.addEventListener('click', (event) => {
  if (event.target === els.renameDialog) closeRenameDialog();
});
els.renameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const level = getSelectedLevel();
  const nextName = els.renameLevelInput.value.trim();
  if (nextName) {
    level.name = nextName;
    saveProject();
    closeRenameDialog();
    render();
  }
});
els.levelSelect.addEventListener('change', (event) => {
  selectedLevelId = event.target.value;
  saveProject();
  render();
});
els.levelSelect.addEventListener('dblclick', renameSelectedLevel);

window.rigStudioCharacterSchema = rigStudioCharacterSchema;
loadInitialProject().then(render);

function closeRenameDialog() {
  els.renameDialog.hidden = true;
}
