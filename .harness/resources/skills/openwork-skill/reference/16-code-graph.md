# 16 — Code Graph (Master Map)

> **This is the entry point for "where does the code live and where do changes go."**
> It was built by reading the checked-out repo at `/Users/jalillaaraichi/openwork`
> (branch `codex/setup-fork`, HEAD `49d3f9ec`, dated 2026-07-06), not from GitHub URLs.
> Every path below was verified on disk. When a claim is time-sensitive, re-check the
> live `dev` branch — but the **structure** here is ground truth for this checkout.

## How to Read This Graph

The code graph has three kinds of information:

1. **Nodes** — the 22 workspaces (`apps/*`, `packages/*`, `ee/apps/*`, `ee/packages/*`), each with a verified path, npm name, runtime, entry point, and role.
2. **Build edges** — which package *imports* which at compile time (the dependency graph). Follow these to know what breaks when you change a shared file.
3. **Runtime edges** — which process *calls* which at run time (the data-flow graph). Follow these to trace a user action end-to-end.

Then drill down:

| You want… | Go to |
|---|---|
| A specific node's interior (files + symbols) | `20-frontend-graph.md`, `21-host-stack-graph.md`, `22-desktop-graph.md`, `23-cloud-graph.md` |
| "I want to change X — which files?" | `17-change-recipes.md` |
| "Trace this feature end-to-end" | `18-data-flows.md` |
| "How do I run/build/test this process?" | `19-entrypoints-and-processes.md` |
| A machine-readable version to traverse programmatically | `../meta/code-graph.json` |

## Node Inventory (verified on disk)

> 22 **named** pnpm workspaces participate in the graph. Two `ee/apps` dirs are listed
> for completeness but are **not** active services: `den-controller` (deprecated stub)
> and `den-worker-runtime` (build-only container root). `packages/docs` has no
> `package.json`.

### `apps/*` — user-facing clients and host binaries

| Node | npm name | Runtime | Entry point | Role |
|---|---|---|---|---|
| `apps/app` | `@openwork/app` | React 19 / Vite 6 | `src/index.react.tsx` | The **only** UI. Electron loads it, web serves it. Session, settings, connections, cloud, workspace, onboarding. |
| `apps/desktop` | `@openwork/desktop` | Electron 35 (`.mjs`) | `electron/main.mjs` | Desktop shell: window, IPC, runtime spawn, updater, packaging, native deps. |
| `apps/installer` | `@openwork/installer` | Electron | (installer app) | Per-client desktop **installer** app with baked deployment config. Consumes `@openwork/install-config`. |
| `apps/server` | `openwork-server` | Bun → binary | `src/cli.ts` (bin `openwork-server`) | Filesystem-backed workspace API: skills/plugins/MCP/commands/files/approvals/proxies. |
| `apps/orchestrator` | `openwork-orchestrator` | Bun → binary | `src/cli.ts` (bin `openwork`) | Host CLI that spawns opencode + openwork-server + opencode-router; TUI, sandbox, sidecars. |
| `apps/opencode-router` | `opencode-router` | Bun → binary | `src/cli.ts` (bin `opencode-router`) | Slack/Telegram bridge + directory router for a running OpenCode server. |
| `apps/ui-demo` | `@openwork/ui-demo` | Vite | (demo) | Component/design-system showcase. |

### `packages/*` — shared libraries

| Node | npm name | Runtime | Entry / key files | Role |
|---|---|---|---|---|
| `packages/types` | `@openwork/types` | TS types | `src/desktop-ipc.ts`, `src/workspace.ts`, `src/den/{desktop-policies,inference,desktop-app-restrictions}.ts` | **The cross-process contract hub.** ~1000 LOC of wire types shared by desktop, app, server, and all of `ee/`. Change here ripples widest. |
| `packages/ui` | `@openwork/ui` | React 18/19 | `src/react/index.ts` | Paper-shader gradient components + `detectPlatform()` + `DownloadOpenWorkCard`. |
| `packages/openwork-ui-mcp` | `openwork-ui-mcp` | Node stdio | `index.mjs` | MCP server that proxies `ui_snapshot`/`ui_list_actions`/`ui_execute_action` to the desktop control bridge. |
| `packages/handsfree` | `@openwork/handsfree` | Node + Swift | `bin/openwork-handsfree-computer-use.mjs`, `native/HandsFree/` | macOS Accessibility computer-use runtime, exposed as an MCP stdio server. |
| `packages/email` | `@openwork/email` | React Email | `src/index.ts`, `src/templates/index.ts` | Email render + send (Resend / nodemailer). 5 templates. Consumed by `ee/`. |
| `packages/install-config` | `@openwork/install-config` | TS/Zod | `src/index.ts` | Installer config schema + filename-tag parser. Used by `apps/installer` + `den-api`. |
| `packages/openwork-bootstrap` | `openwork-bootstrap` | Node CLI | `bin/openwork.mjs` | One-line onboarding CLI: install app, doctor, cloud onboard, bootstrap-workspace, claim-link. |
| `packages/docs` | — (no package.json) | Markdown | — | Package docs holder. |

