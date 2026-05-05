const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 5190);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.join(__dirname, 'wwwroot');
const GENERATED_DIR = path.join(ROOT, 'assets', 'generated');
const HANDOFF_DIR = path.join(__dirname, 'handoff');
const REQUESTS_DIR = path.join(HANDOFF_DIR, 'requests');
const RESULTS_DIR = path.join(HANDOFF_DIR, 'results');
const UIAUTOMATION_PROJECT = process.env.UIAUTOMATION_PROJECT || 'C:\\Dev\\Uiautomation\\CodexUiAutomation.Cli\\CodexUiAutomation.Cli.csproj';
const UIAUTOMATION_ROOT = process.env.UIAUTOMATION_ROOT || 'C:\\Dev\\Uiautomation';
const UIAUTOMATION_APP = process.env.UIAUTOMATION_APP || '2DLevelCreationStudio';
const UIAUTOMATION_OUTPUT_DIR = path.join(UIAUTOMATION_ROOT, UIAUTOMATION_APP);
const IMAGE_EXTENSIONS = new Set(['.png']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/write-generation-request') {
      await handleWriteGenerationRequest(req, res);
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/current-generation-request')) {
      await handleReadCurrentGenerationRequest(req, res);
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/current-generation-result')) {
      await handleReadCurrentGenerationResult(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/start-generation-automation') {
      await handleStartGenerationAutomation(req, res);
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/generation-automation-status')) {
      await handleGenerationAutomationStatus(req, res);
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/background-history')) {
      await handleBackgroundHistory(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/select-background') {
      await handleSelectBackground(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/reveal-path') {
      await handleRevealPath(req, res);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

async function handleWriteGenerationRequest(req, res) {
  const body = await readJson(req);
  const markdown = String(body.markdown || body.briefMarkdown || '').trim();
  const planJson = body.planJson ?? null;
  const levelId = safeName(String(body.levelId || 'level'));
  if (!markdown) {
    sendJson(res, 400, { error: 'Missing markdown.' });
    return;
  }

  await fsp.mkdir(REQUESTS_DIR, { recursive: true });
  await fsp.mkdir(RESULTS_DIR, { recursive: true });
  await fsp.mkdir(path.join(GENERATED_DIR, levelId), { recursive: true });
  const levelRequestsDir = path.join(REQUESTS_DIR, levelId);
  await fsp.mkdir(levelRequestsDir, { recursive: true });
  const revision = Date.now();
  const briefFilename = `image-brief-${revision}.md`;
  const currentBriefFilename = 'image-brief-current.md';
  const planFilename = `structured-plan-${revision}.json`;
  const currentPlanFilename = 'structured-plan-current.json';
  const filePath = path.join(levelRequestsDir, briefFilename);
  const currentPath = path.join(levelRequestsDir, currentBriefFilename);
  const planPath = path.join(levelRequestsDir, planFilename);
  const currentPlanPath = path.join(levelRequestsDir, currentPlanFilename);

  await cleanupRequests(levelId);
  await fsp.writeFile(filePath, markdown, 'utf8');
  await fsp.writeFile(currentPath, markdown, 'utf8');
  if (planJson !== null) {
    const planContent = typeof planJson === 'string' ? planJson : JSON.stringify(planJson, null, 2);
    await fsp.writeFile(planPath, planContent, 'utf8');
    await fsp.writeFile(currentPlanPath, planContent, 'utf8');
    await writeElementPromptFiles(levelRequestsDir, planContent);
  }

  sendJson(res, 200, {
    requestPath: filePath,
    currentRequestPath: currentPath,
    planPath: planJson !== null ? planPath : null,
    currentPlanPath: planJson !== null ? currentPlanPath : null,
    revision,
    saved: briefFilename
  });
}

async function handleReadCurrentGenerationRequest(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const levelId = safeName(url.searchParams.get('levelId') || 'level');
  const currentPath = path.join(REQUESTS_DIR, levelId, 'image-brief-current.md');
  const currentPlanPath = path.join(REQUESTS_DIR, levelId, 'structured-plan-current.json');

  try {
    const markdown = await fsp.readFile(currentPath, 'utf8');
    const planJson = await fsp.readFile(currentPlanPath, 'utf8').catch(() => null);
    sendJson(res, 200, {
      levelId,
      path: currentPath,
      markdown,
      planPath: planJson ? currentPlanPath : null,
      planJson
    });
  } catch {
    sendJson(res, 404, {
      error: `No current generation request found for ${levelId}.`
    });
  }
}

async function handleReadCurrentGenerationResult(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const levelId = safeName(url.searchParams.get('levelId') || 'level');
  const currentPlanPath = path.join(REQUESTS_DIR, levelId, 'structured-plan-current.json');
  const imagePath = path.join(GENERATED_DIR, levelId, 'current.png');

  const [planJson, imageStat] = await Promise.all([
    fsp.readFile(currentPlanPath, 'utf8').catch(() => null),
    fsp.stat(imagePath).catch(() => null)
  ]);

  if (!planJson) {
    sendJson(res, 404, { error: `No current structured plan found for ${levelId}.` });
    return;
  }

  if (!imageStat) {
    sendJson(res, 404, {
      error: `No generated image found for ${levelId}.`,
      expectedImagePath: imagePath,
      planPath: currentPlanPath
    });
    return;
  }

  sendJson(res, 200, {
    levelId,
    planPath: currentPlanPath,
    planJson,
    imagePath,
    imageUrl: `/assets/generated/${levelId}/current.png`,
    imageRevision: imageStat.mtimeMs,
    imageLastWriteTime: imageStat.mtime.toISOString(),
    backgroundHistory: await listBackgroundHistory(levelId)
  });
}

async function handleStartGenerationAutomation(req, res) {
  const body = await readJson(req);
  const levelId = safeName(String(body.levelId || 'level'));
  const levelRequestsDir = path.join(REQUESTS_DIR, levelId);
  const currentBriefPath = path.join(levelRequestsDir, 'image-brief-current.md');
  const currentPlanPath = path.join(levelRequestsDir, 'structured-plan-current.json');
  const outputImagePath = path.join(GENERATED_DIR, levelId, 'current.png');
  const automationPromptPath = path.join(levelRequestsDir, 'automation-prompt-current.md');
  const statusPath = path.join(levelRequestsDir, 'automation-status.json');
  const logPath = path.join(levelRequestsDir, 'automation.log');

  const [briefMarkdown, planJson, previousImageStat] = await Promise.all([
    fsp.readFile(currentBriefPath, 'utf8').catch(() => null),
    fsp.readFile(currentPlanPath, 'utf8').catch(() => null),
    fsp.stat(outputImagePath).catch(() => null)
  ]);

  if (!briefMarkdown || !planJson) {
    sendJson(res, 404, { error: `No current generation package found for ${levelId}.` });
    return;
  }

  await fsp.mkdir(path.dirname(outputImagePath), { recursive: true });
  await fsp.mkdir(UIAUTOMATION_OUTPUT_DIR, { recursive: true });
  await cleanupExternalOutput();
  const previousExternalImage = await findNewestExternalImage();
  const startedAt = new Date().toISOString();
  const prompt = buildAutomationPrompt({
    levelId,
    currentBriefPath,
    currentPlanPath,
    outputImagePath,
    briefMarkdown,
    planJson
  });
  await fsp.writeFile(automationPromptPath, prompt, 'utf8');

  const status = {
    levelId,
    state: 'submitted',
    startedAt,
    promptPath: automationPromptPath,
    requestPath: currentBriefPath,
    planPath: currentPlanPath,
    outputImagePath,
    uiautomationApp: UIAUTOMATION_APP,
    uiautomationOutputDir: UIAUTOMATION_OUTPUT_DIR,
    phase: readPlanPhase(planJson),
    previousImageMtimeMs: previousImageStat?.mtimeMs ?? null,
    previousImageLastWriteTime: previousImageStat?.mtime?.toISOString() ?? null,
    previousExternalImagePath: previousExternalImage?.path ?? null,
    previousExternalImageMtimeMs: previousExternalImage?.mtimeMs ?? null,
    logPath
  };

  await fsp.writeFile(statusPath, JSON.stringify(status, null, 2), 'utf8');

  const args = buildAutomationArgs(prompt);
  const child = spawn(args.command, args.args, {
    cwd: __dirname,
    windowsHide: true,
    stdio: 'ignore'
  });

  status.pid = child.pid ?? null;
  await fsp.writeFile(statusPath, JSON.stringify(status, null, 2), 'utf8');

  child.on('exit', async (code) => {
    const current = await readAutomationStatus(levelId);
    if (!current || current.state === 'image_ready') return;
    current.toolExitCode = code;
    current.toolExitedAt = new Date().toISOString();
    if (code !== 0) {
      current.state = 'tool_failed';
      current.error = `Codex UI automation exited with code ${code}.`;
    }
    await fsp.writeFile(statusPath, JSON.stringify(current, null, 2), 'utf8').catch(() => {});
  });
  child.on('error', async (error) => {
    const current = await readAutomationStatus(levelId);
    if (!current || current.state === 'image_ready') return;
    current.state = 'tool_failed';
    current.error = error.message || 'Could not start Codex UI automation.';
    current.toolExitedAt = new Date().toISOString();
    await fsp.writeFile(statusPath, JSON.stringify(current, null, 2), 'utf8').catch(() => {});
  });

  sendJson(res, 200, {
    ok: true,
    ...status,
    pid: child.pid ?? null,
    command: args.display
  });
}

async function handleGenerationAutomationStatus(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const levelId = safeName(url.searchParams.get('levelId') || 'level');
  const status = await readAutomationStatus(levelId);
  if (!status) {
    sendJson(res, 404, { error: `No automation status found for ${levelId}.` });
    return;
  }

  const imported = await importExternalGenerationIfReady(levelId, status);
  if (imported) {
    status.state = 'image_ready';
    status.importedImagePath = imported.importedImagePath;
    status.sourceImagePath = imported.sourceImagePath;
    status.imageMtimeMs = imported.imageMtimeMs;
    status.imageLastWriteTime = imported.imageLastWriteTime;
    status.imageUrl = `/assets/generated/${levelId}/current.png`;
    status.backgroundHistory = await listBackgroundHistory(levelId);
    await fsp.writeFile(getAutomationStatusPath(levelId), JSON.stringify(status, null, 2), 'utf8').catch(() => {});
  }

  sendJson(res, 200, status);
}

async function handleBackgroundHistory(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const levelId = safeName(url.searchParams.get('levelId') || 'level');
  sendJson(res, 200, {
    levelId,
    items: await listBackgroundHistory(levelId)
  });
}

async function handleSelectBackground(req, res) {
  const body = await readJson(req);
  const levelId = safeName(String(body.levelId || 'level'));
  const fileName = path.basename(String(body.fileName || ''));
  if (!fileName || !IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase())) {
    sendJson(res, 400, { error: 'Invalid background file.' });
    return;
  }

  const sourcePath = path.join(getBackgroundHistoryDir(levelId), fileName);
  const stat = await fsp.stat(sourcePath).catch(() => null);
  if (!stat?.isFile()) {
    sendJson(res, 404, { error: 'Background history file not found.' });
    return;
  }

  const currentPath = path.join(GENERATED_DIR, levelId, 'current.png');
  await fsp.copyFile(sourcePath, currentPath);
  const currentStat = await fsp.stat(currentPath);
  sendJson(res, 200, {
    levelId,
    imagePath: currentPath,
    imageUrl: `/assets/generated/${levelId}/current.png`,
    imageRevision: currentStat.mtimeMs,
    imageLastWriteTime: currentStat.mtime.toISOString(),
    selected: fileName,
    backgroundHistory: await listBackgroundHistory(levelId)
  });
}

async function handleRevealPath(req, res) {
  const body = await readJson(req);
  const targetPath = path.normalize(String(body.path || ''));
  const allowedRoots = [
    path.normalize(__dirname),
    path.normalize(path.join(__dirname, 'handoff')),
    path.normalize(path.join(__dirname, 'wwwroot', 'assets'))
  ];

  if (!targetPath || !allowedRoots.some((root) => targetPath === root || targetPath.startsWith(`${root}${path.sep}`))) {
    sendJson(res, 400, { error: 'Path is outside the studio workspace.' });
    return;
  }

  const exists = await fsp.stat(targetPath).catch(() => null);
  if (!exists) {
    sendJson(res, 404, { error: 'Path does not exist.' });
    return;
  }

  const args = exists.isDirectory() ? [targetPath] : ['/select,', targetPath];
  spawn('explorer.exe', args, { detached: true, stdio: 'ignore' }).unref();
  sendJson(res, 200, { ok: true, path: targetPath });
}

async function writeElementPromptFiles(levelRequestsDir, planContent) {
  let parsed;
  try {
    parsed = JSON.parse(planContent);
  } catch {
    return;
  }

  const slots = Array.isArray(parsed?.plan?.assetSlots) ? parsed.plan.assetSlots : [];
  const elementsDir = path.join(levelRequestsDir, 'elements');
  await fsp.mkdir(elementsDir, { recursive: true });

  await Promise.all(slots.map(async (slot) => {
    const rawPromptPath = path.normalize(String(slot.promptPath || ''));
    if (!rawPromptPath || !rawPromptPath.startsWith(`${elementsDir}${path.sep}`)) return;

    const lines = [
      `# Element Prompt: ${slot.name || slot.id || 'Asset'}`,
      '',
      `Level: ${parsed.levelId || ''} / ${parsed.levelName || ''}`.trim(),
      `Element id: ${slot.id || ''}`,
      `Object id: ${slot.objectId || ''}`,
      `Layer: ${slot.layerId || ''}`,
      '',
      '## Role',
      '',
      slot.logicRole || '',
      '',
      '## Image',
      '',
      slot.imagePath || 'No separate image. This is a geometry/control zone.',
      '',
      '## Generation Notes',
      '',
      slot.needsBgRemoval
        ? 'Generate as a separate transparent PNG cutout.'
        : 'Do not generate as a separate cutout unless this element later becomes movable.',
      ''
    ];

    await fsp.writeFile(rawPromptPath, lines.join('\n'), 'utf8');
  }));
}

function buildAutomationPrompt({ levelId, currentBriefPath, currentPlanPath, outputImagePath, briefMarkdown, planJson }) {
  const phase = readPlanPhase(planJson);
  return [
    '# 2D Level Creation Studio Generation Task',
    '',
    'You are being invoked through the Codex UIAutomation app-send API.',
    `The automation provides this output folder for app ${UIAUTOMATION_APP}:`,
    '',
    '```text',
    UIAUTOMATION_OUTPUT_DIR,
    '```',
    '',
    'Generate the requested visual asset and save the generated image in that output folder.',
    '',
    '## Hard Rules',
    '',
    '- Use exactly one image generation call for this request.',
    '- Save exactly one generated image file in the output folder.',
    '- Do not create alternates, drafts, sibling copies, or extra project files.',
    '- If the image tool saves an original in the Codex generated_images cache, leave it there, but copy only the selected final image into the project output path.',
    '- The image must be 1536x864 pixels, 16:9, PNG only.',
    '- Filename recommendation: ' + `${levelId}-${phase || 'generation'}-${Date.now()}.png`,
    '- After saving the image, do not edit source code, do not commit, and do not create extra files.',
    '',
    '## Studio Import',
    '',
    'Do not save directly into the Studio repo. Studio will import the newest image from the UIAutomation output folder into:',
    outputImagePath,
    '',
    '## Level Package',
    '',
    `Level id: ${levelId}`,
    `User-facing brief: ${currentBriefPath}`,
    `Structured plan: ${currentPlanPath}`,
    '',
    '## User-Facing Brief',
    '',
    briefMarkdown,
    '',
    '## Structured Plan JSON',
    '',
    '```json',
    planJson,
    '```',
    '',
    '## Required Final Response',
    '',
    'Reply only with: generated <filename>',
    ''
  ].join('\n');
}

function buildAutomationArgs(prompt) {
  return {
    command: 'dotnet',
    args: ['run', '--project', UIAUTOMATION_PROJECT, '--', 'app', 'send', '--app', UIAUTOMATION_APP, '--text', prompt],
    display: `dotnet run --project ${UIAUTOMATION_PROJECT} -- app send --app ${UIAUTOMATION_APP} --text <prompt>`
  };
}

async function importExternalGenerationIfReady(levelId, status) {
  const newest = await findNewestExternalImage();
  if (!newest) return null;

  const previous = Number(status.previousExternalImageMtimeMs ?? 0);
  if (newest.mtimeMs <= previous + 1) return null;
  if (newest.size <= 0 || Date.now() - newest.mtimeMs < 1200) return null;

  const historyDir = getBackgroundHistoryDir(levelId);
  await fsp.mkdir(historyDir, { recursive: true });

  const ext = path.extname(newest.path).toLowerCase() || '.png';
  const revision = String(Math.round(newest.mtimeMs));
  const historyName = `${revision}-background${ext}`;
  const historyPath = path.join(historyDir, historyName);
  const currentPath = path.join(GENERATED_DIR, levelId, 'current.png');

  await fsp.copyFile(newest.path, historyPath);
  await fsp.copyFile(newest.path, currentPath);
  await cleanupExternalOutput();
  const currentStat = await fsp.stat(currentPath);

  return {
    sourceImagePath: newest.path,
    importedImagePath: historyPath,
    imageMtimeMs: currentStat.mtimeMs,
    imageLastWriteTime: currentStat.mtime.toISOString()
  };
}

async function findNewestExternalImage() {
  const entries = await fsp.readdir(UIAUTOMATION_OUTPUT_DIR, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map(async (entry) => {
      const filePath = path.join(UIAUTOMATION_OUTPUT_DIR, entry.name);
      const stat = await fsp.stat(filePath).catch(() => null);
      return stat ? { path: filePath, name: entry.name, size: stat.size, mtimeMs: stat.mtimeMs, lastWriteTime: stat.mtime.toISOString() } : null;
    }));

  return files
    .filter(Boolean)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0] ?? null;
}

async function cleanupExternalOutput(exceptPaths = []) {
  const keep = new Set(exceptPaths.map((item) => path.normalize(item).toLowerCase()));
  const entries = await fsp.readdir(UIAUTOMATION_OUTPUT_DIR, { withFileTypes: true }).catch(() => []);
  await Promise.all(entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const filePath = path.join(UIAUTOMATION_OUTPUT_DIR, entry.name);
      if (keep.has(path.normalize(filePath).toLowerCase())) return Promise.resolve();
      return fsp.rm(filePath, { force: true }).catch(() => {});
    }));
}

