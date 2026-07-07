# 02 — Repository Map

Snapshot: **2026-07-05**, public `dev` branch. **Superseded for code-location purposes
by `16-code-graph.md`**, which is verified on disk (HEAD `49d3f9ec`, 2026-07-06) and
adds the workspaces this snapshot missed (`apps/installer`, `packages/install-config`,
`packages/openwork-bootstrap`, `ee/apps/landing`, `ee/apps/den-worker-proxy`,
`ee/apps/den-worker-runtime`). Use this doc for the narrative; use `16`/`17` for exact paths.

## Top-Level Map

| Path | Role | Contribution notes |
|---|---|---|
| `apps/app` | React/Vite UI used by Electron desktop and web deployments. | Most user-visible UX, settings, session, workspace, cloud, connections, artifacts, composer, theme, i18n. |
| `apps/desktop` | Electron desktop shell, runtime bridge, packaging, updater, workspace store, native deps. | Cross-platform reliability, packaging, bridge security, native dependency issues. |
| `apps/server` | Filesystem-backed OpenWork server API for remote clients. | Workspace APIs, plugins/skills/MCP management, files sessions, approvals, OpenCode proxy. |
| `apps/orchestrator` | CLI host for OpenCode + OpenWork server + optional opencode-router. Installs `openwork` command. | Sidecar resolution, sandbox mode, health checks, multi-workspace daemon, logs. |
| `apps/opencode-router` | Slack/Telegram bridge plus directory router for a running OpenCode server. | Messaging connectors, identity/directory routing, media sends, bot setup. |
| `apps/ui-demo` | UI demo surface. | Design-system and component experimentation. |
| `apps/installer` | Per-client Electron installer app with baked deployment config. | Consumes `@openwork/install-config`; distribution flows. |
| `packages/types` | Shared wire contracts and Zod schemas. | Crucial for cross-process stability. Add shared types here before duplicating. |
| `packages/ui` | Shared UI package with React export. | Reusable UI primitives/visuals. |
| `packages/openwork-ui-mcp` | MCP server for semantic UI control of the desktop app. | HandsFree, OpenCode, Claude/Codex UI automation integrations. |
| `packages/handsfree` | HandsFree integration package. | Accessibility/voice/semantic control opportunities. |
| `ee/apps/den-api` | Cloud/Den backend API. | Enterprise/cloud auth, org/workspace APIs, MCP capability surfaces. |
| `ee/apps/den-web` | Cloud/Den web dashboard. | Admin/user cloud UX, billing, connections, enterprise controls. |
| `ee/apps/den-worker-proxy` | Hono signed-preview proxy to Daytona sandboxes. | Cloud worker access, remote execution reliability. |
| `ee/apps/den-worker-runtime` | Build-time container root (installs orchestrator, packages opencode). | Render/Daytona image builds — **not a runtime service**. |
| `ee/apps/den-controller` | **DEPRECATED** — renamed to `den-api`; stub only. | Do not add code here. |
| `ee/apps/landing` | Next.js 14 marketing site. | Download/enterprise/legal pages. |
| `ee/apps/inference` | Hono LLM gateway proxying OpenRouter. | Model/inference billing/quotas/gateway. |
| `ee/packages/den-db` | Den database schema/migrations. | Drizzle/MySQL/PlanetScale schema, migrations, AES-256-GCM encrypted columns. |
| `ee/packages/den-admin-mcp` | Read-only (SELECT-only) admin analytics MCP. | Ops/analytics; safe read surface. |
| `ee/packages/utils` | Shared Den utilities (`typeid`, `skill-markdown`). | Cross-cutting Den helpers. |
| `docs` | Roadmap and architecture docs. | High-value source of product direction; also likely stale areas to clean. |
| `evals` | Real-app eval/proof flows. | Fraimz/e2e validation, user-visible proof. |
| `.opencode` | Repo-local OpenCode skills/config. | Internal agent workflow conventions. |
| `.github` | CI, issue/PR templates, workflows. | Contributor automation and gates. |

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/pnpm-workspace.yaml#L7-L11`
- `https://github.com/different-ai/openwork/tree/dev/apps`
- `https://github.com/different-ai/openwork/tree/dev/packages`
- `https://github.com/different-ai/openwork/tree/dev/ee`
- `https://github.com/different-ai/openwork/tree/dev/docs`