### `ee/*` — enterprise / Den cloud (source-available, gated)

| Node | npm name | Runtime | Entry point | Role |
|---|---|---|---|---|
| `ee/apps/den-api` | `@openwork-ee/den-api` | **Hono** + Better-Auth | `src/server.ts` (port 8790) | Cloud control plane: auth, orgs, billing, desktop policies, workers, inference config, memory, MCP catalog. |
| `ee/apps/den-web` | `@openwork-ee/den-web` | **Next.js 16** (App Router) | `app/` (port 3005) | Cloud dashboard: admin, billing, members, SSO/SCIM, policies, connections. Proxies `/api/den/*` → den-api. |
| `ee/apps/den-worker-proxy` | `@openwork-ee/den-worker-proxy` | Hono | `src/server.ts` (port 8789) | Signed-preview proxy to Daytona worker sandboxes. |
| `ee/apps/inference` | `@openwork-ee/inference` | Hono | `src/server.ts` (port 8791) | LLM gateway proxying OpenRouter with per-org quota metering. |
| `ee/apps/landing` | `@openwork-ee/landing` | **Next.js 14** | `app/` | Marketing site (download, enterprise, legal). |
| `ee/apps/den-worker-runtime` | — | Docker build root | `Dockerfile.daytona-snapshot`, `scripts/` | **Build-only** — installs `openwork-orchestrator`, pins + packages `opencode` for Render/Daytona images. Not a runtime service. |
| `ee/apps/den-controller` | — | — | `README.md` | **DEPRECATED** — renamed to `den-api`; stub kept for link resolution. Do **not** add code here. |
| `ee/packages/den-db` | `@openwork-ee/den-db` | Drizzle / MySQL / PlanetScale | `src/client.ts`, `src/schema/*.ts`, `drizzle/` | Cloud DB schema + client + migrations. AES-256-GCM encrypted columns (`DEN_DB_ENCRYPTION_KEY`). |
| `ee/packages/den-admin-mcp` | `@openwork-ee/den-admin-mcp` | Node stdio | `index.mjs` | Read-only (SELECT-only) admin analytics MCP. |
| `ee/packages/utils` | `@openwork-ee/utils` | TS | `typeid`, `skill-markdown` | Shared Den helpers (TypeIDs, skill markdown). |

> **Drift correction vs. the older repo map (doc 02):** the real tree also contains `apps/installer`, `packages/install-config`, `packages/openwork-bootstrap`, `ee/apps/landing`, `ee/apps/den-worker-proxy`, `ee/apps/den-worker-runtime` (a build-time container root, no service), and root dirs `prds/`, `examples/`, `changelog/`, `patches/`, `warden.toml`, `constants.json`, `skills-lock.json`. `den-controller` is deprecated.

## The System as a Layered Graph

```text
                         ┌──────────────────────────────────────────────┐
 CLIENTS                 │  apps/app  (@openwork/app — the ONE UI)        │
                         │  loaded by ↓ Electron  or  served on web       │
        ┌────────────────┴───────────────┬──────────────────────────────┘
        │                                │
┌───────▼─────────┐            ┌─────────▼──────────┐        ┌───────────────────┐
│ apps/desktop     │            │ ee/apps/den-web    │        │ apps/opencode-     │
│ (Electron shell) │            │ (Next.js dashboard)│        │ router (Slack/TG)  │
└───────┬─────────┘            └─────────┬──────────┘        └─────────┬─────────┘
        │ spawns                         │ /api/den/* proxy            │
┌───────▼──────────────────────┐        │                             │
│ apps/orchestrator (host CLI)  │        │                             │
│  ├─ opencode  serve           │        │                             │
│  ├─ apps/server               │        │                             │
│  └─ apps/opencode-router      │        │                             │
└───────┬──────────────────────┘        │                             │
        │                                │                             │
┌───────▼──────────┐          ┌──────────▼─────────┐         ┌─────────▼─────────┐
│ apps/server       │          │ ee/apps/den-api    │◄────────┤ ee/apps/inference  │
│ (workspace API)   │          │ (Hono control      │         │ (OpenRouter proxy) │
│  gates writes via │          │  plane + auth)     │         └─────────┬─────────┘
│  host approvals   │          └──────────┬─────────┘                   │
└───────┬──────────┘                     │                   ┌─────────▼─────────┐
        │                     ┌───────────▼──────────┐        │ ee/apps/den-       │
┌───────▼──────────┐          │ ee/packages/den-db   │        │ worker-proxy →     │
│ local workspace   │          │ (MySQL / PlanetScale)│        │ Daytona sandboxes  │
│ files + OpenCode  │          └──────────────────────┘        └───────────────────┘
└───────────────────┘

 CROSS-CUTTING CONTRACT SPINE (imported by nearly every node above):
   packages/types  ──  desktop-ipc.ts · workspace.ts · den/desktop-policies.ts · den/inference.ts
```

## Build Edges (compile-time dependency graph)

Read as "**A → B** means A imports B." These are the edges that decide *what you must also update* when you touch a shared file.

