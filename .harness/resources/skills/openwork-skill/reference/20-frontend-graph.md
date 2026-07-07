# 20 — Frontend Code Graph (`apps/app`)

> Interior of the biggest node. React 19 + Vite 6; the **only** UI for desktop and web.
> Verified against the checkout at HEAD `49d3f9ec`. For "where do I change X" jump to
> `17-change-recipes.md` §A/§B; for boot/stream traces see `18-data-flows.md` A–C.

## Entry & Layers

```text
apps/app/
├── index.html                     mounts #root → src/index.react.tsx
├── vite.config.ts                 base path (relative for Electron), alias @/ → src/
└── src/
    ├── index.react.tsx            THE entry (theme, locale, den bootstrap, provider tree, Router)
    ├── app/                       framework-agnostic — MUST NOT import react-app/ or components/
    │   ├── lib/                    backend clients (the 4 realm boundaries) ▼
    │   ├── theme.ts               theme mode + CSS vars + no-flash bootstrap
    │   ├── types.ts               Client, ProviderListItem, ComposerPart, SettingsTab enum
    │   ├── extensions.ts          extension manifest contract
    │   ├── utils/                 pure helpers (providers, plugins, path)
    │   └── cloud/, defaults/, data/
    ├── i18n/                       index.ts (t/setLocale) + locales/*.ts (10 locales)
    ├── components/                 shadcn/ui primitives + tools/*.tsx renderers
    └── react-app/                  React-only UI ▼
        ├── shell/                  bootstrap, provider composition, routes, menus, boot gates
        ├── kernel/                 app-wide state + providers (Zustand, platform, SDK)
        ├── infra/                  TanStack Query singleton + shared caches
        ├── design-system/          reusable presentational primitives
        └── domains/                feature code: session, settings, connections, cloud, workspace, onboarding
```

**Layer rule (enforced; `madge --circular` must be 0):** `app/` and `i18n/` never import `react-app/` or `components/`. `kernel/`+`infra/` sit below `domains/`. `shell/` is on top and may import anything. Shared wire types live in `packages/types`, not here.

## The 4 client-lib boundaries (`src/app/lib/`)