## Workspace Boundaries

The workspace file declares four package zones:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "ee/apps/*"
  - "ee/packages/*"
```

This is important because a change often spans multiple zones:

- UI affordance in `apps/app`.
- Shared wire type in `packages/types`.
- Local server behavior in `apps/server`.
- Desktop IPC/runtime behavior in `apps/desktop`.
- Cloud/admin behavior in `ee/apps/den-api` or `ee/apps/den-web`.
- Tests/evals in `apps/app/scripts`, package tests, or `evals/flows`.

## Where to Look by Feature

| Feature area | Primary locations | Secondary locations |
|---|---|---|
| Sessions/chat/composer | `apps/app/src/react-app/domains/session` | `apps/app/src/app/session`, `apps/server`, OpenCode SDK |
| Settings | `apps/app/src/react-app/domains/settings` | `apps/app/src/react-app/domains/connections`, `packages/types` |
| Workspace routing | `apps/app/src/react-app/shell/workspace-routes.ts` | `apps/server`, `apps/desktop` |
| Model/provider config | `apps/app/src/react-app/domains/connections`, `apps/app/src/app/cloud` | OpenCode config, Den policy surfaces |
| Skills manager | `apps/app`, `apps/server` skills endpoints | `.opencode/skills`, Den marketplace/cloud plugin materialization |
| Plugins/MCP | `apps/server`, `apps/app/src/react-app/domains/connections` | OpenCode config, MCP policy/capability router |
| Desktop policies | `packages/types/src/den/desktop-policies.ts` | `ee/apps/den-api`, `ee/apps/den-web`, desktop config provider |
| Desktop shell | `apps/desktop/electron`, `apps/desktop/scripts` | `apps/app/src/app/lib/desktop`, `packages/types/src/desktop-ipc.ts` |
| Orchestrator sidecars | `apps/orchestrator/src`, `apps/orchestrator/scripts` | `apps/server`, `apps/opencode-router`, releases |
| Messaging connectors | `apps/opencode-router/src` | Slack/Telegram configs, OpenCode server |
| Cloud workers | `ee/apps/den-*`, `ee/packages/den-db` | `apps/app` cloud domains |
| UI control MCP | `packages/openwork-ui-mcp`, Electron bridge | `apps/app` control surface/actions |
| Evals/proof | `evals/flows`, `evals/runner`, `apps/app/scripts` | AGENTS.md fraimz guidance |

## Architecture Drift Watchlist

Two repo signals — both **verified on disk at HEAD `49d3f9ec`** (not just suspected):

1. **Tauri→Electron docs drift (confirmed).** `README.md` still lists Rust/Tauri toolchain and a Tauri dialog plugin (lines 84–85, 94, 109, 161, 164, 218) and references `apps/desktop/src-tauri/…`, but the desktop is Electron (`apps/desktop/electron/main.mjs`, `.github/workflows/build-electron-desktop.yml`). A `migration.mjs` performs a one-way Tauri→Electron handoff. Do **not** install Rust/Tauri for desktop work. High-value docs-truth cleanup.
2. **pnpm version mismatch (confirmed).** Root `package.json` pins `pnpm@11.4.0`; `README.md` line 92 and every sub-package (`apps/{app,desktop,server,orchestrator}/package.json`) still say `pnpm@10.27.0`. The root value is authoritative for the workspace.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/README.md#L81-L99`
- `https://github.com/different-ai/openwork/blob/dev/README.md#L161-L166`
- `https://github.com/different-ai/openwork/blob/dev/apps/desktop/package.json#L12-L25`
- `https://github.com/different-ai/openwork/blob/dev/package.json#L63-L67`
- `https://github.com/different-ai/openwork/blob/dev/apps/app/package.json#L106-L107`

## Contributor Use

When proposing work, name the folder and likely test surface. Example:

> “For the code-block copy issue, I’d start in `apps/app` markdown rendering paths, add a UI-level test or script where available, then capture a fraimz/video proof because it changes a visible chat experience.”
