# 03 — Tech Stack

## Monorepo and Tooling

| Layer | Stack / packages | Evidence / notes |
|---|---|---|
| Workspace | pnpm workspaces + Turbo | Root package uses Turbo; workspace includes `apps/*`, `packages/*`, `ee/apps/*`, `ee/packages/*`. |
| Primary language | TypeScript | Apps/packages are TS/TSX-heavy. |
| Web UI | React 19 + Vite | `apps/app` is React 19 + Vite; React versions are cataloged in pnpm workspace. |
| Package manager | pnpm | AGENTS says use pnpm, never npm/yarn for repo development. Root and package manifests include pnpm packageManager fields, though versions should be verified. |
| Runtime/test tools | Bun, Node, Electron | Server/orchestrator/router often use Bun; desktop uses Electron; tests use Bun, Node scripts, and evals. |
| Build/release | Turbo, Vite, TypeScript, Electron builder, custom scripts | Root scripts wrap filters; desktop scripts package Electron; server/orchestrator compile binaries. |
| DB/client-side storage | SQLite/better-sqlite3, Drizzle | Desktop/server use better-sqlite3 and Drizzle; Den DB uses MySQL/Drizzle according to docs. |
| Cloud DB | MySQL/PlanetScale + Drizzle | Memory and enterprise docs reference MySQL/PlanetScale/Drizzle patterns. |

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/package.json#L7-L67`
- `https://github.com/different-ai/openwork/blob/dev/pnpm-workspace.yaml#L7-L31`
- `https://github.com/different-ai/openwork/blob/dev/turbo.json#L3-L43`
- `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L72-L92`

## `apps/app` UI Stack

`apps/app` is the main React/Vite user interface. It contains the session/chat surface, settings, workspace flows, connections, cloud surfaces, onboarding, artifacts, terminal/panels, and shell routing.

Key dependencies:

- React 19 / React DOM 19.
- Vite 6.
- React Router 7.
- TanStack Query 5.
- Zustand 5.
- Base UI, shadcn, Radix colors, Tailwind 4, class-variance-authority, tailwind-merge.
- CodeMirror and Lexical for editing/composer/document surfaces.
- Shiki/marked/react-markdown/remark for markdown rendering.
- xterm for terminal UI.
- `@opencode-ai/sdk` and OpenWork shared packages.
- `xlsx` for spreadsheet/artifact support.
- `dompurify` for sanitized rendering.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/app/package.json#L41-L104`
- `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L3-L40`

## `apps/desktop` Stack

`apps/desktop` is the Electron desktop shell.

Key dependencies and signals:

- Electron 35.
- Electron builder and updater.
- `node-pty` for terminal/native PTY behavior.
- `better-sqlite3`, Drizzle, YAML, Zod, minimatch, jsonc-parser.
- Electron main entry: `electron/main.mjs`.
- Build/package scripts: `electron-build.mjs`, `electron-builder.yml`.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/desktop/package.json#L3-L46`

## `apps/server` Stack

`openwork-server` is a filesystem-backed API for OpenWork remote clients and is independent from the desktop app.

Key dependencies:

- Bun runtime for dev/build binary workflows.
- `@opencode-ai/sdk`.
- `better-sqlite3` and Drizzle.
- `jsonc-parser`, `minimatch`, YAML, Zod.
- Exposes a binary named `openwork-server`.

The server README lists APIs for workspaces, plugins, skills, MCP, commands, audit/export/import, token management, artifacts, file sessions, OpenCode proxy, router proxy, and approvals.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/server/package.json#L3-L68`
- `https://github.com/different-ai/openwork/blob/dev/apps/server/README.md#L80-L161`

## `apps/orchestrator` Stack

`openwork-orchestrator` is the CLI host for OpenCode + OpenWork server + opencode-router. It installs the `openwork` command.

Key dependencies:

- Bun/TypeScript build pipeline.
- `@opencode-ai/sdk`.
- `@opentui/core` / `@opentui/solid` for terminal UI.
- `opencode-router` and `openwork-server` as sidecars/deps.
- Solid.js for TUI rendering.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/package.json#L3-L68`
- `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/README.md#L3-L74`

## `apps/opencode-router` Stack

`opencode-router` bridges Slack/Telegram and directory routes to a running OpenCode server.

Key dependencies:

- Bun/TypeScript.
- `@opencode-ai/sdk`.
- Slack Socket Mode and Web API packages.
- `grammy` for Telegram.
- `commander`, `dotenv`, `pino`.
- SQLite config/store by default.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/opencode-router/package.json#L3-L62`
- `https://github.com/different-ai/openwork/blob/dev/apps/opencode-router/README.md#L3-L190`

## Shared Packages

| Package | Role |
|---|---|
| `@openwork/types` | Shared wire contracts: den desktop policies, desktop restrictions, inference, workspace, desktop IPC. |
| `@openwork/ui` | React-exported UI package with shader visuals and React 18/19 peer support. |
| `openwork-ui-mcp` | MCP stdio server that controls the desktop UI through a localhost bridge. |

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/packages/types/package.json#L4-L54`
- `https://github.com/different-ai/openwork/blob/dev/packages/ui/package.json#L4-L34`
- `https://github.com/different-ai/openwork/blob/dev/docs/mcp-ui-control-profile.md#L231-L253`

## Preferred Stack Choices From Maintainers

AGENTS.md says that when uncertain, prefer:

- Tailwind,
- TypeScript,
- React,
- shadcn/ui with Base UI,
- TanStack Query,
- Zustand,
- Zod,
- Drizzle,
- Better-Auth.

It also says most end users are nontechnical, prefer existing `@/components`, use pnpm, and avoid `any`, unnecessary casts, and large diffs.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L72-L98`

## Possible Stack/Docs Drift to Verify

| Signal | Why it matters |
|---|---|
| README lists Tauri/Rust/Tauri CLI requirements while desktop package is Electron. | New contributors may install unnecessary tooling or misunderstand desktop architecture. |
| README and subpackages mention `pnpm@10.27.0`; root package says `pnpm@11.4.0`. | Setup reproducibility and lockfile behavior may differ. |
| Latest GitHub release may lag `dev` package versions. | Interview answers should distinguish release from dev branch. |