async function listBackgroundHistory(levelId) {
  const historyDir = getBackgroundHistoryDir(levelId);
  const entries = await fsp.readdir(historyDir, { withFileTypes: true }).catch(() => []);
  const items = await Promise.all(entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map(async (entry) => {
      const filePath = path.join(historyDir, entry.name);
      const stat = await fsp.stat(filePath).catch(() => null);
      if (!stat) return null;
      return {
        fileName: entry.name,
        imagePath: filePath,
        imageUrl: `/assets/generated/${levelId}/backgrounds/${entry.name}`,
        mtimeMs: stat.mtimeMs,
        lastWriteTime: stat.mtime.toISOString()
      };
    }));

  return items
    .filter(Boolean)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function getBackgroundHistoryDir(levelId) {
  return path.join(GENERATED_DIR, levelId, 'backgrounds');
}

function readPlanPhase(planJson) {
  try {
    const parsed = JSON.parse(planJson);
    return String(parsed?.plan?.phase || 'generation');
  } catch {
    return 'generation';
  }
}

async function readAutomationStatus(levelId) {
  const statusPath = getAutomationStatusPath(levelId);
  const content = await fsp.readFile(statusPath, 'utf8').catch(() => null);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getAutomationStatusPath(levelId) {
  return path.join(REQUESTS_DIR, levelId, 'automation-status.json');
}

async function cleanupRequests(levelId) {
  const levelRequestsDir = path.join(REQUESTS_DIR, levelId);
  const entries = await fsp.readdir(levelRequestsDir).catch(() => []);
  await Promise.all(
    entries
      .filter((name) =>
        (name.startsWith('image-brief-') && name.endsWith('.md')) ||
        (name.startsWith('structured-plan-') && name.endsWith('.json')) ||
        (name.startsWith('generation-request-') && name.endsWith('.md'))
      )
      .map((name) => fsp.rm(path.join(levelRequestsDir, name), { force: true }))
  );
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'level';
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const rawPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const requested = path.normalize(path.join(ROOT, rawPath));

  if (!requested.startsWith(ROOT)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  let stat;
  try {
    stat = await fsp.stat(requested);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (stat.isDirectory()) {
    sendJson(res, 403, { error: 'Directory listing disabled' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME[path.extname(requested).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(requested).pipe(res);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

server.listen(PORT, HOST, () => {
  console.log(`2DLevelCreationStudio running at http://${HOST}:${PORT}/`);
});
