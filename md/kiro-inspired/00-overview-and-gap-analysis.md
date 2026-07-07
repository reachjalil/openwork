# 00 — Overview & Gap Analysis: Kiro DX on the OpenWork Stack

## Why this document set exists

Kiro (AWS) validated a thesis in 2025 that OpenWork is perfectly positioned to own in open source: **the value of an agentic coding product is shifting from "chat that edits files" to a structured workflow layer** — specifications with approval gates, event-driven automations, persistent steered context, graded autonomy, and reviewable checkpoints. Kiro built that layer inside a proprietary VS Code fork. OpenWork can build the same layer as **plain files + server APIs on top of OpenCode**, which makes it ejectable, scriptable, multi-surface (desktop, CLI, Slack/Telegram), and shareable — four things an IDE fork can never be.

This is not a proposal to become an IDE. It is a proposal to absorb Kiro's *workflow* DX while keeping OpenWork's identity: local-first, server-consumption-first, non-technical-user-friendly, powered by OpenCode.

## Kiro's DX pillars (what we are matching)

| # | Kiro pillar | What it actually is |
|---|---|---|
| 1 | **Specs** | Per-feature folder (`.kiro/specs/<feature>/`) with `requirements.md` (user stories + EARS acceptance criteria), `design.md` (architecture/interfaces), `tasks.md` (checkboxed task list). Three-phase workflow with explicit human approval between Requirements → Design → Tasks, then task-by-task agent execution with status tracking. |
| 2 | **Agent Hooks** | Event-driven agent runs stored in `.kiro/hooks/`: on file create/save/delete or manual button, run a natural-language instruction (e.g. "update the tests for the changed component"). |
| 3 | **Steering** | `.kiro/steering/*.md` context docs with YAML front-matter inclusion modes: `always`, `fileMatch` (glob-conditional), `manual` (referenced by name in chat). Default trio generated from the codebase: `product.md`, `tech.md`, `structure.md`. Can inline-reference workspace files. |
| 4 | **Autopilot vs Supervised** | One visible toggle: autonomous multi-file execution vs review-each-change. Plus a trusted-commands allowlist for shell execution. |
| 5 | **Checkpoints** | Restore code + conversation to a prior point in the session; per-change diff review with accept/reject. |
| 6 | **Context providers** | `#File #Folder #Problems #Terminal #Git Diff #Codebase #URL #Docs #Steering #Spec` + image paste in chat. |
| 7 | **MCP management** | Workspace + user-level `mcp.json`, enable/disable servers, per-tool auto-approve lists, tool status UI. |
| 8 | **Editor affordances** | Inline AI edit (Cmd+I), completions, problems panel — the IDE parts. |

## What the stack already has (verified)

### Engine: OpenCode `v1.17.11` (pinned in `constants.json`)

Verified against the installed SDK (`apps/app/node_modules/@opencode-ai/sdk/dist/gen/`):

| Primitive | Endpoint / config | Feeds proposal |
|---|---|---|
| Event bus (SSE) | `/event`, `/global/event` with `file.edited`, `file.watcher.updated`, `session.idle`, `session.created`, `todo.updated`, `permission.updated`, `lsp.client.diagnostics`, `vcs.branch.updated`, `command.executed`, `session.diff`… | Hooks (02), Checkpoints (05) |
| Built-in file watcher | `file.watcher.updated` event | Hooks (02) |
| Shell hooks | config `experimental.hook.file_edited` (glob→commands), `experimental.hook.session_completed` | Hooks (02) |
| Checkpoint/undo | `POST /session/{id}/revert`, `/session/{id}/unrevert`, plus `snapshot` config | Checkpoints (05) |
| Session diff | `GET /session/{id}/diff`, `session.diff` event | Checkpoints (05), Context (06) |
| Session fork | `POST /session/{id}/fork` | Specs (01), Checkpoints (05) |
| Todos | `GET/POST /session/{id}/todo`, `Todo {content, status: pending/in_progress/completed/cancelled}` | Specs (01) |
| Permissions | `POST /session/{id}/permissions/{permissionID}`, per-agent `permission: {edit, bash{glob→ask/allow/deny}, webfetch…}` | Autopilot (04) |
| Agents | `GET /agent` — named agents with `mode: primary/subagent/all`, own model + permission block | Specs (01), Autopilot (04) |
| Commands | `GET /command`, `POST /session/{id}/command`, `.opencode/commands/*.md` | Specs (01), Context (06) |
| Search | `GET /find` (text), `/find/file`, `/find/symbol` | Context providers (06) |
| Files | `GET /file`, `/file/content`, `/file/status` (git status) | Context providers (06) |
| LSP / diagnostics | `/lsp`, `lsp.client.diagnostics` event | `#problems` (06), Editing (08) |
| Formatter | `/formatter` | Editing (08) |
| PTY | `/pty` + events | `#terminal` (06) |
| MCP mgmt + OAuth | `/mcp`, `/mcp/{name}/auth`, `/auth/authenticate`, `/connect`, `/disconnect` | MCP parity (07) |
| Instructions | config `instructions[]` (extra context files), `AGENTS.md`, `POST /session/{id}/init` (generate AGENTS.md) | Steering (03) |
| Session init/summarize | `/session/{id}/init`, `/session/{id}/summarize` | Steering (03) |

**Conclusion: the engine gap is near zero.** Kiro's workflow layer maps onto existing OpenCode primitives almost 1:1. What's missing is product surface.

### Product: OpenWork today

From `README.md`, `AGENTS.md`, `apps/server/README.md`, and the app architecture docs:

