# 05 — Checkpoints & Session Diff: The Undo Button Agentic Work Deserves

## What Kiro does

- **Checkpoints**: restore code *and* conversation to a prior point in the session — a safety net that makes users brave enough to let the agent run.
- **Diff review**: every agent change is reviewable as a diff; accept/reject before (supervised) or after (autopilot) the fact.

This is the feature that converts fear into usage. Users who know they can always step back stop babysitting.

## What OpenWork already has — this is the cheapest win in the whole set

| Ingredient | Evidence |
|---|---|
| Engine checkpointing | OpenCode `POST /session/{id}/revert` (to a message boundary), `POST /session/{id}/unrevert`, `snapshot` config (verified SDK 1.17.11) |
| Session-level diff | `GET /session/{id}/diff` + `session.diff` SSE event |
| Branching | `POST /session/{id}/fork` |
| **Already wired in the app's lib layer** | [opencode-session.ts](../../apps/app/src/app/lib/opencode-session.ts) calls `client.session.revert / unrevert / fork` — **the functions exist with no UI on top** |
| Server snapshot route | `GET /workspace/:id/sessions/:sessionId/snapshot` in [sessions.ts](../../apps/server/src/routes/sessions.ts) |
| Diff rendering | `DiffLines()` in [tool.tsx:101](../../apps/app/src/components/ui/tool.tsx) already renders unified diffs for `EditTool`/`ApplyPatchTool` |
| Panel infrastructure | `PanelTab` system in [panel-tab-store.ts](../../apps/app/src/react-app/domains/session/panel/panel-tab-store.ts); artifact editors for file content |

The engine feature is complete and the client bindings exist. The entire gap is **presentation and workflow**.

## Proposal

### 1. Checkpoint timeline

- Every user message boundary is an implicit checkpoint (that is OpenCode's revert granularity). Render a subtle timeline affordance in the transcript: hover a past user message → **"Restore to here"**.
- Restore = `session.revert({sessionID, messageID})`: files return to that state and the conversation truncates; a banner offers **Undo restore** (`unrevert`) until the next prompt.
- **"Branch from here"** sits next to restore (`session.fork(messageID)`) — explore an alternative without losing the current line. Forked sessions join the same session group.
- Named checkpoints (labels) as sugar: spec task boundaries ([01](./01-spec-driven-development.md)) and pre-hook-run points ([02](./02-agent-hooks.md)) auto-label checkpoints ("before task 2.1", "before hook keep-tests-fresh").

### 2. Session diff surface

- **Diff chip** on the session header: live "+128 −41 · 6 files" fed by `session.diff` events; click opens a **Changes panel** — new `PanelTab` kind `"diff"` alongside `"artifact" | "browser"`.
- Changes panel: file list with per-file stats → unified diff view (reuse `DiffLines`, upgrade to a virtualized diff component for large files); "open file" jumps to the artifact editor at the current version.
- Works identically for **hook runs** and **spec tasks**, giving every automation a reviewable changeset — the review-after ledger that makes Autopilot ([04](./04-autopilot-supervised-trust.md)) honest.

### 3. Per-file / per-hunk accept-reject (the honest part)

OpenCode's revert is session-scoped, message-granular; Kiro offers per-change accept/reject. Bridging options:

- **v1 (server-side, no engine change)**: "Reject this file" = server computes the inverse patch for that file from the session diff and applies it via the existing file APIs (workspace `files/content` write with optimistic concurrency, same rail as artifact saves). Recorded as an explicit "user reverted file X" event for audit. Hunk-level ships the same way once the diff panel gains hunk selection.
- **Upstream contribution**: propose file-scoped revert in OpenCode itself (`revert` with `paths?: string[]`) — the ejectable-ethos move; OpenWork's server-side fallback becomes the polyfill.

### 4. Cross-surface

- Orchestrator: `openwork session diff <id>`, `openwork session revert <id> --to <msg>` for headless parity (approvals CLI precedent).
- Router: a Slack thread's "show changes" returns the diff summary + top files (bounded), with a link into the desktop/web app.

## Why this beats Kiro

Kiro checkpoints live and die in the IDE session. OpenWork checkpoints are server state over OpenCode snapshots: restorable from any client, auditable (who restored what when), and composable with approvals — an org can require review of the *session diff* before a hosted worker's changes are exported. Plus `fork` gives branching Kiro doesn't surface at all.

## Phasing

| Phase | Scope | Size |
|---|---|---|
| MVP | Restore-to-here + undo banner on existing lib calls; diff chip + Changes panel over `session/diff` | **S** (highest DX-per-diff in the whole proposal set) |
| v1 | Branch-from-here UI, auto-labeled checkpoints from specs/hooks, virtualized diff view | S–M |
| v1.1 | Per-file reject via inverse patch + audit events; orchestrator verbs | M |
| Later | Hunk-level reject; upstream `paths[]` revert PR to OpenCode | M |

## Verification (fraimz)

Flow `checkpoint-restore`: prompt agent to add a function to a file → diff chip shows +N → open Changes panel, assert file listed with correct hunk → hover first user message → Restore to here → assert file content on disk reverted (server `files/raw`) → Undo restore → content returns → Branch from here → new session in same group with shared history → per-file reject on one of two changed files → only that file reverts.

## Open questions

1. Retention: how long do snapshots persist (OpenCode `snapshot` config) and what UI states when a checkpoint is no longer restorable? Surface honestly ("expired") rather than hiding.
2. Interaction with user's own git: if the user commits mid-session, restores must not cross the commit silently — detect via `file/status` and warn.
3. Diff panel default: auto-open on session idle in Autopilot mode? Recommended: yes for Autopilot, off for Review (already reviewed live).
