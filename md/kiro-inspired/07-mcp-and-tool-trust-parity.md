# 07 — MCP & Tool Trust: Parity on Management, Superiority on Routing

## What Kiro does

- Workspace (`.kiro/settings/mcp.json`) + user-level MCP config, editable in-product.
- Enable/disable servers; reconnect; tool list per server.
- **Per-tool auto-approve lists** (`autoApprove: ["toolA"]`) so trusted tools skip prompts while the rest ask.
- Tool invocation transcript entries users can inspect.

Kiro's weakness: every enabled server's tools are pasted into model context — cost and confusion grow linearly with servers installed.

## What OpenWork already has

| Ingredient | Evidence |
|---|---|
| MCP management UI + API | [mcp-view.tsx](../../apps/app/src/react-app/domains/settings/pages/mcp-view.tsx) settings page; server manages `mcp` key in `opencode.json` ([portable-opencode.ts](../../apps/server/src/portable-opencode.ts)); dual project/global scope |
| Engine MCP surface incl. OAuth | SDK 1.17.11: `/mcp`, `/mcp/{name}/auth`, `/mcp/{name}/auth/authenticate`, `/auth/callback`, `/connect`, `/disconnect` — **MCP OAuth flows exist at the engine level** |
| Live tool-change events | `mcp.tools.changed` coalesced per server in [global-sdk-provider.tsx](../../apps/app/src/react-app/kernel/global-sdk-provider.tsx) |
| Hot reload | reload-watcher tracks `mcp` as a `ReloadReason`; `POST /workspace/:id/engine/reload` |
| Permission rail | Same ask/allow/deny machinery as doc [04](./04-autopilot-supervised-trust.md) |
| Marketplace/packaging direction | Extensions manifest: MCP servers are a declared extension resource with setup/test actions (`docs/extensions-manifest-foundation.md`) |
| The anti-context-stuffing plan | Capability router: `search_capabilities` / `execute_capability` (`docs/memory-bank-architecture.md`, PRs #2438/#2472) |

## The gap

1. **Trust granularity**: no per-tool ask/allow/deny — MCP tool calls fall through generic permissions; there is no equivalent of Kiro's `autoApprove` per tool, and no UI to see which tools a server exposes before trusting it.
2. **Operability**: no health dashboard — connection state, auth expiry, last error, tool count, latency. Issue history shows MCP/config failures surfacing as opaque "OpenCode unavailable" errors.
3. **Auth UX**: engine OAuth endpoints exist with no product flow around them (connect → browser → callback → connected badge).

## Proposal

### 1. Tool-level trust matrix

- Extend the permission model surface: `server → tool → ask | allow | deny`, persisted in the managed `opencode.json` permission section (or per-agent blocks) via the runtime config store — same durable-trust store and provenance/revoke UI as trusted commands ([04](./04-autopilot-supervised-trust.md), Settings → Trust gets an "MCP tools" section).
- Permission modal for MCP calls shows: server, tool, arguments (typed rendering like existing bash/edit cases), and **Always allow this tool** scoped workspace/global.
- Execution-mode interaction: Review mode asks per call; Autopilot consults the matrix; Full autopilot still honors explicit `deny` rows.
- Verify the exact OpenCode 1.17 config shape for per-tool MCP permissions against the pinned engine; where the engine lacks granularity, enforce at the server proxy layer and file the upstream issue (polyfill-then-upstream, same pattern as doc 05).

### 2. MCP health & diagnostics panel

Upgrade `mcp-view` from a config list to an ops surface:

- Per server: status (connected/connecting/error/auth-required), transport, tool count (live via `mcp.tools.changed`), last error with timestamp, "test connection" (extension manifests already model test actions).
- **Re-authenticate CTA** driving the engine OAuth endpoints end-to-end; token expiry surfaced before it breaks a session.
- **Tool browser**: expand a server → tool list with descriptions + JSON-schema-rendered argument forms + "Try it" (runs through the normal permission rail, output shown inline). This is discoverability Kiro lacks — users learn what they installed.
- Failure classification: config-schema errors, spawn failures, and auth failures get distinct, actionable messages (directly addresses the "config schema mismatch → OpenCode unavailable" class of open issues).

### 3. Routing: the structural win

Do **not** replicate Kiro's inject-everything model as server count grows. Alignment with the capability-router direction:

- Each MCP tool becomes a capability card (name, description, cost/permission hints, server shard). The harness gets `search_capabilities` / `execute_capability`; only selected tools enter context.
- The trust matrix becomes *card policy* — one policy plane across MCP tools, UI actions, server capabilities, and cloud capabilities, instead of Kiro's per-config-file allowlists.
- Diagnostics unify too: a failed `execute_capability` reports through one channel regardless of whether the capability was MCP, skill, or UI action.

Net pitch: **Kiro manages MCP servers; OpenWork operates a capability plane** — cheaper contexts, uniform policy, one diagnostics surface.

### 4. Distribution

MCP servers install as **extensions** (manifest resource + setup + secrets + test action) — the already-planned path (Handsfree/Voice PR stack). Parity with Kiro's "add from directory" arrives via the extensions catalog rather than a bespoke MCP directory; `suggest`-style curated defaults per workspace type.

## Phasing

| Phase | Scope | Size |
|---|---|---|
| MVP | Health states + last-error + reconnect/reauth CTAs in mcp-view; permission modal typed MCP rendering | S–M |
| v1 | Per-tool trust matrix + Trust settings section; tool browser with try-it | M |
| v1.1 | Failure classification, extension-manifest install path as default | S–M |
| Later | Capability-card routing once #2438/#2472 land; org-pushed MCP trust policy via Den | M |

## Verification (fraimz)

Flow `mcp-trust`: add a fixture MCP server → status connected, tool count shown → invoke a tool from chat → ask modal shows server/tool/args → Always allow (workspace) → assert persisted config on disk → second call silent → set tool to deny → call refused with visible reason → kill the fixture server → health shows error state with actionable message → re-add auth-required fixture → OAuth flow completes → badge flips to connected.

## Open questions

1. Where per-tool policy lives: engine config vs server-proxy enforcement — decide after verifying OpenCode 1.17 MCP permission granularity (see §1).
2. Should "Try it" be gated behind Review mode always? Recommended: yes — trial calls are exactly the case for review.
3. Latency/health polling budget for many servers — piggyback on existing health polling cadence in [server-provider.tsx](../../apps/app/src/react-app/kernel/server-provider.tsx) rather than a new poller.
