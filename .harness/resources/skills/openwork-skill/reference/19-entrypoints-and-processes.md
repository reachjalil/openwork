# 19 — Entry Points, Processes & Build Graph

> Every runnable process in the graph: entry file, command, runtime, default port,
> key env, and how to start it. Plus the build/test/CI task graph. Verified at HEAD
> `49d3f9ec`. `packageManager` is `pnpm@11.4.0` at the root (sub-packages still pin
> `pnpm@10.27.0` — a known inconsistency; the root value wins).

## Runnable Processes

| Process | Entry | Command | Runtime | Default port | Notes |
|---|---|---|---|---|---|
| Desktop app | `apps/desktop/electron/main.mjs` | `pnpm dev` | Electron 35 | — | Loads `apps/app` (dev server or built bundle); spawns host stack. |
| UI (standalone) | `apps/app/src/index.react.tsx` | `pnpm dev:ui` | Vite 6 | 5173 | Web/dev without Electron. |
| OpenWork server | `apps/server/src/cli.ts` | `openwork-server` | Bun→bin | 8787 | Filesystem workspace API. `OPENWORK_APPROVAL_MODE=auto` to auto-approve in dev. |
| Orchestrator | `apps/orchestrator/src/cli.ts` | `openwork` | Bun→bin | — | Spawns opencode + server + router; TUI. |
| opencode-router | `apps/opencode-router/src/cli.ts` | `opencode-router` | Bun→bin | 3005 (health) | Slack/Telegram bridge. Config under `~/.openwork/opencode-router/`. |
| OpenCode engine | (external) | `opencode serve` | — | 4096 / free | Version pinned in `constants.json` (`v1.17.11`). |
| Den API | `ee/apps/den-api/src/server.ts` | `pnpm dev:den:api` | Hono/Node | 8790 | Better-Auth; needs `DATABASE_URL`, `DEN_DB_ENCRYPTION_KEY`, `BETTER_AUTH_*`. |
| Den web | `ee/apps/den-web/app` | `pnpm dev:den:web` | Next.js 16 | 3005 | Proxies `/api/den/*` → den-api. |
| Inference | `ee/apps/inference/src/server.ts` | `pnpm dev:den:inference` | Hono/Node | 8791 | OpenRouter proxy + quota. |
| Worker proxy | `ee/apps/den-worker-proxy/src/server.ts` | (Render/service) | Hono/Node | 8789 | Daytona sandbox proxy. Needs `DAYTONA_*`. |
| Landing | `ee/apps/landing/app` | — | Next.js 14 | — | Marketing. |
| Full Den stack | `scripts/dev-local.mjs` | `pnpm dev:den` | orchestration | mysql+8790+3005 | MySQL (docker) + api + web + app together. |

CLIs & MCP servers (not long-running services):

| Tool | Entry | Invoked as |
|---|---|---|
| Bootstrap CLI | `packages/openwork-bootstrap/bin/openwork.mjs` | `npx openwork-bootstrap <cmd>` |
| UI-control MCP | `packages/openwork-ui-mcp/index.mjs` | `npx openwork-ui-mcp` (stdio) |
| HandsFree MCP | `packages/handsfree/bin/openwork-handsfree-computer-use.mjs` | `npx @openwork/handsfree mcp` |
| Admin MCP | `ee/packages/den-admin-mcp/index.mjs` | `node .../index.mjs` (stdio, needs read-only `DATABASE_URL`) |

## Key Environment Variables

| Var | Used by | Purpose |
|---|---|---|
| `OPENWORK_DEV_MODE=1` | desktop, orchestrator, server | Isolated dev state, looser gates. |
| `OPENWORK_APPROVAL_MODE=auto` | server | Auto-approve host writes in dev. |
| `DATABASE_URL` | all `ee/` | `mysql://…` PlanetScale/MySQL. |
| `DEN_DB_ENCRYPTION_KEY` | den-db | AES-256-GCM key (≥32 chars) for encrypted columns. |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | den-api | Session secret + callback base. |
| `DAYTONA_API_KEY` / `DAYTONA_API_URL` / `DAYTONA_TARGET` | den-worker-proxy | Sandbox orchestration. |
| `VITE_OPENWORK_URL` / `VITE_OPENCODE_URL` | app | Override server URL in web/dev. |
| `DEN_PLAN_GATING_ENABLED` | den-api | Enterprise gating kill-switch (defaults off; self-host stays opt-in). |

## Local Dev Quick Start (verified README commands)

```bash
pnpm install
pnpm dev            # desktop app (spawns host stack)
pnpm dev:ui         # UI only (web)
pnpm dev:den        # local Den cloud stack (MySQL + api + web + app)
pnpm typecheck      # fastest global gate
pnpm build          # build desktop
pnpm build:ui       # build app bundle
pnpm test:e2e       # e2e chain
```

> **Setup caveat (drift):** `README.md` lines 84–164 still list **Rust/Tauri** toolchain
> and a Tauri dialog plugin, but the desktop is **Electron** (`apps/desktop`,
> `.github/workflows/build-electron-desktop.yml`). Do **not** install Rust/Tauri for
> desktop work. This is a live docs-truth cleanup opportunity (see doc 02 watchlist).

## Build / Task Graph (`turbo.json`)

- `dev` / `dev:local` tasks: `cache: false`, persistent (long-running dev servers).
- `build`: cached, declares outputs; `globalEnv` includes DB/auth/port/Stripe vars so cache invalidates correctly.
- Pinned constant: `constants.json` → `{ "opencodeVersion": "v1.17.11" }` — the version orchestrator/desktop download.

## CI Gates (`.github/workflows/`, 22 workflows)

| Workflow | Gates |
|---|---|
| `ci-tests.yml` | Test suite on PRs — **gates merge**. |
| `ci-i18n.yml` | i18n audit on PRs (see `scripts/i18n-audit.mjs`). |
| `den-db-check.yml` | Schema/migration check when `ee/packages/den-db` paths change. |
| `den-db-migrate.yml` | Applies Drizzle migrations to prod PlanetScale. |
| `nightly-evals.yml` | Coded UI eval flows vs real Electron app, nightly. |
| `build-electron-desktop.yml` | Electron desktop build (confirms Electron, not Tauri). |
| `alpha-macos-aarch64.yml` | Publishes macOS arm64 alpha on merge to `dev`. |
| `warden.yml` | Warden AI security+code review when a PR carries the `Warden` label. |
| `ci-openwork-ui-mcp.yml` | Tests `openwork-ui-mcp` on push to `dev`. |

## Evals / Proof Framework (`evals/`)

```text
evals/
├── runner/run.mjs      main executor (CDP → live app → writes report)
├── runner/cdp.mjs      Chrome DevTools Protocol connection
├── runner/context.mjs  assertion DSL
├── runner/den-stack.mjs local Den orchestration for cloud flows
├── runner/pr.mjs       posts fraimz to a PR
├── flows/*.flow.mjs    64 coded eval flows (ids used with `pnpm fraimz --flow <id>`)
├── voiceovers/         approved demo scripts (gate: /voiceover before code)
└── results/            output incl. fraimz.html   (gitignored)
```

- **fraimz** = `evals/results/<run-id>/fraimz.html`; each frame binds claim → action → observable assertion → screenshot.
- Report `Passed` **only** when `fraimz.html` exists and every claim has an observable assertion.
- Some relevant flow ids: `core-flow`, `app-smoke`, `desktop-policies-demo`, `mcp-connections-desktop-e2e`, `memory-save-recall`, `llm-provider-test-connection-api`, `in-chat-find`, `artifact-markdown-render`.
