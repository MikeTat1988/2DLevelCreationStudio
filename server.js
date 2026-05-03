const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

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
  const markdown = String(body.markdown || '').trim();
  const levelId = safeName(String(body.levelId || 'level'));
  if (!markdown) {
    sendJson(res, 400, { error: 'Missing markdown.' });
    return;
  }

  await fsp.mkdir(REQUESTS_DIR, { recursive: true });
  await fsp.mkdir(RESULTS_DIR, { recursive: true });
  const revision = Date.now();
  const filename = `${levelId}-generation-request-${revision}.md`;
  const currentFilename = `${levelId}-generation-request-current.md`;
  const filePath = path.join(REQUESTS_DIR, filename);
  const currentPath = path.join(REQUESTS_DIR, currentFilename);

  await cleanupRequests(levelId);
  await fsp.writeFile(filePath, markdown, 'utf8');
  await fsp.writeFile(currentPath, markdown, 'utf8');

  sendJson(res, 200, {
    requestPath: filePath,
    currentRequestPath: currentPath,
    revision,
    saved: filename
  });
}

async function handleReadCurrentGenerationRequest(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const levelId = safeName(url.searchParams.get('levelId') || 'level');
  const currentPath = path.join(REQUESTS_DIR, `${levelId}-generation-request-current.md`);

  try {
    const markdown = await fsp.readFile(currentPath, 'utf8');
    sendJson(res, 200, {
      levelId,
      path: currentPath,
      markdown
    });
  } catch {
    sendJson(res, 404, {
      error: `No current generation request found for ${levelId}.`
    });
  }
}

async function cleanupRequests(levelId) {
  const entries = await fsp.readdir(REQUESTS_DIR).catch(() => []);
  await Promise.all(
    entries
      .filter((name) => name.startsWith(`${levelId}-generation-request-`) && name.endsWith('.md'))
      .map((name) => fsp.rm(path.join(REQUESTS_DIR, name), { force: true }))
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
