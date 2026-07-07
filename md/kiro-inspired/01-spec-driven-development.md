# 01 — Spec-Driven Development: Kiro Specs on OpenCode Rails

## What Kiro does

Kiro's flagship feature. For each feature you build, Kiro maintains `.kiro/specs/<feature>/`:

1. **`requirements.md`** — user stories, each with acceptance criteria in **EARS notation** ("WHEN a user submits a form with an empty field, THE SYSTEM SHALL display a validation error"). Generated from a single prompt, then human-edited.
2. **`design.md`** — technical design: architecture, interfaces, data models, diagrams — generated *after* requirements are approved, grounded in the actual codebase.
3. **`tasks.md`** — a checkboxed, dependency-ordered task list, each task tracing back to requirement IDs. Tasks are executed one at a time ("Start task" button), with live status (pending → in progress → done) and a reviewable diff per task.

The critical mechanic is the **approval gate**: the agent cannot advance Requirements → Design → Tasks → Execution without explicit human sign-off at each boundary. This converts "vibe coding" into an auditable workflow — and it is the reason teams adopt Kiro.

## What OpenWork already has

| Ingredient | Where it lives today |
|---|---|
| Task plans rendered in UI | OpenCode todos (`/session/{id}/todo`, `todo.updated` SSE) rendered via [todowrite.tsx](../../apps/app/src/components/tools/todowrite.tsx) and the execution-plan timeline (README "Execution plan") |
| Named agents with own model/permissions | `.opencode/agents/*.md` (see [executor.md](../../.opencode/agents/executor.md), [orchestrator.md](../../.opencode/agents/orchestrator.md)) — front-matter: `description`, `mode`, `model`, `variant` |
| Reusable prompt templates | `.opencode/commands/*.md` materialized by [commands.ts](../../apps/server/src/commands.ts) (front-matter: `name`, `description`, `template`, `agent`, `model`, `subtask`) + README "Templates" |
| Approval state machine | `GET /approvals`, `POST /approvals/:id` in [operations.ts](../../apps/server/src/routes/operations.ts) — all server writes already gate on host approval |
| Session grouping | `GET/POST /workspace/:id/session-groups` (+ reorder/assign) in [sessions.ts](../../apps/server/src/routes/sessions.ts) |
| Session branching | `client.session.fork()` already wired in [opencode-session.ts](../../apps/app/src/app/lib/opencode-session.ts) |
| Config/file watching + reload | [reload-watcher.ts](../../apps/server/src/reload-watcher.ts) watches `.opencode/`, `POST /workspace/:id/engine/reload` |
| Doc-generation skills precedent | Default skills already include `skill-creator`, `command-creator`, `agent-creator` ([skills-view.tsx](../../apps/app/src/react-app/domains/settings/pages/skills-view.tsx)) |

The README literally states the goal: *"OpenWork is designed around the idea that you can easily ship your agentic workflows for your team as a repeatable, productized process."* Specs **are** that productized process. Today the closest artifact is a session-scoped todo list that dies with the session, plus free-form templates.

## The gap

- No durable, versionable artifact representing "what we agreed to build."
- No phase gates — a prompt goes straight to execution.
- No task-level execution loop with per-task diffs and resumability.
- No trace from task → requirement → conversation.

## Proposal

### 1. Artifact layout (ejectable by construction)

```
<workspace>/.opencode/specs/<feature-slug>/
├── spec.json          # state machine + metadata (phase, approvals, task status cache)
├── requirements.md    # user stories + EARS acceptance criteria
├── design.md          # technical design, grounded in codebase
└── tasks.md           # "- [ ] 1.2 Implement X (req: 1.1, 2.3)" checkboxes
```

- Markdown files are the **source of truth** and human-editable in any editor; `spec.json` holds only workflow state (`phase: requirements|design|tasks|executing|done`, approval timestamps, task→session links). If `spec.json` is deleted, the spec degrades gracefully to three readable markdown files — pure OpenCode users lose nothing.
- Checkbox state in `tasks.md` is canonical for done/not-done (agent writes `- [x]` on completion), so `git diff` shows progress and the files remain the record.
- Lives under `.opencode/` alongside `skills/`, `commands/`, `agents/` — the reload-watcher already watches this tree, so external edits propagate.

### 2. Server surface first (`apps/server`)

New route module `src/routes/specs.ts`, registered via the existing [registry.ts](../../apps/server/src/routes/registry.ts) pattern; types in `packages/types/src/specs.ts`:

```
GET    /workspace/:id/specs                      # list + phase summaries
POST   /workspace/:id/specs                      # create (name, initial prompt)
GET    /workspace/:id/specs/:slug                # full spec (parsed md + state)
PUT    /workspace/:id/specs/:slug/:doc           # write requirements|design|tasks (optimistic concurrency, same model as artifacts)
POST   /workspace/:id/specs/:slug/approve        # gate transition {phase} — routed through the EXISTING approvals state machine
POST   /workspace/:id/specs/:slug/tasks/:taskId/start   # spawn/attach execution session
POST   /workspace/:id/specs/:slug/sync           # re-derive tasks.md status from code/sessions ("update from code")
GET    /workspace/:id/specs/:slug/events         # cursor-polled events (reuses ReloadEventStore pattern)
```

