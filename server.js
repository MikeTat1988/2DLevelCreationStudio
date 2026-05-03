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
    imageLastWriteTime: imageStat.mtime.toISOString()
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
