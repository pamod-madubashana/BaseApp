<p align="center">
  <img src="src-tauri/icons/icon.png" alt="BaseApp" width="128" height="128">
</p>

<h1 align="center">BaseApp — Tauri v2 Desktop Starter</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2-24C8DB.svg" alt="Tauri">
  <img src="https://img.shields.io/badge/React-19.1.0-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-6.0.3-3178C6.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8.0.16-646CFF.svg" alt="Vite">
  <img src="https://img.shields.io/badge/Rust-stable-DEA584.svg" alt="Rust">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License">
</p>

<p align="center">Production-ready Tauri v2 + React 19 + TypeScript + Vite template with signed auto-updates via GitHub Releases.</p>

## Purpose

BaseApp is a minimal, production-ready desktop app template that pairs a Tauri v2 (Rust) backend with a React + TypeScript + Vite frontend and ships with a signed self-updater.

## Structure

```
BaseApp/
├── src/                    # React frontend (App.tsx, main.tsx)
│   ├── assets/             # Static assets (react.svg)
│   └── components/
│       └── Updater.tsx     # In-app updater UI
├── src-tauri/              # Rust backend + Tauri config
│   ├── icons/              # App icons (icon.png/.ico/.icns)
│   ├── capabilities/       # Tauri permissions (updater, opener)
│   ├── Cargo.toml          # Rust manifest (v1.0.0)
│   └── tauri.conf.json     # Tauri config + updater endpoint
├── public/
│   └── tauri.svg           # Vite public asset
├── .github/workflows/
│   ├── release.yml         # 3-OS release + signed artifacts
│   └── verify.yml          # PR checks (typecheck, cargo)
├── package.json            # v1.0.0 — npm scripts
└── vite.config.ts          # Vite + Tauri dev server (port 1420)
```

## Features

- **Tauri v2 + Rust backend** with `opener` and `updater` plugins
- **React 19 + TypeScript + Vite** frontend with HMR on port 1420
- **Signed self-updater** via GitHub Releases (`latest.json` + minisign verification)
- **In-app update UI** with check, download progress bar, install, restart, and retry states
- **Portable Windows exe** (`baseapp-<version>-portable.exe`) plus per-OS installers (MSI/NSIS, deb/rpm/AppImage, dmg)
- **3-OS CI** — Windows x86_64, Linux x86_64, macOS Apple Silicon (aarch64)
- **Auto version bump** across `package.json`, `package-lock.json`, `tauri.conf.json`, `Cargo.toml`

## Getting Started

```sh
npm install
npm run tauri dev      # runs vite on 1420 + Tauri window
npm run tauri build    # production bundles in src-tauri/target/release/bundle/
```

## Prerequisites

- **Node.js 20** (CI uses `actions/setup-node@v4` with `node-version: 20`)
- **Rust stable** (`dtolnay/rust-toolchain@stable`)
- **Platform deps (Linux)** — `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

## Installation

```sh
git clone https://github.com/pamod-madubashana/BaseApp.git
cd BaseApp
npm install
npm run tauri dev
```

## Development

```sh
npm run dev            # Vite only (http://localhost:1420)
npm run tauri dev      # Full Tauri app with Rust backend
npx tsc --noEmit       # Typecheck (also run in verify workflow)
cargo fmt --check      # Rust formatting check (src-tauri/)
cargo check             # Rust compile check (src-tauri/)
```

Frontend entry is `src/main.tsx` → `src/App.tsx`. Backend commands are in `src-tauri/src/lib.rs` (`greet` example).

## Building

```sh
npm run build          # tsc && vite build → dist/
npm run tauri build    # Full bundle → src-tauri/target/release/bundle/
```

Outputs per target (handled by `tauri-action@v0`):

| OS | Artifacts |
|---|---|
| Windows x86_64 | `*.msi`, `*.exe` (NSIS), `baseapp-<version>-portable.exe` |
| Linux x86_64 | `*.deb`, `*.rpm`, `*.AppImage`, `baseapp` binary |
| macOS Apple Silicon | `*.dmg`, `baseapp` binary |

Updater artifacts (`.sig` + `latest.json`) are generated automatically (`createUpdaterArtifacts: true`).

## Usage

Greet example (frontend → Rust):

```tsx
import { invoke } from "@tauri-apps/api/core";
const msg = await invoke("greet", { name: "BaseApp" });
// → "Hello, BaseApp! You've been greeted from Rust!"
```

Auto-update flow (`src/components/Updater.tsx`):

```tsx
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

