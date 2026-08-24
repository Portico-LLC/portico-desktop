# Portico Desktop

The desktop build of [Portico](https://github.com/Portico-LLC) — an Electron shell around
the Portico client-portal app, packaged for Windows and macOS.

## Download

| Platform | |
| --- | --- |
| Windows 10/11 (64-bit) | [Portico-Setup.exe](https://github.com/Portico-LLC/portico-desktop/releases/latest/download/Portico-Setup.exe) |
| macOS 12+ (Apple Silicon) | [Portico-arm64.dmg](https://github.com/Portico-LLC/portico-desktop/releases/latest/download/Portico-arm64.dmg) |

### First launch on macOS

This build is not notarized (Apple charges $99/yr for the Developer ID that removes this
step). If macOS reports the app as damaged, clear the quarantine attribute once:

```bash
xattr -cr /Applications/Portico.app
```

## This repo is generated — do not hand-edit `src/`

The Electron app is not a thin browser window pointed at a URL. `electron/main.cjs`
registers a privileged `app://` scheme and serves the packaged Vite build from it, so this
repo needs the renderer source in order to build at all.

That source is **mirrored** from `clientportalos/portico-frontend`, which remains the single
source of truth. Edits made directly to `src/`, `public/`, `index.html` or the tsconfigs here
will be overwritten on the next sync. Change them upstream, then:

```bash
cd clientportalos/portico-frontend
npm run sync:desktop
```

Hand-owned in this repo, and never touched by the sync: `package.json` (version, scripts,
electron-builder config), `.gitignore`, `README.md`, `.github/`.

## Local development

```bash
npm install
npm run dev          # vite + electron with live reload
npm run build:win    # -> release/Portico-Setup.exe
npm run build:mac    # -> release/Portico-arm64.dmg  (must run on macOS)
npm run typecheck    # tsc -b
```

`build:win` and `build:mac` do not typecheck — that runs upstream in `portico-frontend`,
where `noUnusedLocals` is enforced. Keeping it out of the packaging path means a stray unused
variable can't block a release build.

## Releases

Every push to `main` runs two builders in parallel (`windows-latest`, `macos-14`) and
publishes both installers to the release matching `package.json`'s `version`.

Re-pushing the same version **replaces** that release's binaries. To cut a new release,
bump `version` in `package.json` and push.

Asset filenames are intentionally version-less so that
`/releases/latest/download/Portico-Setup.exe` stays a permanently valid URL for the
marketing site to link to.

## Configuration

`.env.electron` holds the API the packaged app talks to. It is committed on purpose and
explicitly un-ignored in `.gitignore` — without it, builds ship pointing at `localhost:3000`.
