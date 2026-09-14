#!/usr/bin/env node
/**
 * Downloads the pinned Windows build of gosom/google-maps-scraper (MIT-licensed,
 * github.com/gosom/google-maps-scraper) into resources/, so electron-builder can
 * bundle it into the Windows installer via "build.win.extraResources". Skips the
 * download if the file is already present — safe to run on every build.
 *
 * Bump SCRAPER_VERSION by hand to pick up a new upstream release.
 */
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { get } from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRAPER_VERSION = '1.18.0';
const ASSET_NAME = `google_maps_scraper-${SCRAPER_VERSION}-windows-amd64.exe`;
const DOWNLOAD_URL = `https://github.com/gosom/google-maps-scraper/releases/download/v${SCRAPER_VERSION}/${ASSET_NAME}`;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST_DIR = path.join(ROOT, 'resources');
const DEST_PATH = path.join(DEST_DIR, 'google-maps-scraper.exe');

// GitHub release asset links always 302 to an objects.githubusercontent.com URL —
// https.get() does not follow redirects on its own.
function download(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const request = get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectsLeft <= 0) {
          reject(new Error('Too many redirects while downloading the scraper binary.'));
          return;
        }
        res.resume();
        download(res.headers.location, destPath, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode} for ${url}`));
        return;
      }
      const file = createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    });
    request.on('error', reject);
  });
}

async function main() {
  if (existsSync(DEST_PATH)) {
    console.log(`google-maps-scraper.exe already present at ${DEST_PATH} — skipping download.`);
    return;
  }

  mkdirSync(DEST_DIR, { recursive: true });
  console.log(`Downloading ${ASSET_NAME} from GitHub Releases...`);
  console.log(DOWNLOAD_URL);

  try {
    await download(DOWNLOAD_URL, DEST_PATH);
  } catch (err) {
    try {
      unlinkSync(DEST_PATH);
    } catch {
      // Nothing to clean up.
    }
    console.error(`\nFailed to fetch the google-maps-scraper binary: ${err.message}`);
    console.error('The Leads feature will be unavailable in this build unless this is resolved.');
    process.exitCode = 1;
    return;
  }

  console.log(`Saved to ${DEST_PATH}`);
}

main();
