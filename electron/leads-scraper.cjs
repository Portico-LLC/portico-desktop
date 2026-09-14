const { app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Manages a local, bundled copy of gosom/google-maps-scraper (MIT-licensed,
 * github.com/gosom/google-maps-scraper) running in `-web` mode, so the Leads
 * feature can pull business leads straight out of Google Maps with no paid API
 * and no cloud dependency — it drives a real headless Chromium browser against
 * the Maps UI, never the paid Places API.
 *
 * Windows only for now: upstream ships no arm64 macOS binary, and the binary is
 * only bundled into the Windows build (see portico-desktop/package.json's
 * "build.win.extraResources", populated by scripts/fetch-scraper-binary.mjs).
 *
 * The scraper's local `-web` server sets no CORS headers, so the renderer (which
 * runs under the privileged `app://` origin) cannot call it directly — every
 * function here runs in the main process and is proxied to the renderer over IPC
 * in main.cjs.
 */

const PORT = 8034;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const READY_POLL_INTERVAL_MS = 300;
const READY_POLL_TIMEOUT_MS = 15000;
const INSTALLED_MARKER_NAME = 'scraper-playwright-installed';
const BINARY_NAME = 'google-maps-scraper.exe';

let child = null;
let ready = false;

function resolveBinaryPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, BINARY_NAME);
  // Dev: portico-desktop/resources/, populated once by `node scripts/fetch-scraper-binary.mjs`.
  return path.join(__dirname, '..', 'resources', BINARY_NAME);
}

function isAvailable() {
  if (process.platform !== 'win32') {
    return { available: false, reason: 'unsupported-platform' };
  }
  if (!fs.existsSync(resolveBinaryPath())) {
    return { available: false, reason: 'binary-missing' };
  }
  return { available: true, reason: null };
}

function installedMarkerPath() {
  return path.join(app.getPath('userData'), INSTALLED_MARKER_NAME);
}

function isPlaywrightInstalled() {
  try {
    return fs.existsSync(installedMarkerPath());
  } catch {
    return false;
  }
}

function runPlaywrightInstall(onChunk) {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveBinaryPath(), [], {
      windowsHide: true,
      env: { ...process.env, PLAYWRIGHT_INSTALL_ONLY: '1' },
    });
    proc.stdout?.on('data', (chunk) => onChunk?.(chunk.toString()));
    proc.stderr?.on('data', (chunk) => onChunk?.(chunk.toString()));
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Playwright install exited with code ${code}`));
        return;
      }
      try {
        fs.writeFileSync(installedMarkerPath(), new Date().toISOString());
      } catch {
        // Non-critical — worst case the (idempotent) install just runs again next time.
      }
      resolve();
    });
  });
}

function dataFolder() {
  return path.join(app.getPath('userData'), 'scraper-data');
}

function spawnServer() {
  if (child) return;
  fs.mkdirSync(dataFolder(), { recursive: true });
  child = spawn(resolveBinaryPath(), ['-web', '-addr', `:${PORT}`, '-data-folder', dataFolder()], {
    windowsHide: true,
    env: { ...process.env, DISABLE_TELEMETRY: '1' },
  });
  ready = false;
  const onDown = () => {
    child = null;
    ready = false;
  };
  child.on('exit', onDown);
  child.on('error', onDown);
}

async function waitUntilReady() {
  const start = Date.now();
  while (Date.now() - start < READY_POLL_TIMEOUT_MS) {
    try {
      // Listing jobs doubles as the health check — this mode has no dedicated
      // health endpoint (that only exists in the separate, unrelated SaaS edition).
      const res = await fetch(`${BASE_URL}/api/v1/jobs`);
      if (res.ok) {
        ready = true;
        return true;
      }
    } catch {
      // Server not up yet — keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
  }
  return false;
}

/**
 * Full startup sequence: verify the bundled binary exists, install the
 * Playwright browser once (~300MB, cached via a marker file in userData), spawn
 * the local `-web` server, and wait for it to answer. Idempotent — a no-op once
 * already ready, safe to call before every search.
 */
async function ensureReady(onProgress) {
  const availability = isAvailable();
  if (!availability.available) return { ok: false, reason: availability.reason };

  if (!isPlaywrightInstalled()) {
    onProgress?.({ phase: 'installing' });
    try {
      await runPlaywrightInstall((chunk) => onProgress?.({ phase: 'installing', chunk }));
    } catch (err) {
      return { ok: false, reason: 'install-failed', message: String(err?.message || err) };
    }
  }

  if (!ready) {
    onProgress?.({ phase: 'starting' });
    spawnServer();
    const becameReady = await waitUntilReady();
    if (!becameReady) return { ok: false, reason: 'start-timeout' };
  }

  onProgress?.({ phase: 'ready' });
  return { ok: true, baseUrl: BASE_URL };
}

async function createJob(jobData) {
  const res = await fetch(`${BASE_URL}/api/v1/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });
  if (!res.ok) throw new Error(`Failed to create job: ${res.status}`);
  return res.json();
}

async function listJobs() {
  const res = await fetch(`${BASE_URL}/api/v1/jobs`);
  if (!res.ok) throw new Error(`Failed to list jobs: ${res.status}`);
  return res.json();
}

async function getJob(id) {
  const res = await fetch(`${BASE_URL}/api/v1/jobs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to get job: ${res.status}`);
  return res.json();
}

async function deleteJob(id) {
  const res = await fetch(`${BASE_URL}/api/v1/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete job: ${res.status}`);
  return true;
}

/**
 * RFC4180-ish CSV parser (quoted fields, embedded commas/newlines, doubled-quote
 * escapes). The scraper's column set is fixed/documented upstream, so a real
 * dependency isn't worth the packaging risk — see the plan's Stage A notes on
 * electron-builder's non-default `files` list.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // Trailing field/row — the file may or may not end with a newline.
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) return [];
  const [headers, ...dataRows] = rows;
  return dataRows
    .filter((r) => r.length === headers.length && r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(headers.map((h, idx) => [h, r[idx]])));
}

async function downloadAndParseJob(id) {
  const res = await fetch(`${BASE_URL}/api/v1/jobs/${encodeURIComponent(id)}/download`);
  if (!res.ok) throw new Error(`Failed to download job results: ${res.status}`);
  const text = await res.text();
  return parseCsv(text);
}

function killServer() {
  if (child) {
    try {
      child.kill();
    } catch {
      // Already gone.
    }
    child = null;
    ready = false;
  }
}

module.exports = {
  isAvailable,
  ensureReady,
  createJob,
  listJobs,
  getJob,
  deleteJob,
  downloadAndParseJob,
  killServer,
};
