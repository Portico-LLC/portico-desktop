/**
 * Where the desktop builds live.
 *
 * The release assets are named without a version on purpose (see
 * portico-desktop/package.json `build.win.artifactName` / `build.mac.artifactName`),
 * which is what lets GitHub's `/releases/latest/download/` redirect act as a
 * permanent URL — the marketing site never has to be redeployed to point at a
 * newer build.
 */
export const DESKTOP_REPO = 'Portico-LLC/portico-desktop';

const RELEASE_BASE = `https://github.com/${DESKTOP_REPO}/releases`;

export const LATEST_RELEASE_API = `https://api.github.com/repos/${DESKTOP_REPO}/releases/latest`;

export type PlatformId = 'windows' | 'macos' | 'linux';

export interface PlatformDownload {
  id: PlatformId;
  /** Shown on the switch. */
  label: string;
  /** The exact asset name in the release — also the key for the size lookup. */
  asset: string;
  url: string;
  /** The line under the button: format, OS floor, architecture. */
  meta: string;
  /** A second installer format for the same OS (Linux ships both .deb and .rpm). */
  altFormat?: { label: string; asset: string; url: string };
}

export const DOWNLOADS: Record<PlatformId, PlatformDownload> = {
  windows: {
    id: 'windows',
    label: 'Windows',
    asset: 'Portico-Setup.exe',
    url: `${RELEASE_BASE}/latest/download/Portico-Setup.exe`,
    meta: '.exe installer · Windows 10 & 11 · 64-bit',
  },
  macos: {
    id: 'macos',
    label: 'macOS',
    asset: 'Portico-arm64.dmg',
    url: `${RELEASE_BASE}/latest/download/Portico-arm64.dmg`,
    meta: '.dmg · macOS 12 Monterey or later · Apple Silicon',
  },
  linux: {
    id: 'linux',
    label: 'Linux',
    asset: 'Portico.deb',
    url: `${RELEASE_BASE}/latest/download/Portico.deb`,
    meta: '.deb installer · Debian & Ubuntu · 64-bit',
    altFormat: {
      label: 'Fedora / RHEL',
      asset: 'Portico.rpm',
      url: `${RELEASE_BASE}/latest/download/Portico.rpm`,
    },
  },
};

export const PLATFORM_ORDER: PlatformId[] = ['windows', 'macos', 'linux'];

/** All releases, for the "every version" link under the fold. */
export const ALL_RELEASES_URL = RELEASE_BASE;

/**
 * Best guess at the visitor's OS, so a Mac or Linux user doesn't have to click
 * the switch before seeing the right download. `userAgentData.platform` is the
 * modern signal; the userAgent string is the fallback that still works in
 * Safari and Firefox, neither of which implement it.
 */
export function detectPlatform(): PlatformId {
  if (typeof navigator === 'undefined') return 'windows';

  const hinted = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData?.platform;
  const source = hinted || navigator.userAgent || '';

  if (/mac|darwin|iphone|ipad|ipod/i.test(source)) return 'macos';
  // Android's UA also contains "Linux" (it's Linux-kernel-based) — exclude it
  // explicitly so a phone visitor isn't offered a desktop .deb/.rpm.
  if (/linux/i.test(source) && !/android/i.test(source)) return 'linux';
  return 'windows';
}

/** GitHub reports asset sizes in bytes; the page wants "112 MB". */
export function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}