This directory is how the UI reaches each [runtime realm](16-code-graph.md#the-four-runtime-realms-know-which-one-youre-in). When debugging cross-process issues, start here:

| File | Realm | Responsibility |
|---|---|---|
| `opencode.ts` + `opencode-session.ts` | OpenCode engine | `createOpencodeClient()` (@opencode-ai/sdk v2); session CRUD, `promptAsync`, abort, fork. |
| `openwork-server.ts` | Host stack | OpenWork server client: workspace, capabilities, diagnostics, env hydration. |
| `desktop.ts` | Desktop bridge | `desktopFetch`, IPC invoker (`desktopBridge` Proxy) → `window.__OPENWORK_ELECTRON__`. |
| `den.ts` (+ `den-skills`, `den-telemetry`, `den-handoff`) | Den cloud | Sign-in, bootstrap config, skills, telemetry. |

Also present: `runtime-env.ts`, `openwork-deployment.ts`, `migration.ts` (+ legacy `tauri.ts`), `release-channels.ts`, `deep-link-bridge.ts`.

## Kernel — state & providers (`react-app/kernel/`)

| File | Key export | Owns |
|---|---|---|
| `store.ts` | `useOpenworkStore` (Zustand) | bootstrapping, server state, workspaces, `activeWorkspaceId`, `selectedSessionId`, error banner. |
| `selectors.ts` | `selectActiveWorkspace`, `selectServerStatus`, `selectServerUrl` | derived reads. |
| `server-provider.tsx` | `ServerProvider`, `useServer()` | active server URL, localStorage list, health polling. |
| `global-sdk-provider.tsx` | `GlobalSDKProvider`, `GlobalEventEmitter` | OpenCode client + SSE `event.subscribe` fan-out. |
| `global-sync-provider.tsx` | `GlobalSyncProvider` | workspace state cache: config, providers, MCP, LSP, project, VCS. |
| `local-provider.tsx` | `LocalProvider` | draft, selected model/agent, notifications, overlays. |
| `platform.tsx` | `PlatformProvider` | electron vs web detection. |
| `notification-store.ts` | Zustand | toast queue. |

## Shell — composition & routes (`react-app/shell/`)

`providers.tsx` (exact provider nesting → see `18-data-flows.md` Flow A), `app-root.tsx` (routes + `DenSigninGate`), `session-route.tsx`, `settings-route.tsx`, `welcome-route.tsx`, `command-palette.tsx`, `workspace-routes.ts` (route builders), `desktop-runtime-boot.ts` (IPC workspace boot), `reload-coordinator.tsx` (engine reload sync), `architecture-mismatch-gate.tsx`, `startup-deep-links.ts`, `control/control-provider.tsx` (external `OpenworkControl` API for the UI-MCP bridge).

## Domains (feature code)

Six verified domain folders under `react-app/domains/`:

### session/ (workspace-scoped — the chat surface)
- `sync/` — SDK→UI reconciliation: `session-sync.ts`, `runtime-sync.tsx`, `actions-provider.tsx` (tool execution), `draft-store.ts`, `run-state.ts`, `usechat-adapter.ts` (@ai-sdk/react), `parse-tool-parts.ts`.
- `surface/` — `session-surface.tsx`, `composer/{composer.tsx(Lexical),editor.tsx(CodeMirror),app-mentions.ts,slash-command.ts}`, `markdown.tsx` (react-markdown + Shiki), `find-bar.tsx`, scroll controllers.
- `chat/` — `session-page.tsx`, `permission-approval-modal.tsx`.
- `artifacts/` — `artifact-panel.tsx`, `artifact-text-editor.tsx`, `artifact-spreadsheet-editor.tsx` (xlsx), `preview.tsx`.
- `sidebar/`, `terminal/` (xterm), `voice/`, `panel/`, `status/`, `search/` (`session-search.ts` Fuse.js), `modals/` (model-picker, rename, question).

### settings/ (workspace-scoped)
- `shell/` — `settings-shell.tsx`, `tabs.tsx`.
- `pages/` — one `*-view.tsx` per tab: `general`, `ai`, `preferences`, `shell`, `appearance`, `skills`, `memory`, `extensions`, `environment`, `advanced`, `config`, `mcp`, `plugins`, `cloud-account`, `cloud-providers`, `cloud-marketplaces`, `updates`, `recovery`, `debug`.
- `state/` — Zustand stores: `model-controls-store.ts`, `extensions-store.ts`, `feature-flags-preferences.ts`, etc.
- `extension-registry.tsx` + per-extension config components (`ollama-config.tsx`, `computer-use-config.tsx`, `google-workspace-config.tsx`, `openai-image-gen-config.tsx`, …).

### connections/ (workspace-scoped — provider/MCP auth)
`store.ts`, `provider.tsx`, `modals.tsx`, `mcp-silent-reauth.ts`, `use-org-mcp-connections.ts`, `provider-auth/{provider-auth-modal.tsx,store.ts}`, `modals/{add-mcp-modal.tsx,claude-plugin-import-modal.tsx}`.

### cloud/ (Den sign-in & org)
`den-auth-provider.tsx`, `desktop-config-provider.tsx` (policy hooks), `brand-theme.tsx`, `restriction-notice-provider.tsx`, `forced-signin-page.tsx`, `org-onboarding-page.tsx`.

### workspace/ (lifecycle)
`create-workspace-modal.tsx`, `create-remote-workspace-modal.tsx`, `rename-workspace-modal.tsx`, `share-workspace-modal.tsx` + `*-state.ts`.

### onboarding/
`welcome-page.tsx`, `provider-selection-step.tsx`, `attribution-step.tsx`.

## UI stack (verified deps)

React 19 · React Router 7 · Vite 6 · Zustand 5 · TanStack Query 5 · Tailwind 4 + shadcn/Base UI/Radix · Lexical (composer) · CodeMirror (artifacts/config) · xterm (terminal) · react-markdown + marked + marked-shiki + Shiki (rendering) · Sonner (toasts) · cmdk (palette) · xlsx (spreadsheet) · DOMPurify.

## Test surface

Scripts live in `apps/app/scripts/*` and `apps/app/tests/*`, run via `pnpm --filter @openwork/app test:*` (see `17-change-recipes.md` proof table). Unit tests (Bun): `mention-encoding`, `session-sync-tool-parts`, `session-sync-permissions`, `session-search`, `composer-state-store`, `notification-store`, `cloud-mcp-user-state`, `env-context`, and ~15 more. Full UI proof = fraimz flow.
