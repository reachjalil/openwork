# 04 — Runtime Architecture

## Core Runtime Model

OpenWork has two major runtime modes:

1. **Host mode.** OpenWork runs a local host stack and connects the UI to it. The default runtime is the `openwork` orchestrator, which coordinates OpenCode, OpenWork server, and optionally opencode-router. Fallback runtime is `direct`, where the desktop app spawns `opencode serve` directly.
2. **Client mode / remote mode.** OpenWork connects to an existing OpenCode/OpenWork server by URL, including hosted workers.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/README.md#L145-L159`

## High-Level Diagram

```text
                   ┌──────────────────────────────────────┐
                   │            User / Agent              │
                   └──────────────────┬───────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
┌───────▼────────┐          ┌─────────▼─────────┐          ┌────────▼─────────┐
│ Electron app   │          │ Web UI / Den web  │          │ CLI / connectors │
│ apps/desktop   │          │ apps/app, ee/web  │          │ orchestrator,    │
│ loads apps/app │          │                   │          │ Slack/Telegram   │
└───────┬────────┘          └─────────┬─────────┘          └────────┬─────────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │ OpenWork server/API      │
                         │ apps/server or Den APIs  │
                         └────────────┬────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
┌───────▼────────┐          ┌─────────▼──────────┐         ┌────────▼─────────┐
│ OpenCode server│          │ OpenCode Router    │         │ Skills/MCP/      │
│ opencode serve │          │ Slack/Telegram     │         │ plugins/capable  │
└───────┬────────┘          └─────────┬──────────┘         │ extension layer  │
        │                             │                    └──────────────────┘
        ▼                             ▼
 Local workspace files        Messaging peers / dirs
```

## UI-to-OpenCode Flow

The README says the UI uses `@opencode-ai/sdk/v2/client` to:

- connect to the server,
- list/create sessions,
- send prompts,
- subscribe to SSE events,
- read todos and permission requests.

The app implementation confirms this in `GlobalSDKProvider`, which creates an OpenCode client and subscribes to `event.subscribe`, then coalesces and emits events per directory.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/README.md#L154-L159`
- `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/kernel/global-sdk-provider.tsx#L13-L205`

## Server Selection and Health

`ServerProvider` owns the active server URL, localStorage-backed server list, health polling, and URL normalization. It creates an OpenCode client for health checks and uses desktop fetch when running in desktop runtime. It also avoids stale raw OpenCode daemon URLs in Electron when they are not workspace-mounted `/opencode` URLs.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/kernel/server-provider.tsx#L21-L220`

## Workspace and Session Identity

The React app architecture doc emphasizes that workspace and session identity are route state, not mutable global state. Canonical workspace routes include:

- `/workspace/:workspaceId/session`
- `/workspace/:workspaceId/session/:sessionId`
- `/workspace/:workspaceId/settings/:tab`
- `/workspace/:workspaceId/settings/extensions/:section`

Code should read active workspace/session from URL params first and should not silently fall back to the first workspace for missing resources.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L86-L128`

## Server API Surface

`openwork-server` exposes a broad filesystem-backed API:

- health/status/capabilities/whoami,
- workspaces and workspace config,
- events and engine reload,
- plugins, skills, MCP, commands,
- audit/export/import,
- token management,
- inbox/outbox/artifacts,
- file sessions with catalog/read/write/ops,
- toy UI,
- OpenCode proxy,
- OpenCode Router proxy,
- approvals.

All writes are gated by host approval.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/server/README.md#L80-L161`

## Capability and Extension Direction

The core runtime is moving from “inject every tool/config into the harness” toward **search and execute** capability surfaces. Den already has a meta-MCP pattern in the memory-bank doc: `search_capabilities` and `execute_capability`. Open PRs indicate that the same pattern is being localized for desktop/server capabilities, skills, MCP tools, UI actions, and cloud capabilities.

Current-vs-roadmap distinction:

- **Current documented architecture:** UI consumes OpenCode/OpenWork server surfaces; server exposes workspace/plugin/skills/MCP/file APIs.
- **Roadmap/open-PR signal:** unified capability index with search/execute over local, UI, MCP, cloud, and skill shards.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L38-L51`
- `https://github.com/different-ai/openwork/blob/dev/docs/extensions-manifest-foundation.md#L7-L22`
- Open PRs in source index: capability router PRs `#2438` and `#2472`.

## Security and Permission Model Signals

Important security assumptions:

- Host mode binds to `127.0.0.1` by default.
- OpenWork hides model reasoning and sensitive tool metadata by default.
- OpenWork server gates writes by host approval.
- Desktop policies are delivered from Cloud through `GET /v1/me/desktop-config` and enforced client-side via dedicated hooks.
- Memory-bank roadmap emphasizes owner-scoping, 404 for non-owned records, cross-user tests, and pre-GA encryption-at-rest.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/README.md#L212-L215`
- `https://github.com/different-ai/openwork/blob/dev/apps/server/README.md#L147-L161`
- `https://github.com/different-ai/openwork/blob/dev/docs/desktop-app-policies.md#L3-L130`
- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L240-L358`

## Contributor Caution

When touching runtime code, ask:

1. Is this local OpenCode, OpenWork server, Den cloud, or desktop bridge behavior?
2. Does the UI already have a server API it should consume?
3. Does the change respect workspace-scoped routing?
4. Does it alter auth/approval boundaries?
5. Does it need fraimz or another end-to-end proof because the user can observe it?