Phase approvals are recorded as OpenWork approvals (`POST /approvals/:id`), which means: they show in the audit trail, they work from the orchestrator approvals CLI, and remote/host separation is inherited for free.

### 3. Generation: three subagents, not one mega-prompt

Ship three OpenWork-managed agents (installed like today's default skills, editable by users):

- `.opencode/agents/spec-requirements.md` — interviews the user, emits EARS-formatted `requirements.md`. EARS templates baked into the prompt (WHEN/WHILE/WHERE/IF … THE SYSTEM SHALL …).
- `.opencode/agents/spec-design.md` — reads requirements + codebase (via `/find`, `/find/symbol`, `file/content`) and steering docs ([03](./03-steering-and-project-context.md)), emits `design.md`.
- `.opencode/agents/spec-tasks.md` — emits `tasks.md` with requirement back-references and dependency ordering.

Each phase runs as a normal OpenCode session so users watch it stream, interrupt, and redirect — nothing is a black box. `session.fork()` gives "explore an alternative design" branching for free.

### 4. Execution loop

"Start task" creates (or resumes) an OpenCode session per task:

- Prompt = task text + linked requirement excerpts + design excerpt (assembled server-side; goes through the capability router when that lands rather than pasting whole docs).
- The session is assigned to a **session group named after the spec** (existing session-groups API), so the sidebar naturally shows "Spec: checkout-flow → task sessions".
- On `session.idle` with success, server writes `- [x]` to `tasks.md`, links the session ID in `spec.json`, and (with [05](./05-checkpoints-and-session-diff.md)) records the session diff as the task's reviewable changeset.
- Execution honors the workspace's execution mode ([04](./04-autopilot-supervised-trust.md)): Supervised = every task pauses for diff review; Autopilot = tasks chain until a permission ask or failure.

### 5. UI (`apps/app`)

- **Spec panel**: extend the `PanelTab` union in [panel-tab-store.ts](../../apps/app/src/react-app/domains/session/panel/panel-tab-store.ts) (`"artifact" | "browser"` → add `"spec"`). Renders the three docs as tabs with the existing artifact markdown editor, plus a phase stepper (Requirements ▸ Design ▸ Tasks ▸ Build) with an **Approve & continue** button per gate.
- **Task list**: checkbox list with per-task status chips, "Start", "Open session", "View diff". Reuses todo timeline visuals.
- **Composer**: `#spec` mention — extend `ComposerMentionKind` (`"agent" | "file" | "app"`) in [mention-encoding.ts](../../apps/app/src/react-app/domains/session/surface/composer/mention-encoding.ts) so any chat can pull spec context ([06](./06-context-providers.md)).
- **Command palette**: "New spec", "Open spec", "Start next task" ([command-palette.tsx](../../apps/app/src/react-app/shell/command-palette.tsx)).
- **Plain-language mode** (non-technical users, per AGENTS.md): the same artifacts presented as "Plan" — requirement cards with plain-English acceptance checks, no EARS jargon on the surface (EARS stays in the file).

### 6. Multi-surface (beat Kiro here)

- **Orchestrator**: `openwork spec list|create|approve|run <slug>` — headless spec execution on a server with approvals via the existing approvals CLI. Kiro cannot run a spec without the IDE open.
- **Router**: Slack `/openwork spec status checkout-flow`; phase-gate approval requests delivered as Slack messages (approvals already flow through the server). PM approves requirements from their phone.
- **Den**: a spec folder is trivially shareable/importable (it is files) — org spec templates in the marketplace, "productized process" fulfilled.

## Why build on this rather than adopt Kiro's format?

Adopt the *shape* (three docs + gates) and stay file-compatible in spirit, but bind status to OpenWork rails (approvals, session groups, todos) that Kiro lacks. A migration script `kiro import` that copies `.kiro/specs/*` into `.opencode/specs/*` is a cheap win for switchers.

## Phasing

| Phase | Scope | Size |
|---|---|---|
| MVP | Artifact layout + server CRUD + spec panel (read/edit) + generation agents, manual execution ("send task to chat") | M |
| v1 | Approval gates via approvals API, task runner + session groups + status writeback, `#spec` mention | M |
| v1.1 | Orchestrator CLI verbs, sync-from-code, checkpoint-per-task integration | S–M |
| Later | Router/Slack approvals, Den spec sharing, capability-router context assembly | M |

## Verification (fraimz)

Flow `spec-happy-path`: create spec from prompt → requirements stream in → edit one acceptance criterion → approve → design generated referencing a real file → approve → tasks listed → start task 1 → diff appears → checkbox flips in `tasks.md` on disk (assert file content) → second workspace client sees the same state via server API.

## Open questions

1. Naming for non-technical users: "Specs" vs "Plans" in UI copy (files stay `specs/`).
2. Should phase gates be *optional* per workspace (a "lightweight mode" that skips design for small features)? Recommended: yes, gates configurable in `spec.json`, default on.
3. Task-session model: one session per task (clean diffs, more overhead) vs one session per spec (cheaper, muddier diffs). Recommended: per task, with `session.fork` from a shared context-primed root.