- Desktop (Electron `apps/desktop`) + React 19/Vite UI (`apps/app`) with session chat, **todos rendered as an execution-plan timeline**, **permission requests with allow-once/always/deny**, templates, debug exports.
- `apps/server`: filesystem-backed API — workspaces, **plugins/skills/MCP/commands management**, audit/export/import, artifacts, file sessions, OpenCode proxy, **host-approval gating on all writes**.
- `apps/orchestrator`: `openwork` CLI host (OpenCode + server + router), sandbox mode (Docker/Apple container), approvals CLI, file sessions.
- `apps/opencode-router`: Slack/Telegram → OpenCode bridge.
- Skills manager (`.opencode/skills`), OpenCode plugin management via `opencode.json`, extension-manifest direction (`docs/extensions-manifest-foundation.md`) where **`hooks` is already a declared resource type**.
- Capability router trajectory (`search_capabilities` / `execute_capability`, PRs #2438/#2472) — the anti-context-stuffing architecture.
- Cloud/Den: hosted workers, desktop policies, enterprise controls.

## Gap matrix

| Kiro capability | Engine primitive (OpenCode 1.17.11) | OpenWork surface today | Gap | Proposal |
|---|---|---|---|---|
| Specs w/ approval gates | todos, fork, agents, commands, `instructions` | Todos timeline renders per-session plan; templates; no durable spec artifact, no gates | **Product layer missing** | [01](./01-spec-driven-development.md) |
| Agent hooks | Full SSE event bus, file watcher, `experimental.hook` (shell only) | None user-facing; extension manifest reserves `hooks` resource | **Product layer missing; engine 90% there** | [02](./02-agent-hooks.md) |
| Steering | `instructions[]`, AGENTS.md, `session/init` | AGENTS.md respected via OpenCode; no UI, no inclusion modes, no generation flow | **Structured layer + UI missing** | [03](./03-steering-and-project-context.md) |
| Autopilot/Supervised | Per-agent `permission` blocks with bash glob policies | Permission prompts surfaced 1-by-1; `OPENWORK_APPROVAL_MODE=auto` env; no named modes, no trusted-commands UI | **Naming + UI + policy layer missing** | [04](./04-autopilot-supervised-trust.md) |
| Checkpoints | `revert`/`unrevert`/`diff`/`fork`, snapshots | Not exposed in UI | **UI missing over complete engine feature** | [05](./05-checkpoints-and-session-diff.md) |
| Context providers | `find`, `find/file`, `find/symbol`, `file/content`, `file/status`, `lsp`, `pty`, session diff | Composer sends text; file mentions minimal; no `#problems`/`#git-diff`/`#codebase`/`#url` | **Composer + resolution layer missing** | [06](./06-context-providers.md) |
| MCP per-tool trust | `/mcp` CRUD + OAuth endpoints, permission config | MCP add/manage exists (server + settings UI); no per-tool auto-approve UX, no health dashboard | **Trust granularity + diagnostics missing** | [07](./07-mcp-and-tool-trust-parity.md) |
| Editor affordances | `lsp`, `formatter`, file sessions, artifacts | Artifact preview/edit maturing (PR #2470 text artifacts) | **Deliberately partial — we are not an IDE** | [08](./08-inline-editing-and-file-experience.md) |

## Where OpenWork should *beat* Kiro, not just match it

1. **Multi-surface workflows.** A spec authored on desktop is executable from the orchestrator TUI and reviewable from Slack — because everything is a server API + plain files. Kiro workflows die outside the IDE window.
2. **Approval as infrastructure.** OpenWork server already gates writes behind host approvals with an audit trail; Kiro's trust model is IDE-local toggles. Enterprise desktop policies (Den) can *centrally* set autonomy ceilings — Kiro has nothing comparable in-product.
3. **Search/execute beats context-stuffing.** Kiro pastes MCP tools and steering into context. OpenWork's capability-router direction (#2438/#2472) means hooks/specs/steering become *discoverable capabilities* — cheaper, safer, more scalable.
4. **Ejectability as a guarantee.** Every artifact proposed here is markdown/JSON in the workspace under `.opencode/`. Delete OpenWork and OpenCode still reads your steering, commands, and (with a community plugin) your specs and hooks. That is a marketing line Kiro cannot say.
5. **Non-technical reach.** Kiro's specs assume you read code. OpenWork's spec/hook UX must be legible to an operations manager: plain-language requirement cards, "when X happens, do Y" hook builder, no YAML required.

## Guiding principles for all proposals

1. **Ejectable artifacts**: plain files in `.opencode/` (specs, hooks, steering) — never a proprietary DB as source of truth. SQLite/server state is an index/cache, not the record.
2. **Server-consumption first** (AGENTS.md): each feature lands as `apps/server` routes + `packages/types` contracts first; `apps/app`, orchestrator, and router consume them.
3. **No parallel engine**: use OpenCode sessions/events/permissions/todos as the execution substrate. Where OpenCode grows an equivalent primitive later, migrate down to it.
4. **Graded autonomy is a policy, not a vibe**: every automation (hook run, autopilot task) resolves to an explicit OpenCode permission profile + OpenWork approval scope, auditable after the fact.
5. **Proof culture**: each proposal defines its fraimz flow (`evals/`) before implementation, per AGENTS.md demo-driven development.

## Phasing at a glance (detail in [09](./09-implementation-roadmap.md))

- **Phase 1 — Expose what exists (weeks):** Checkpoints UI (05), context providers over `find`/`file`/`lsp` (06), named execution modes over permissions (04). Small diffs, huge perceived-DX jump.
- **Phase 2 — The workflow layer (1–2 months):** Steering (03) then Specs (01) — steering is a dependency of good spec generation. Hooks MVP (02) with manual + file-save triggers.
- **Phase 3 — Differentiation (2+ months):** Hooks × router (Slack-triggered automations), specs × Den (shared team specs), capability-router integration, enterprise policy ceilings for autonomy.
