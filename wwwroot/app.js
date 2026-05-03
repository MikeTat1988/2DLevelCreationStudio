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
let selectedObjectId = null;
let activeStageDrag = false;
let generationPanelOpen = false;
let activeInspectorTab = 'brief';
let isGenerating = false;

const els = {
  projectSubtitle: document.getElementById('projectSubtitle'),
  projectTitleLabel: document.getElementById('projectTitleLabel'),
  gameTree: document.getElementById('gameTree'),
  inspector: document.getElementById('inspector'),
  levelSelect: document.getElementById('levelSelect'),
  levelMeta: document.getElementById('levelMeta'),
  statusPill: document.getElementById('statusPill'),
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
  requestDialog: document.getElementById('requestDialog'),
  requestDialogPath: document.getElementById('requestDialogPath'),
  requestPlanPath: document.getElementById('requestPlanPath'),
  requestMarkdownView: document.getElementById('requestMarkdownView'),
  closeRequestButton: document.getElementById('closeRequestButton'),
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
      testPrompt: '',
      planNotes: ''
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
    const generation = {
      ...base.generation,
      ...(level.generation ?? {}),
      pipeline: level.generation?.pipeline ?? structuredClone(generationPipelineTemplate),
      assetSlots: Array.isArray(level.generation?.assetSlots) ? level.generation.assetSlots : [],
      testPrompt: level.generation?.testPrompt ?? '',
      planNotes: level.generation?.planNotes ?? ''
    };

    if (generation.generatedImageRef?.previewUrl?.includes('cell-room-reference')) {
      generation.generatedImageRef = null;
    }

    if (generation.generatedImageRef?.previewUrl?.includes('generated-prison-cell-draft')) {
      generation.generatedImageRef = null;
    }

    if (generation.generatedImageRef?.status === 'handoff_ready' && !generation.generatedImageRef.sourceRequest) {
      generation.generatedImageRef = null;
      generation.draftPlan = null;
      generation.approvedPlan = null;
      generation.assetSlots = [];
    }

    return {
      ...base,
      ...level,
      canvas: { ...base.canvas, ...(level.canvas ?? {}) },
      phaseStatus: { ...base.phaseStatus, ...(level.phaseStatus ?? {}) },
      prompts: { ...base.prompts, ...(level.prompts ?? {}) },
      generation,
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

function normalizeRequest(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function buildDisplayTitleFromRequest(request) {
  const cleaned = normalizeRequest(request)
    .replace(/^generate\s+(me\s+)?(a\s+)?level\s+(that\s+is\s+)?/i, '')
    .replace(/^about\s+/i, '')
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();
  if (!cleaned) return 'Level Brief';

  return `${cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')} Brief`;
}

function buildBackgroundOnlyPlan(request) {
  const level = getSelectedLevel();
  const levelId = level.id;
  const levelAssetsPath = `C:\\Dev\\2DLevelCreationStudio\\wwwroot\\assets\\generated\\${levelId}`;
  const safeName = normalizeRequest(request) || 'adventure room';
  const title = `${buildDisplayTitleFromRequest(safeName).replace(/\s*Brief$/, '')} Empty Background`;
  const baseAssetName = safeName
    .replace(/^inside\s+of\s+/i, '')
    .replace(/^a\s+/i, '')
    .trim() || 'level';
  const assetSlots = [
    {
      id: 'asset_background_clean',
      objectId: 'obj_background_clean',
      name: `${baseAssetName} empty background and floor`,
      layerId: 'background',
      kind: 'clean_background_plate',
      movable: false,
      interactive: false,
      needsBgRemoval: false,
      source: 'generated_clean_background',
      logicRole: 'empty permanent room shell, walls, floor, fixed lighting, no movable props',
      position: { x: 768, y: 432 },
      size: { width: 1536, height: 864 },
      imagePath: `${levelAssetsPath}\\current.png`,
      promptPath: `C:\\Dev\\2DLevelCreationStudio\\handoff\\requests\\${levelId}\\elements\\background-clean.md`
    },
    {
      id: 'asset_floor_walk_zone',
      objectId: 'obj_floor_walk_zone',
      name: 'open walkable floor zone',
      layerId: 'player',
      kind: 'walkable_area',
      movable: false,
      interactive: false,
      needsBgRemoval: false,
      source: 'geometry_from_background',
      logicRole: 'open navigation area for player and future object placement',
      position: { x: 768, y: 704 },
      size: { width: 1504, height: 250 },
      imagePath: '',
      promptPath: `C:\\Dev\\2DLevelCreationStudio\\handoff\\requests\\${levelId}\\elements\\floor-zone.md`
    }
  ];
  const internalBrief = buildInternalBrief({
    request,
    title,
    style: 'clean empty hand-painted child-safe 2D adventure game background plate',
    mustPlan: assetSlots,
    phase: 'background'
  });

  return {
    title,
    phase: 'background',
    intent: `A clean EMPTY 2D level background plate for: ${safeName}. No gameplay props are included in this first pass; objects are generated later as separate transparent PNGs.`,
    gameplayPurpose: 'Create only the playable room shell and floor so future objects can be placed on top.',
    safetyCheck: 'No horror, gore, realistic violence, weapons, drugs, alcohol, adult themes, or threatening imagery.',
    backgroundItems: ['room shell', 'open floor', 'fixed architecture', 'fixed lighting'],
    movableItems: [],
    logicRules: [
      'background pass contains no movable or collectible props',
      'future gameplay objects must be generated separately as transparent PNGs',
      'future objects are positioned on top of this background by coordinates'
    ],
    layerPlanText: 'Background: clean empty room shell and open floor only.\nPlayer Space: walkable floor zone.\nForeground layers: empty until the element pass.',
    internalBrief,
    assetSlots,
    logicScript: 'Goal: Background pass only.\nRules:\n- Do not include movable gameplay props in the background.\n- Add interactive objects later as separate transparent PNG elements.'
  };
}

function clearGeneratedBriefState(level) {
  level.generation.approvedPlan = null;
  level.generation.draftPlan = null;
  level.generation.summary = '';
  level.generation.composition = '';
  level.generation.gameplayPurpose = '';
  level.generation.safetyCheck = '';
  level.generation.fullLevelPrompt = '';
  level.generation.testPrompt = '';
  level.generation.assetSlots = [];
  level.generation.generatedImageRef = null;
  level.objects = [];
}

function getSelectedLevel() {
  return project.levels.find((level) => level.id === selectedLevelId) ?? project.levels[0];
}

function getLayerOrder(level, layerId) {
  return level.layers.find((layer) => layer.id === layerId)?.order ?? 10;
}

function toAssetUrl(filePath) {
  const value = String(filePath ?? '');
  const marker = 'wwwroot\\';
  const normalized = value.replaceAll('/', '\\');
  const index = normalized.toLowerCase().indexOf(marker);
  if (index >= 0) {
    return normalized.slice(index + marker.length).replaceAll('\\', '/');
  }
  return value;
}

function isBackgroundPlateObject(object) {
  return object.layerId === 'background' && (
    object.kind === 'clean_background_plate' ||
    object.kind === 'background' ||
    (object.size?.width ?? 0) >= 1500
  );
}

function getStagePoint(event, stage) {
  const rect = stage.getBoundingClientRect();
  return {
    x: Math.round(((event.clientX - rect.left) / rect.width) * 1536),
    y: Math.round(((event.clientY - rect.top) / rect.height) * 864)
  };
}

function getCurrentLevelAssetsDirectory() {
  return `C:\\Dev\\2DLevelCreationStudio\\wwwroot\\assets\\generated\\${getSelectedLevel().id}`;
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
  const requestRef = level.generation.generatedImageRef ?? {};
  const hasRequest = Boolean(requestRef.currentRequestPath);
  const currentRequest = normalizeRequest(level.generation.userRequest);
  const sourceRequest = normalizeRequest(requestRef.sourceRequest);
  const isConnectedBrief = hasRequest && sourceRequest && sourceRequest === currentRequest;
  if (!['brief', 'tree', 'logic'].includes(activeInspectorTab)) {
    activeInspectorTab = 'brief';
  }

  els.inspector.innerHTML = `
    <details class="create-level-card generation-drawer" ${hasRequest ? '' : 'open'}>
      <summary class="drawer-summary">
        <div>
          <h2>Generation Prompt</h2>
          <p>${escapeHtml(level.generation.userRequest || 'Write a prompt')}</p>
        </div>
        <button type="button" class="help-icon" title="Studio writes the brief and structured elements list. Codex generates the image/assets outside the browser, then Studio applies the result.">?</button>
      </summary>
      <label class="prompt-box-label" for="generationUserRequestInput">Level idea</label>
      <textarea id="generationUserRequestInput" class="short-request-input" placeholder="Inside of a pirate ship">${escapeHtml(level.generation.userRequest)}</textarea>
      <label class="prompt-box-label" for="generationPlanNotesInput">Optional level plan</label>
      <textarea id="generationPlanNotesInput" class="short-request-input plan-notes-input" placeholder="Optional: key puzzle, main movable prop, exit rule, mood">${escapeHtml(level.generation.planNotes)}</textarea>
      <div class="primary-action-row">
        <button type="button" id="generateFromRequestButton" class="primary-action" ${isGenerating ? 'disabled' : ''}>${isGenerating ? 'Writing...' : hasRequest ? 'Regenerate background' : 'Generate background'}</button>
        <button type="button" id="openCurrentRequestButton" ${hasRequest ? '' : 'disabled'}>Open prompt</button>
      </div>
    </details>

    <div class="level-actions-row">
      <button type="button" id="applyCodexResultButton" ${hasRequest ? '' : 'disabled'}>Refresh from files</button>
      <button type="button" id="openLevelAssetsButton">Open level assets</button>
    </div>

    <div class="hidden-field-store">
      <textarea id="generationSummaryInput">${escapeHtml(level.generation.summary)}</textarea>
      <textarea id="generationCompositionInput">${escapeHtml(level.generation.composition)}</textarea>
      <textarea id="generationPromptInput">${escapeHtml(level.generation.fullLevelPrompt)}</textarea>
      <textarea id="testPromptInput">${escapeHtml(level.generation.testPrompt)}</textarea>
      <input id="gameTitleInput" value="${escapeHtml(project.game.title)}">
      <textarea id="gameNotesInput">${escapeHtml(project.game.notes)}</textarea>
    </div>

    <section class="tree-workspace-card">
      <div class="panel-heading-row">
        <h3>Level Layers</h3>
        <button type="button" class="help-icon" title="Each node has an id for Codex edits, a generated image path, and a prompt path.">?</button>
      </div>
      <div id="levelTree" class="level-tree-panel"></div>
    </section>

    <details class="internal-brief-details compact-logic">
      <summary>Level logic</summary>
      <textarea id="logicScriptInput" class="logic-editor">${escapeHtml(level.logicScript)}</textarea>
    </details>
  `;

  renderLevelTree(level);
  bindInspectorControls(level);
}

function renderLevelTree(level) {
  const root = document.getElementById('levelTree');
  if (!root) return;
  const orderedLayers = [...level.layers].sort((a, b) => a.order - b.order);
  root.replaceChildren(...orderedLayers.map((layer) => {
    const layerNode = document.createElement('div');
    layerNode.className = 'layer-node';
    const objects = level.objects.filter((object) => object.layerId === layer.id);
    const characters = project.characters.filter((character) => character.levelId === level.id && character.layerId === layer.id);
    const childCount = objects.length + characters.length;
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
      ...characters.map((item) => ({ ...item, nodeType: 'character' }))
    ]
      .forEach((item) => {
        const child = document.createElement('div');
        const nodeId = item.id ?? item.objectId ?? item.name;
        const imagePath = item.imagePath ?? item.filePath ?? '';
        const promptPath = item.promptPath ?? '';
        child.className = `asset-node${nodeId === selectedObjectId ? ' is-selected' : ''}`;
        child.innerHTML = `
          <div class="asset-node-main">
            <strong>${escapeHtml(item.name ?? item.id)}</strong>
          </div>
          <div class="asset-node-actions">
            <button type="button" class="copy-node-id" data-node-id="${escapeHtml(nodeId)}">Copy id</button>
            ${imagePath ? `<button type="button" class="reveal-node-path" data-path="${escapeHtml(imagePath)}">Reveal image</button>` : ''}
            ${promptPath ? `<button type="button" class="reveal-node-path" data-path="${escapeHtml(promptPath)}">Reveal prompt</button>` : ''}
          </div>
        `;
        child.title = 'Future: right-click to create a focused Codex edit request for only this node and its direct context.';
        child.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          showStatus(`Codex edit id: ${nodeId}. Use this id in chat for focused edits.`);
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

  document.querySelectorAll('.copy-node-id').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.nodeId);
        showStatus(`Copied id: ${button.dataset.nodeId}`);
      } catch {
        showStatus(`Node id: ${button.dataset.nodeId}`);
      }
    });
  });

  document.querySelectorAll('.reveal-node-path').forEach((button) => {
    button.addEventListener('click', async () => {
      revealPath(button.dataset.path);
    });
  });

  document.getElementById('openLevelAssetsButton')?.addEventListener('click', () => {
    revealPath(getCurrentLevelAssetsDirectory());
  });

  document.getElementById('generateFromRequestButton').addEventListener('click', generateDraftFromRequest);
  document.getElementById('openCurrentRequestButton').addEventListener('click', openCurrentRequest);
  document.getElementById('applyCodexResultButton')?.addEventListener('click', applyCodexResult);
  document.getElementById('generationUserRequestInput').addEventListener('input', (event) => {
    const nextRequest = event.target.value;
    const previousSourceRequest = normalizeRequest(level.generation.generatedImageRef?.sourceRequest);
    level.generation.userRequest = nextRequest;
    if (level.generation.generatedImageRef && (!previousSourceRequest || previousSourceRequest !== normalizeRequest(nextRequest))) {
      clearGeneratedBriefState(level);
      level.generation.userRequest = nextRequest;
      saveProject();
      render();
      focusGenerationInput();
      showStatus('Request changed. Generate a fresh brief.');
      return;
    }
    saveProject();
  });
  document.getElementById('generationPlanNotesInput')?.addEventListener('input', (event) => {
    const nextNotes = event.target.value;
    level.generation.planNotes = nextNotes;
    if (level.generation.generatedImageRef) {
      clearGeneratedBriefState(level);
      level.generation.planNotes = nextNotes;
      saveProject();
      render();
      focusGenerationInput();
      showStatus('Plan notes changed. Prepare a fresh handoff.');
      return;
    }
    saveProject();
  });
  document.getElementById('generationSummaryInput')?.addEventListener('input', (event) => {
    level.generation.summary = event.target.value;
    saveProject();
  });
  document.getElementById('generationCompositionInput')?.addEventListener('input', (event) => {
    level.generation.composition = event.target.value;
    saveProject();
  });
  document.getElementById('generationPromptInput')?.addEventListener('input', (event) => {
    level.generation.fullLevelPrompt = event.target.value;
    saveProject();
  });
  document.getElementById('testPromptInput')?.addEventListener('input', (event) => {
    level.generation.testPrompt = event.target.value;
    saveProject();
  });
  document.getElementById('logicScriptInput')?.addEventListener('input', (event) => {
    level.logicScript = event.target.value;
    saveProject();
  });

  document.getElementById('gameTitleInput')?.addEventListener('input', (event) => {
    project.game.title = event.target.value;
    saveProject();
    renderHeader();
  });

  document.getElementById('gameNotesInput')?.addEventListener('input', (event) => {
    project.game.notes = event.target.value;
    saveProject();
  });

  document.getElementById('openAssetsDirectoryButton')?.addEventListener('click', () => {
    showStatus('Browser security blocks opening local directories directly. Use C:\\Dev\\2DLevelCreationStudio\\wwwroot\\assets for now.');
  });
}

async function revealPath(path) {
  try {
    const response = await fetch('/api/reveal-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Reveal failed');
    showStatus('Opened in Explorer');
  } catch (error) {
    showStatus(error.message || 'Reveal failed');
  }
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
  renderStatusButton(level);
}

function renderStatusButton(level) {
  const requestPath = level.generation.generatedImageRef?.currentRequestPath;
  if (requestPath) {
    els.statusPill.textContent = 'Open request';
    els.statusPill.classList.add('has-request');
    els.statusPill.title = 'Read the Markdown generation request written for Codex.';
  } else {
    els.statusPill.textContent = 'Authoring';
    els.statusPill.classList.remove('has-request');
    els.statusPill.title = 'No generation request yet.';
  }
}

function renderLevelStage() {
  const level = getSelectedLevel();
  const imageRef = level.generation.generatedImageRef;
  const backgroundObject = level.objects.find(isBackgroundPlateObject);
  const backgroundUrl = backgroundObject?.imagePath
    ? toAssetUrl(backgroundObject.imagePath)
    : imageRef?.previewUrl;
  const imageSrc = imageRef?.previewUrl
    ? `${backgroundUrl}?draft=${encodeURIComponent(imageRef.revision ?? 'current')}`
    : 'assets/placeholder-level.svg';
  const imageLabel = imageRef
    ? imageRef.status === 'handoff_ready'
      ? 'Generation request ready for Codex'
      : imageRef.status === 'applied'
      ? 'Applied generated level image'
      : imageRef.status === 'approved'
      ? 'Approved generated level image'
      : 'Draft generated level image'
    : 'Level placeholder';

  const revisionLabel = imageRef?.revision ? `rev ${String(imageRef.revision).slice(-6)}` : '';
  const overlayObjects = [...level.objects]
    .filter((object) => !isBackgroundPlateObject(object))
    .sort((a, b) => getLayerOrder(level, a.layerId) - getLayerOrder(level, b.layerId));

  els.levelStage.innerHTML = `
    <img class="level-placeholder ${imageRef ? 'is-generated' : ''}" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageLabel)}">
    <div class="level-object-layer">
      ${overlayObjects.map((object) => renderStageObject(level, object)).join('')}
    </div>
    <div class="level-empty-state">${escapeHtml(imageRef ? imageLabel : 'Ready for objects, layers, and mechanics')}</div>
    ${revisionLabel ? `<div class="level-revision-badge">${escapeHtml(revisionLabel)}</div>` : ''}
  `;
  bindStageObjectControls();
}

function renderStageObject(level, object) {
  const width = Math.max(24, Number(object.size?.width ?? 120));
  const height = Math.max(24, Number(object.size?.height ?? 90));
  const x = Number(object.position?.x ?? 768);
  const y = Number(object.position?.y ?? 432);
  const left = ((x - width / 2) / 1536) * 100;
  const top = ((y - height / 2) / 864) * 100;
  const style = [
    `left:${left}%`,
    `top:${top}%`,
    `width:${(width / 1536) * 100}%`,
    `height:${(height / 864) * 100}%`,
    `z-index:${20 + getLayerOrder(level, object.layerId)}`
  ].join(';');
  const imageUrl = object.imagePath ? toAssetUrl(object.imagePath) : '';
  const isZone = object.kind === 'walkable_area' || !imageUrl;

  return `
    <button type="button" class="stage-object ${isZone ? 'is-zone' : ''} ${object.id === selectedObjectId ? 'is-selected' : ''}" data-object-id="${escapeHtml(object.id)}" style="${style}" title="${escapeHtml(object.id)}">
      ${isZone
        ? `<span>${escapeHtml(object.name)}</span>`
        : `<img src="${escapeHtml(imageUrl)}?object=${encodeURIComponent(object.id)}&rev=${encodeURIComponent(level.generation.generatedImageRef?.revision ?? 'current')}" alt="${escapeHtml(object.name)}">`}
    </button>
  `;
}

function bindStageObjectControls() {
  document.querySelectorAll('.stage-object').forEach((node) => {
    node.addEventListener('pointerdown', startStageObjectDrag);
    node.addEventListener('mousedown', startStageObjectDrag);
  });
}

function startStageObjectDrag(event) {
  event.preventDefault();
  if (activeStageDrag) return;
  activeStageDrag = true;
  const node = event.currentTarget;
  const level = getSelectedLevel();
  const object = level.objects.find((item) => item.id === node.dataset.objectId);
  if (!object) return;

  selectedObjectId = object.id;
  const stage = els.levelStage;
  const startPoint = getStagePoint(event, stage);
  const startPosition = {
    x: Number(object.position?.x ?? 768),
    y: Number(object.position?.y ?? 432)
  };
  if (event.pointerId !== undefined && node.setPointerCapture) {
    node.setPointerCapture(event.pointerId);
  }
  node.classList.add('is-dragging');
  renderLevelTree(level);

  const move = (moveEvent) => {
    const point = getStagePoint(moveEvent, stage);
    const nextX = startPosition.x + point.x - startPoint.x;
    const nextY = startPosition.y + point.y - startPoint.y;
    const halfWidth = Number(object.size?.width ?? 120) / 2;
    const halfHeight = Number(object.size?.height ?? 90) / 2;
    object.position = {
      x: Math.round(Math.min(1536 - halfWidth, Math.max(halfWidth, nextX))),
      y: Math.round(Math.min(864 - halfHeight, Math.max(halfHeight, nextY)))
    };
    updateStageObjectNode(node, object, level);
  };

  const up = () => {
    activeStageDrag = false;
    node.classList.remove('is-dragging');
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    saveProject();
    renderLevelStage();
    renderLevelTree(level);
    showStatus(`Moved ${object.name}`);
  };

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function updateStageObjectNode(node, object, level) {
  const width = Math.max(24, Number(object.size?.width ?? 120));
  const height = Math.max(24, Number(object.size?.height ?? 90));
  const x = Number(object.position?.x ?? 768);
  const y = Number(object.position?.y ?? 432);
  node.style.left = `${((x - width / 2) / 1536) * 100}%`;
  node.style.top = `${((y - height / 2) / 864) * 100}%`;
  node.style.width = `${(width / 1536) * 100}%`;
  node.style.height = `${(height / 864) * 100}%`;
  node.style.zIndex = String(20 + getLayerOrder(level, object.layerId));
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
  activeInspectorTab = 'brief';
  render();
  focusGenerationInput();
  showStatus('Type a short level request, then prepare the Codex handoff');
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

async function generateDraftFromRequest() {
  if (isGenerating) return;

  const level = getSelectedLevel();
  const request = normalizeRequest(level.generation.userRequest || 'generate me a level that is a prison cell');
  const plan = buildBackgroundOnlyPlan(request);
  plan.sourceRequest = request;
  plan.createdAt = new Date().toISOString();
  const bridgePrompt = plan.internalBrief;

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
  level.generation.generatedImageRef = null;
  saveProject();
  generationPanelOpen = true;
  activeInspectorTab = 'brief';
  isGenerating = true;
  render();
  showStatus('Writing generation request...');

  try {
    const markdown = buildGenerationBriefMarkdown(level, plan);
    const planJson = buildStructuredPlanJson(level, plan, bridgePrompt);
    const result = await writeGenerationRequest(level.id, markdown, planJson);
    level.generation.generatedImageRef = {
      status: 'handoff_ready',
      previewUrl: null,
      revision: result.revision,
      requestPath: result.requestPath,
      currentRequestPath: result.currentRequestPath,
      planPath: result.planPath,
      currentPlanPath: result.currentPlanPath,
      sourceRequest: request,
      generatedAt: plan.createdAt,
      note: 'Generation request written for Codex handoff. Ask Codex to generate from the latest request.'
    };
    saveProject();
    showStatus('Generation request ready for Codex');
  } catch (error) {
    level.generation.generatedImageRef = null;
    saveProject();
    showStatus(error.message || 'Could not write generation request');
  } finally {
    isGenerating = false;
    render();
  }
}

async function writeGenerationRequest(levelId, markdown, planJson) {
  const response = await fetch('/api/write-generation-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ levelId, briefMarkdown: markdown, planJson })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Handoff bridge failed with HTTP ${response.status}`);
  }

  if (!payload.currentRequestPath || !payload.revision) {
    throw new Error('Handoff bridge did not return a request path.');
  }

  return payload;
}

async function readCurrentGenerationResult(levelId) {
  const response = await fetch(`/api/current-generation-result?levelId=${encodeURIComponent(levelId)}`, {
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Could not read Codex result (${response.status})`);
  }
  return payload;
}

async function applyCodexResult() {
  const level = getSelectedLevel();
  try {
    const result = await readCurrentGenerationResult(level.id);
    const planJson = JSON.parse(String(result.planJson || '').replace(/^\uFEFF/, '').trim());
    applyStructuredPlanToLevel(level, planJson, result);
    saveProject();
    activeInspectorTab = 'tree';
    render();
    showStatus('Level refreshed from files');
  } catch (error) {
    showStatus(error.message || 'Could not refresh level files');
  }
}

function applyStructuredPlanToLevel(level, planJson, result) {
  const plan = planJson.plan ?? {};
  const assetSlots = Array.isArray(plan.assetSlots) ? plan.assetSlots : [];
  const sourceRequest = normalizeRequest(planJson.sourceRequest || planJson.userRequest || level.generation.userRequest);
  const revision = Math.round(Number(result.imageRevision || Date.now()));

  level.generation.userRequest = planJson.userRequest || level.generation.userRequest;
  level.generation.planNotes = planJson.planNotes || level.generation.planNotes || '';
  level.generation.summary = plan.intent || '';
  level.generation.composition = plan.layerPlanText || '';
  level.generation.gameplayPurpose = plan.gameplayPurpose || '';
  level.generation.safetyCheck = plan.safetyCheck || '';
  level.generation.assetSlots = structuredClone(assetSlots);
  level.generation.draftPlan = {
    title: plan.title || buildDisplayTitleFromRequest(sourceRequest),
    intent: plan.intent || '',
    gameplayPurpose: plan.gameplayPurpose || '',
    safetyCheck: plan.safetyCheck || '',
    backgroundItems: plan.backgroundItems || [],
    movableItems: plan.movableItems || [],
    logicRules: plan.logicRules || [],
    layerPlanText: plan.layerPlanText || '',
    assetSlots: structuredClone(assetSlots),
    sourceRequest,
    createdAt: planJson.createdAt || new Date().toISOString()
  };
  level.generation.approvedPlan = structuredClone(level.generation.draftPlan);
  level.generation.generatedImageRef = {
    ...(level.generation.generatedImageRef ?? {}),
    status: 'applied',
    previewUrl: result.imageUrl,
    revision,
    sourceRequest,
    generatedAt: result.imageLastWriteTime || new Date().toISOString(),
    currentPlanPath: result.planPath,
    currentRequestPath: level.generation.generatedImageRef?.currentRequestPath ?? `C:\\Dev\\2DLevelCreationStudio\\handoff\\requests\\${level.id}-image-brief-current.md`,
    appliedAt: new Date().toISOString(),
    note: 'Codex-generated image and structured plan are applied to the level.'
  };

  level.objects = assetSlots.map((slot) => ({
    id: slot.objectId || slot.id,
    name: slot.name || slot.id,
    layerId: slot.layerId || 'foreground_1',
    kind: slot.kind || 'object',
    position: slot.position || { x: 768, y: 432 },
    size: slot.size || { width: 160, height: 100 },
    interactive: Boolean(slot.interactive),
    exportSeparately: Boolean(slot.needsBgRemoval),
    movable: Boolean(slot.movable),
    occludesPlayer: slot.occludesPlayer ?? 'none',
    assetRef: slot.id,
    imagePath: slot.imagePath || '',
    promptPath: slot.promptPath || '',
    notes: slot.logicRole || ''
  }));

  const backgroundAsset = {
    id: `${level.id}_background_current`,
    levelId: level.id,
    name: `${plan.title || level.name} background`,
    type: 'generated_level_image',
    url: result.imageUrl,
    filePath: result.imagePath,
    revision
  };
  project.assets = [
    ...project.assets.filter((asset) => asset.id !== backgroundAsset.id),
    backgroundAsset
  ];

  if (Array.isArray(plan.logicRules) && plan.logicRules.length > 0) {
    level.logicScript = [
      `Goal: ${plan.gameplayPurpose || 'Solve the level puzzle and reach the exit.'}`,
      '',
      'Rules:',
      ...plan.logicRules.map((rule) => `- ${rule}`)
    ].join('\n');
  }
}

function buildGenerationBriefMarkdown(level, plan) {
  const animatable = plan.assetSlots
    .filter((slot) => slot.movable || slot.needsBgRemoval)
    .map((slot) => `- ${slot.name}: ${slot.logicRole}`);

  return [
    `# Image Brief: ${buildDisplayTitleFromRequest(plan.sourceRequest || level.generation.userRequest)}`,
    '',
    `Level: ${level.id} / ${level.name}`,
    `Created: ${new Date().toISOString()}`,
    '',
    '## User Request',
    '',
    level.generation.userRequest || 'generate me a level',
    '',
    '## Image To Create',
    '',
    plan.intent,
    '',
    '## Generation Phase',
    '',
    'Background only. Generate an empty level background plate first. Do not generate gameplay props in this pass.',
    '',
    '## Image Description',
    '',
    buildUserFacingImageDescription(plan),
    '',
    ...(level.generation.planNotes.trim()
      ? ['## Optional Level Plan', '', level.generation.planNotes.trim(), '']
      : []),
    '## Animatable / Separable Items',
    '',
    ...(animatable.length ? animatable : ['- None in this background pass. Props will be generated later as separate transparent PNGs.']),
    '',
    '## Save Result Here',
    '',
    '```text',
    `C:\\Dev\\2DLevelCreationStudio\\wwwroot\\assets\\generated\\${level.id}\\current.png`,
    '```',
    '',
    '## Review Note',
    '',
    'This file is intentionally short for user approval. General generation rules live in `docs/handoff/general-image-guidelines.md`. The structured plan is stored next to this brief as JSON.'
  ].join('\n');
}

function buildStructuredPlanJson(level, plan, internalBrief) {
  return {
    levelId: level.id,
    levelName: level.name,
    createdAt: new Date().toISOString(),
    userRequest: level.generation.userRequest || '',
    sourceRequest: plan.sourceRequest || level.generation.userRequest || '',
    planNotes: level.generation.planNotes || '',
    generalGuidelinesPath: 'C:\\Dev\\2DLevelCreationStudio\\docs\\handoff\\general-image-guidelines.md',
    outputImagePath: `C:\\Dev\\2DLevelCreationStudio\\wwwroot\\assets\\generated\\${level.id}\\current.png`,
    internalBrief,
    plan: {
      title: buildDisplayTitleFromRequest(plan.sourceRequest || level.generation.userRequest),
      internalTemplateTitle: plan.title,
      phase: plan.phase || 'full_level',
      intent: plan.intent,
      gameplayPurpose: plan.gameplayPurpose,
      safetyCheck: plan.safetyCheck,
      layerPlanText: plan.layerPlanText,
      backgroundItems: plan.backgroundItems,
      movableItems: plan.movableItems,
      logicRules: plan.logicRules,
      assetSlots: plan.assetSlots
    }
  };
}

function buildUserFacingImageDescription(plan) {
  if (plan.phase === 'background') {
    return [
      'Create a clean empty 2D adventure-game background plate for this level.',
      '',
      'Include only the permanent environment: room shell, walls, floor, fixed lighting, fixed architecture, and open walkable space.',
      '',
      'Do not include movable props, collectibles, characters, foreground clutter, puzzle objects, containers, loose furniture, labels, UI, logos, or text. Those will be generated later as separate transparent PNG elements.'
    ].join('\n');
  }

  if (plan.title === 'Prison Cell Level') {
    return [
      'Create a high-quality hand-painted 2D adventure-game prison cell room. The room should feel cozy and puzzle-like, not scary.',
      '',
      'The scene has a stone frame, beige plaster walls with green lower paint, tiled floor, a blue locked door on the left, a small barred window on the right with sunlight, a metal bed with pillow and folded blanket, a wooden crate, a broom, wall shelves with books/plants, and a warm hanging lamp.',
      '',
      'The image should look polished and usable as a game level background, comparable in quality to the supplied cell-room reference.'
    ].join('\n');
  }

  return plan.intent;
}

function approveGeneratedPlan() {
  const level = getSelectedLevel();
  if (!level.generation.draftPlan) {
    showStatus('Generate a brief first');
    return;
  }
  const sourceRequest = normalizeRequest(level.generation.generatedImageRef?.sourceRequest);
  if (!sourceRequest || sourceRequest !== normalizeRequest(level.generation.userRequest)) {
    showStatus('Brief is out of sync. Regenerate it first.');
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

function buildInternalBrief({ request, title, style, mustPlan, phase = 'full_level' }) {
  const notes = getSelectedLevel().generation.planNotes.trim();
  return [
    `User request: "${request}"`,
    ...(notes ? ['', `User level plan notes: ${notes}`] : []),
    '',
    `Generation phase: ${phase}`,
    phase === 'background'
      ? 'This pass must generate only the clean empty background plate and walkable floor zone. Do not include movable/interactable props.'
      : 'This pass may include planned level elements.',
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
    '- For background passes, keep the playable walking floor as wide as possible: about 1504px wide, centered, with only about 16px side margins so character animations do not clip against the room edges.',
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
    ...(phase === 'background'
      ? ['- only background and walkable floor slots; no prop slots yet']
      : []),
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
    pill.classList.remove('is-message');
    renderStatusButton(getSelectedLevel());
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
els.statusPill.addEventListener('click', openCurrentRequest);
els.closeRequestButton.addEventListener('click', closeRequestDialog);
els.requestDialog.addEventListener('click', (event) => {
  if (event.target === els.requestDialog) closeRequestDialog();
});
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

async function openCurrentRequest() {
  const level = getSelectedLevel();
  if (!level.generation.generatedImageRef?.currentRequestPath) {
    showStatus('No request yet');
    return;
  }

  try {
    const response = await fetch(`/api/current-generation-request?levelId=${encodeURIComponent(level.id)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Could not read request (${response.status})`);
    }

    els.requestDialogPath.textContent = `Brief: ${payload.path}`;
    els.requestPlanPath.textContent = payload.planPath ? `Plan: ${payload.planPath}` : 'Plan: not written yet';
    els.requestMarkdownView.textContent = payload.markdown;
    els.requestDialog.hidden = false;
  } catch (error) {
    showStatus(error.message || 'Could not open request');
  }
}

function closeRequestDialog() {
  els.requestDialog.hidden = true;
}
