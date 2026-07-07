# 21 — Host-Stack Code Graph (`apps/server`, `apps/orchestrator`, `apps/opencode-router`)

> The three Bun binaries that make OpenWork work locally with one launch. Verified at
> HEAD `49d3f9ec`. Change recipes: `17-change-recipes.md` §C. Startup trace: `18-data-flows.md` Flow F.

---

## `apps/server` — `openwork-server` (filesystem workspace API)

**Entry:** `src/cli.ts` (bin `openwork-server`, wrapper `bin/openwork-server.mjs`). **Core:** `src/server.ts` (large request handler). **Independent** of the desktop app; runs from source or as a compiled binary. **All writes are gated by host approval.**

### src/ map (by concern)

| Concern | Files |
|---|---|
| Boot / config | `cli.ts`, `config.ts` (`parseCliArgs`, `resolveServerConfig`), `server.ts`, `serve-node.ts`, `paths.ts`, `types.ts`, `errors.ts` |
| Auth / approval | `approvals.ts` (`ApprovalService`), `tokens.ts` (`TokenService`) |
| Workspaces | `workspaces.ts`, `workspace-init.ts`, `openwork-workspace-config-store.ts`, `workspace-export-safety.ts`, `workspace-import-preview.ts`, `authorized-folders` (in routes/core) |
| OpenCode integration | `opencode-connection.ts`, `managed-opencode.ts`, `portable-opencode.ts`, `opencode-proxy-gate.ts`, `opencode-db.ts` |
| Runtime config | `runtime-opencode-config-store.ts`, `runtime-provider-merge.*`, `runtime-config-migrate.*`, `openwork-runtime-config.ts`, `jsonc.ts`, `frontmatter.ts` |
| Skills / commands | `skills.ts`, `skill-hub.ts`, `commands.ts` |
| Plugins / extensions | `plugins.ts`, `cloud-plugins.ts`, `claude-plugin-bundle.ts`, `extensions/{index,google-workspace,openai-image-generation}.ts`, `extensions-export.ts` |
| MCP | `mcp.ts` |
| Files / sessions | `file-sessions.ts`, `portable-files.ts`, `session-read-model.ts`, `session-groups.ts`, `blueprint-sessions.ts` |
| Audit / reload | `audit.ts`, `events.ts`, `reload-fingerprint.ts`, `reload-watcher.ts` |
| Sync / env | `desktop-cloud-sync.ts`, `env-file.ts` (`EnvService`), `validators.ts` |

### Routes (`src/routes/`, registered via `registry.ts`)

| Route file | API groups |
|---|---|
| `core.ts` | health/status/whoami/capabilities, tokens, env, plugins, skills, MCP, commands, audit, runtime-config, opencode-config, cloud-plugins, desktop-cloud-sync, authorized-folders |
| `workspaces.ts` | list, config, import/preview, import, export |
| `sessions.ts` | sessions read/list, session-groups CRUD/reorder |
| `files.ts` | inbox, artifacts, file content/stat/raw, **file sessions** (create/renew/close/catalog/read-batch/write-batch/ops) |
| `operations.ts` | engine reload, approvals (list/respond) |

**Approval gate:** `approvals.ts::ApprovalService.requestApproval()` — called before file writes/deletes/command exec in `routes/files.ts`. Modes: `manual` | `auto` (`OPENWORK_APPROVAL_MODE`).

---

## `apps/orchestrator` — `openwork-orchestrator` (host CLI, installs `openwork`)

**Entry:** `src/cli.ts` (bin `openwork`, wrapper `bin/openwork`). Deliberately **monolithic** — one large `cli.ts` handles arg parsing, sidecar resolution, sandbox, health, logging, downloads. TUI: `src/tui/app.tsx` (OpenTUI + Solid).

| Concern | Where (`src/cli.ts` unless noted) |
|---|---|
| Sidecar resolve/spawn | `resolveSidecarConfig`, `spawnProcess`, `downloadSidecarBinary`, `resolveOpencodeDownload` (version ← `constants.json`), `probeCommand`, `fetchRemoteManifest` |
| Sandbox mode | `resolveSandboxMode` (none/auto/docker/container), `resolveSandboxExtraMounts` |
| Health / daemon | health checks, `WorkerActivityHeartbeatConfig`, multi-workspace routing |
| Logging | `Logger` (pretty/json), stream prefixing, optional `/dev/log` sink |
| TUI | `src/tui/app.tsx` — service status, connect info, router health, logs |

Depends on (and spawns) `openwork-server` + `opencode-router` + `opencode`; all consume `@opencode-ai/sdk`.

---

## `apps/opencode-router` — `opencode-router` (Slack/Telegram bridge)

**Entry:** `src/cli.ts` (bin `opencode-router`). Config + SQLite under `~/.openwork/opencode-router/`.

| Concern | Files |
|---|---|
| Core bridge | `bridge.ts` (message routing, adapters), `events.ts`, `delivery.ts` |
| Channels | `slack.ts` (`createSlackAdapter`, Socket Mode + Web API), `telegram.ts` (`createTelegramAdapter`, grammy), `text.ts` (chunking) |
| Media | `media.ts` (In/Outbound parts), `media-store.ts` |
| Routing | `opencode.ts` (`createClient(directory)`, permission rules), `path-scope.ts`, `config.ts` |
| Store | `db.ts` (`BridgeStore` SQLite: sessions, bindings, allowlist, settings) |
| Admin | `health.ts` (health + `/identities/{slack,telegram}` CRUD, groups-enabled), `logger.ts` (pino) |

**Routing key:** `(channel, identityId, peerId) → directory` binding. Private Telegram bots require `/pair <code>`.

---

## Cross-boundary

```text
orchestrator ⇒ spawns server, router, opencode (child processes, env-configured)
router       ⇒ OpenCode server (per-workspace client)   ; ⇒ server (approvals, indirectly)
all three    → @opencode-ai/sdk ; server → @openwork/types
```
