const { execFile } = require('child_process');

/**
 * Notices when a meeting is actually in progress so the Calls tab can offer to
 * record it. It only ever nudges — nothing here starts a recording.
 *
 * Windows only. Detection reads window titles, because the process alone is
 * useless: Zoom sits in the tray all day and Slack is always running. The title
 * is what separates "the app is open" from "you are in a call". macOS would need
 * Accessibility or Screen Recording consent to read window titles, which is a
 * disproportionate ask for a banner, so it stays calendar-driven there.
 */

const POLL_VISIBLE_MS = 8000;
const POLL_HIDDEN_MS = 30000;
/** A detection has to survive two consecutive polls before it surfaces — window
 *  titles flicker while a meeting UI is still setting itself up. */
const CONFIRMATIONS_REQUIRED = 2;
const DISMISS_TTL_MS = 30 * 60 * 1000;

const PS_COMMAND =
  'Get-Process | Where-Object MainWindowTitle -ne "" | Select-Object ProcessName,MainWindowTitle | ConvertTo-Json -Compress';

const MATCHERS = [
  {
    app: 'zoom',
    label: 'Zoom',
    // The idle client's window is "Zoom" / "Zoom Workplace"; only an actual
    // meeting is titled "Zoom Meeting". This single distinction is what stops
    // the tray icon from producing a nudge every time the app is running.
    test: (proc, title) => /^zoom$/i.test(proc) && /^zoom meeting/i.test(title),
  },
  {
    app: 'microsoft_teams',
    label: 'Microsoft Teams',
    test: (proc, title) => /^ms-teams$|^teams$/i.test(proc) && /\|\s*Microsoft Teams$/i.test(title) && !/^Chat \|/i.test(title),
  },
  {
    app: 'google_meet',
    label: 'Google Meet',
    // Browsers put the ACTIVE tab's title in the window title, so a Meet call in
    // a background tab is invisible here. Accepted limitation — the alternative
    // is a browser extension.
    test: (proc, title) => /^(chrome|msedge|firefox|brave|opera)$/i.test(proc) && /Google Meet|^Meet\b|^Meet\s[-–—]/i.test(title),
  },
  {
    app: 'slack',
    label: 'Slack',
    // NOTE: Slack's huddle window title is not as stable as the other three and
    // varies by version. Verify against a real huddle before trusting it.
    test: (proc, title) => /^slack$/i.test(proc) && /huddle/i.test(title),
  },
];

function listWindows() {
  return new Promise((resolve) => {
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', PS_COMMAND],
      { windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const parsed = JSON.parse(stdout);
          // ConvertTo-Json emits a bare object rather than an array when exactly
          // one process matches.
          resolve(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

function detect(windows) {
  for (const win of windows) {
    const proc = String(win?.ProcessName ?? '');
    const title = String(win?.MainWindowTitle ?? '');
    if (!proc || !title) continue;
    for (const matcher of MATCHERS) {
      if (matcher.test(proc, title)) return { app: matcher.app, label: matcher.label, title };
    }
  }
  return null;
}

class MeetingDetector {
  constructor(onDetected) {
    this.onDetected = onDetected;
    this.enabled = false;
    this.panelVisible = false;
    this.timer = null;
    this.pending = null;
    this.confirmations = 0;
    this.announced = null;
    this.dismissed = new Map();
    this.suspended = false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.schedule();
    else this.stop();
  }

  setPanelVisible(visible) {
    this.panelVisible = visible;
    if (this.enabled) this.schedule();
  }

  /** Called while a call is already running — there is nothing useful to suggest
   *  to someone who is already recording. */
  setSuspended(suspended) {
    this.suspended = suspended;
  }

  dismiss(key) {
    if (key) this.dismissed.set(key, Date.now() + DISMISS_TTL_MS);
    this.announced = null;
  }

  getState() {
    return { enabled: this.enabled, supported: process.platform === 'win32', current: this.announced };
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    this.confirmations = 0;
  }

  schedule() {
    if (this.timer) clearTimeout(this.timer);
    if (!this.enabled || process.platform !== 'win32') return;
    this.timer = setTimeout(() => void this.tick(), this.panelVisible ? POLL_VISIBLE_MS : POLL_HIDDEN_MS);
  }

  async tick() {
    if (!this.enabled) return;
    if (this.suspended) {
      this.schedule();
      return;
    }

    const found = detect(await listWindows());
    const key = found ? `${found.app}:${found.title}` : null;

    if (!found) {
      this.pending = null;
      this.confirmations = 0;
      this.announced = null;
      this.schedule();
      return;
    }

    const dismissedUntil = this.dismissed.get(key);
    if (dismissedUntil && dismissedUntil > Date.now()) {
      this.schedule();
      return;
    }
    if (dismissedUntil) this.dismissed.delete(key);

    this.confirmations = this.pending === key ? this.confirmations + 1 : 1;
    this.pending = key;

    // Only fires on transition — a meeting that is still running must not
    // re-nudge on every poll.
    if (this.confirmations >= CONFIRMATIONS_REQUIRED && this.announced !== key) {
      this.announced = key;
      this.onDetected({ app: found.app, label: found.label, key });
    }
    this.schedule();
  }
}

module.exports = { MeetingDetector };
