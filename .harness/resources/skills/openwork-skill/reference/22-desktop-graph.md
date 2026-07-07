# 22 — Desktop Code Graph (`apps/desktop`)

> The Electron 35 shell. Native, OS-specific, `.mjs`. Verified at HEAD `49d3f9ec`.
> Change recipes: `17-change-recipes.md` §D. IPC trace: `18-data-flows.md` Flow E.

## Entry & build

| File | Role |
|---|---|
| `electron/main.mjs` | **Primary entry** — window, IPC handler registry (`desktopCommandHandlers`, ~80 commands), runtime bootstrap, migration, updater, browser panel, PTY. |
| `electron/preload.mjs` | Context-isolated bridge — exposes `window.__OPENWORK_ELECTRON__.invokeDesktop()` etc. |
| `electron-builder.yml` | Packaging: dmg/nsis/AppImage targets, sidecars (`opencode`, `openwork-orchestrator`) in `extraResources`, macOS entitlements, `asarUnpack` for native `.node`. |
| `scripts/electron-build.mjs` | Pre-package: prepare sidecars + computer-use helper, build `apps/server` TS, build `apps/app` with `OPENWORK_ELECTRON_BUILD=1` (relative asset paths). |
| `scripts/electron-dev.mjs` | Dev: start Vite, wait, spawn Electron. |
| `build/entitlements.mac.plist` | macOS TCC perms (mic, screen recording, accessibility). |

## electron/ modules

| File | Responsibility |
|---|---|
| `runtime.mjs` | `createRuntimeManager()` — direct `opencode serve` vs orchestrator mode; port alloc, health, arch resolution (`isMacRunningUnderRosetta`). |
| `workspace-store.mjs` | Workspace list + per-workspace `openwork.json` (better-sqlite3 + drizzle); local↔remote sync. |
| `workspace-archive.mjs`, `remote-workspace.mjs` | Config export/import; remote workspace discovery. |
| `updater.mjs` | electron-updater; stable/alpha channels, GitHub feed. |
| `migration.mjs` | Tauri→Electron one-way state handoff (reads legacy snapshot). |
| `browser-panel.mjs` | Embedded browser (WebContentsView), CDP proxy. |
| `app-menu.mjs` | Native menu; forwards to renderer. |
| `ui-control-server.mjs` | Loopback HTTP control server (`/snapshot`,`/actions`,`/execute`) → `window.__openworkControl`; token auth; writes discovery file for `openwork-ui-mcp`. |
| `computer-use.mjs`, `media-permissions.mjs` | macOS ComputerUse helper resolution; A/V perms. |

## IPC contract (the load-bearing edge)

```text
apps/app  src/app/lib/desktop.ts (desktopBridge Proxy)
  → preload.mjs  window.__OPENWORK_ELECTRON__.invokeDesktop(cmd, ...args)
  ⇒ ipcRenderer.invoke("openwork:desktop", cmd, ...args)
  → main.mjs  desktopCommandHandlers[cmd]
CONTRACT: packages/types/src/desktop-ipc.ts  (DesktopCommandMap)
GUARD:    apps/desktop/scripts/check-electron-bridge.mjs  +  pnpm typecheck:electron
```
Other IPC channels: `openwork:terminal:*` (node-pty), `openwork:native-menu:*`, `openwork:deep-link-native`, `openwork:migration:*`, `openwork:shell:*`, `openwork:system:*`.

## Runtime modes

| | Direct | Orchestrator |
|---|---|---|
| Spawns | `opencode serve --port <free>` | `openwork-orchestrator` daemon |
| Chosen in | `main.mjs bootRuntimeForSelectedWorkspace` → `runtime.mjs engineStart({runtime:"direct"})` | fallback / explicit; `orchestratorWorkspaceActivate()` |
| Dev flag | `OPENWORK_DEV_MODE=1` (isolated state, looser watches) | same |

## Platform-issue surface

- **macOS Intel node-pty crash** → `runtime.mjs` (Rosetta/arch detect) + `scripts/prepare-sidecar.mjs` + `electron-builder.yml asarUnpack`.
- **Linux .deb/.rpm** → `electron-builder.yml linux.target` (+ sidecars in `extraResources`).
- **Windows** → `main.mjs` shell default, `electron-builder.yml win nsis`.
- **Deep-link race** → `main.mjs queueDeepLinks/flushPendingDeepLinks` + `apps/app/.../startup-deep-links.ts`.

## Cross-boundary

Loads `apps/app` (dev server or packaged `app-dist`); implements `@openwork/types` desktop-ipc; bundles `openwork-orchestrator` + `opencode` sidecars; copies `apps/server` build for managed spawn; ships `@openwork/handsfree` computer-use helper on macOS.
