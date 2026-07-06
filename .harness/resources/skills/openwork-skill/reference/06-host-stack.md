# 06 — Desktop, Server, Orchestrator, and Router Host Stack

## Why This Matters

The host stack is central to OpenWork’s product: local agent workflows should work with one command or one desktop launch, while still being able to connect to remote/cloud workers. This is where desktop reliability, sidecar resolution, OpenCode compatibility, approvals, file sessions, and messaging connectors converge.

## Desktop Shell (`apps/desktop`)

The desktop package identifies itself as the OpenWork desktop shell with Electron main entry `electron/main.mjs`. It includes scripts for dev, Electron build, packaging, bridge checking, sidecar preparation, Electron typecheck, and tests.

Key dependencies:

- Electron,
- Electron builder/updater,
- `node-pty`,
- `better-sqlite3`,
- Drizzle,
- `@opencode-ai/sdk`,
- `jsonc-parser`, YAML, Zod, minimatch.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/desktop/package.json#L3-L46`

## OpenWork Server (`apps/server`)

`openwork-server` is a filesystem-backed API for OpenWork remote clients and is intentionally independent from the desktop app. It can run globally via npm or from source.

Primary responsibilities:

- workspace config and events,
- engine reload,
- plugin/skill/MCP/command management,
- audit/export/import,
- token management,
- inbox/outbox and artifacts,
- file sessions with JIT catalog and batch read/write,
- OpenCode proxy,
- opencode-router proxy,
- host approvals.

All writes are gated by host approval. In local development, `OPENWORK_APPROVAL_MODE=auto` can auto-approve.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/server/README.md#L3-L79`
- `https://github.com/different-ai/openwork/blob/dev/apps/server/README.md#L80-L161`

## Orchestrator (`apps/orchestrator`)

`openwork-orchestrator` installs the `openwork` command and runs host mode without requiring the desktop UI. It orchestrates:

- OpenCode,
- OpenWork server,
- optionally opencode-router.

It provides an interactive TUI with service health, ports, and connection details. It ships as a compiled binary, so Bun is not required at runtime. On first run, it downloads and caches sidecars via SHA-256 manifest unless configured otherwise.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/README.md#L3-L74`

### Orchestrator Capabilities

| Capability | Notes |
|---|---|
| Sidecar resolution | Controls openwork-server, opencode-router, opencode source: auto/bundled/downloaded/external. |
| Dev isolation | `OPENWORK_DEV_MODE=1` uses isolated OpenCode dev state for config/auth/data/cache/state. |
| Sandbox mode | Docker or Apple `container`; mounts workspace into a Linux container boundary. |
| Extra mounts | Allowlisted mounts into `/workspace/extra/*`. |
| Unified logging | OpenCode, server, and router logs; JSON mode and run IDs. |
| Router daemon | Multi-workspace routing with workspace add/list/path and instance dispose. |
| Pairing | Connect URL and client token for remote clients; advertises OpenCode connect URL. |
| Approvals CLI | List/reply to manual approvals. |
| Health checks | `openwork status` and smoke checks. |
| File sessions | Create session, catalog, read/write, events, close. |

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/README.md#L79-L116`
- `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/README.md#L118-L235`

## opencode-router (`apps/opencode-router`)

`opencode-router` is a Slack + Telegram bridge and directory router for a running OpenCode server.

Important ideas:

- Telegram and Slack are configured as identities.
- Routing is scoped by `(channel, identityId, peerId) -> directory` bindings.
- It can expose a local health/config/send HTTP server.
- It supports sending text and media (`image`, `audio`, `file`).
- Defaults use SQLite/config under `~/.openwork/opencode-router/`.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/opencode-router/README.md#L3-L52`
- `https://github.com/different-ai/openwork/blob/dev/apps/opencode-router/README.md#L53-L190`

## Host Stack Runtime Diagram

```text
openwork start --workspace /path --approval auto
        │
        ▼
openwork orchestrator
        ├─ resolves/downloads/caches sidecars
        ├─ starts OpenCode server
        ├─ starts openwork-server
        ├─ optionally starts opencode-router
        ├─ exposes URLs, health, logs, pairing info
        └─ can run TUI, serve mode, detached mode, sandbox mode

OpenWork desktop / web client
        └─ connects to OpenWork server workspace-mounted /opencode URL
             ├─ OpenCode sessions/events/todos/permissions
             ├─ OpenWork skills/plugins/MCP/file APIs
             └─ router/messaging if enabled
```

## Contribution Opportunities in Host Stack

| Area | Why useful | Example first move |
|---|---|---|
| Sidecar/packaging reliability | Native and binary distribution bugs are high-friction. | Reproduce macOS Intel `node-pty` packaging issue or Linux `.deb/.rpm` packaging gap. |
| Dev setup clarity | Docs drift can block new contributors. | Update Electron/Tauri and pnpm/Bun setup docs after confirming with maintainers. |
| Health diagnostics | Users report “OpenCode unavailable” and model sync errors. | Improve debug export/error classification and docs for config schema errors. |
| File sessions/artifacts | OpenWork is leaning into artifact editing and file-session APIs. | Add tests around text artifact preview/save or unsupported-file boundaries. |
| Router connectors | Slack/Telegram routing expands OpenWork beyond desktop. | Add diagnostics for identity binding, group chat, or media send failures. |
| Sandbox mode | Strong story for safer local execution. | Harden mount validation/error messages and smoke tests. |