```text
apps/app          → @openwork/types, @openwork/ui, @opencode-ai/sdk
apps/desktop      → @openwork/types (implements desktop-ipc handlers)
apps/installer    → @openwork/install-config
apps/server       → @openwork/types, @opencode-ai/sdk
apps/orchestrator → openwork-server, opencode-router, @opencode-ai/sdk   (spawns them as sidecars too)
apps/opencode-router → @opencode-ai/sdk
ee/apps/den-api   → @openwork-ee/den-db, @openwork/types, @openwork/email, @openwork/install-config, @openwork-ee/utils
ee/apps/den-web   → @openwork/types, @openwork/ui   (+ HTTP → den-api)
ee/apps/inference → @openwork-ee/den-db, @openwork/types
ee/apps/den-worker-proxy → @openwork-ee/den-db
ee/apps/landing   → @openwork/ui, @openwork/email
```

**The hub is `@openwork/types`.** Six workspaces compile against it. Its four load-bearing files:

| File | Owns | Downstream impact if you change it |
|---|---|---|
| `packages/types/src/desktop-ipc.ts` | `DesktopCommandMap` (~80 IPC commands) | `apps/desktop/electron/main.mjs` (handlers) **and** `apps/app/src/app/lib/desktop.ts` (invoker) must both match. |
| `packages/types/src/workspace.ts` | `WorkspaceWire` | desktop store, `apps/server/src/types.ts`, app desktop-types, `ee/packages/den-db` schema. |
| `packages/types/src/den/desktop-policies.ts` | `desktopPolicyDefinitions`, `DesktopConfig` | `den-api` policy endpoints, `den-web` policy UI, `apps/app` cloud/`desktop-config-provider.tsx`, desktop `main.mjs`. |
| `packages/types/src/den/inference.ts` | `INFERENCE_TIER_LIMITS`, model aliases | `den-api` budgeting, `ee/apps/inference` metering, app model display. |

See `17-change-recipes.md` for the full "edit contract X → also update Y" tables.

## Runtime Edges (data-flow graph)

Read as "**A ⇒ B** means A calls/talks to B at run time."

```text
apps/app  ⇒ apps/server            (HTTP, workspace-scoped /w/:id/… + /opencode proxy)
apps/app  ⇒ OpenCode server         (@opencode-ai/sdk v2 client: sessions, prompts, SSE events)
apps/app  ⇒ ee/apps/den-api         (HTTP: sign-in, /v1/me/desktop-config, skills, telemetry)
apps/app  ⇒ apps/desktop            (Electron IPC via window.__OPENWORK_ELECTRON__ → desktop-ipc)
apps/desktop ⇒ apps/orchestrator    (spawns host; fallback: spawns `opencode serve` direct)
apps/orchestrator ⇒ apps/server, opencode-router, opencode   (child processes / sidecars)
apps/opencode-router ⇒ OpenCode server   (routes Slack/Telegram peers → workspace dirs)
ee/apps/den-web ⇒ ee/apps/den-api   (/api/den/* upstream proxy)
ee/apps/den-api ⇒ ee/packages/den-db (Drizzle), ee/apps/inference, Daytona (via worker-proxy), Stripe, OpenRouter
apps/app  ⇒ ee/apps/inference        (OpenAI-compatible LLM calls when using OpenWork-hosted models)
```

The ordered file-level version of each of these lives in `18-data-flows.md`.

## The Four Runtime Realms (know which one you're in)

Every change lands in exactly one of these. Naming the realm first prevents editing the wrong layer:

1. **Local OpenCode** — the agent engine OpenWork consumes (`@opencode-ai/sdk`, `opencode serve`). OpenWork rarely changes this; it configures and proxies it.
2. **OpenWork host stack** — `apps/server` + `apps/orchestrator` + `apps/opencode-router`, all Bun binaries, all local-first.
3. **Desktop bridge** — `apps/desktop` Electron main/preload + `packages/types/src/desktop-ipc.ts`. Native, OS-specific.
4. **Den cloud** — everything under `ee/`, plus the app's `domains/cloud` + `domains/connections` clients. Hosted, auth-gated, `DEN_PLAN_GATING_ENABLED` respects the ejectable promise.

`apps/app` is the one node that touches **all four realms** through the client libs in `apps/app/src/app/lib/` (`opencode.ts`, `openwork-server.ts`, `desktop.ts`, `den.ts`).

## Navigation Cheatsheet

```text
"where is the chat composer?"        → 20-frontend-graph.md  (domains/session/surface/composer)
"where are server API routes?"       → 21-host-stack-graph.md (apps/server/src/routes)
"where is Electron IPC defined?"     → 22-desktop-graph.md + packages/types/src/desktop-ipc.ts
"where are desktop policies?"        → 23-cloud-graph.md (den-api) + packages/types/src/den/desktop-policies.ts
"how does a prompt reach OpenCode?"  → 18-data-flows.md  (Flow B)
"what process listens on 8790?"      → 19-entrypoints-and-processes.md (den-api)
```