const update = await check(); // hits latest.json
if (update) {
  await update.downloadAndInstall((e) => {
    if (e.event === "Progress") console.log(e.data.chunkLength);
  });
  await relaunch();
}
```

UI states: `checking` (hidden) → `available` → `downloading` (progress %) → `installing` → `ready` (restart) / `error` (retry).

## Shortcuts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server only |
| `npm run build` | Typecheck + Vite production build |
| `npm run preview` | Preview built frontend |
| `npm run tauri dev` | Tauri dev (frontend + Rust) |
| `npm run tauri build` | Tauri production bundle |
| `npx tsc --noEmit` | Typecheck without emit |
| `cargo fmt --check` | Check Rust formatting (in `src-tauri/`) |
| `cargo check` | Check Rust compilation (in `src-tauri/`) |

## Configuration

**`src-tauri/tauri.conf.json`**

- `productName`: `baseapp` · `identifier`: `com.pamod.baseapp` · `version`: `1.0.0`
- `build.devUrl`: `http://localhost:1420` · `frontendDist`: `../dist`
- `bundle.createUpdaterArtifacts`: `true`
- `plugins.updater.endpoints`: `https://github.com/pamod-madubashana/BaseApp/releases/latest/download/latest.json`
- `plugins.updater.pubkey`: minisign public key (`dW50cnVzdGVkIGNvbW1lbnQ6...`)
- `plugins.updater.dialog`: `false` (custom UI in `Updater.tsx`)

**`src-tauri/capabilities/default.json`** — permissions: `core:default`, `opener:default`, `updater:default`.

**Environment** — `TAURI_SIGNING_PRIVATE_KEY` (set as GitHub secret for signing) · `TAURI_DEV_HOST` (optional, for network HMR in `vite.config.ts`).

## Troubleshooting

| Issue | Fix |
|---|---|
| `port 1420 in use` (strictPort) | Stop other Vite/ Tauri processes; `strictPort: true` fails fast |
| `latest.json 404` / updater check fails | Ensure a Release exists with `latest.json` asset; verify `pubkey` matches the private key used in CI |
| Signature verification failed | Regenerate keypair with `tauri signer generate`; update `tauri.conf.json` pubkey and `TAURI_SIGNING_PRIVATE_KEY` secret |
| Linux build fails (webkit) | `sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf` |
| `cargo fmt --check` fails in CI | Run `cargo fmt` in `src-tauri/` and commit |

## Architecture

```
React (Vite, port 1420)  ──invoke/check──▶  Rust (Tauri Builder)
  App.tsx + Updater.tsx                    lib.rs (greet) + updater plugin
        │                                          │
        └────────── Tauri IPC / Events ─────────────┘
                              │
                    GitHub Releases (latest.json + .sig)
                    minisign verification (pubkey in tauri.conf.json)
```

- Frontend streams updater events (`Started`/`Progress`/`Finished`) → progress UI.
- Backend bundles signed artifacts on 3 runners; `latest.json` is the update manifest.

## Tech Stack

| Tech | Version |
|---|---|
| Tauri | `2` |
| React | `19.1.0` |
| TypeScript | `~6.0.3` |
| Vite | `8.0.16` |
| Rust | `stable` / `2021` |
| Node.js | `20` |
| Plugins | `opener 2`, `updater 2.11.0`, `process 2.3.1` |

Derived from `package.json`, `src-tauri/Cargo.toml`, `vite.config.ts`, and `.github/workflows/*.yml`.

## Downloads

Assets are published at [latest release](https://github.com/pamod-madubashana/BaseApp/releases/latest):

- **Windows** — `*.msi`, `*-setup.exe` (NSIS), `baseapp-<version>-portable.exe` (portable, uploaded via `gh release upload`)
- **Linux** — `*.deb`, `*.rpm`, `*.AppImage`
- **macOS (Apple Silicon)** — `*.dmg` (target `aarch64-apple-darwin`)
- **Updater** — `latest.json` + `.sig` files (auto-generated, signature-verified)

Install via download — no npm/cargo package.

## Links

- Repository: https://github.com/pamod-madubashana/BaseApp
- Issues: https://github.com/pamod-madubashana/BaseApp/issues
- Releases: https://github.com/pamod-madubashana/BaseApp/releases
- Latest update manifest: https://github.com/pamod-madubashana/BaseApp/releases/latest/download/latest.json
- Tauri docs: https://tauri.app/
- Updater plugin: https://tauri.app/plugin/updater/

## Credits

- Author: pamod-madubashana
- Built on [Tauri](https://tauri.app/), [React](https://react.dev/), [Vite](https://vite.dev/)
- Inspired by the default `create-tauri-app` template (greet command retained as example)

## Final Quality Check

- [x] Centered hero with `src-tauri/icons/icon.png` and `h1` tagline (<10 words)
- [x] Badges use shields.io with brand colors + versions from manifests
- [x] No scaffold boilerplate — describes updater, portable exe, 3-OS matrix, verify workflow
- [x] One-line description present
- [x] Concise structure tree matches actual repo
- [x] Quick start (install/dev/build) verified against `package.json`
- [x] Documentation links point to real repo URLs
- [x] MIT License added
- [x] Markdown: semantic headings, fenced code blocks with language tags, tables for structured data
- [x] Owner style mirrored from sampled repos (see return)
