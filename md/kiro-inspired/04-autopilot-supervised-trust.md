# 04 — Autopilot, Supervised Mode & Trusted Commands: Graded Autonomy as Policy

## What Kiro does

One always-visible toggle with two positions:

- **Autopilot** — the agent modifies files across the workspace autonomously; you review after.
- **Supervised** — every change waits for approval; you step through the run.

Plus **trusted commands**: shell execution prompts by default; users promote specific commands/patterns to an allowlist that runs without asking. Simple, legible, and it is how Kiro answers "can I trust this thing?" — the trust dial is *the* product decision an agentic tool makes.

## What OpenWork already has

| Ingredient | Evidence |
|---|---|
| Fine-grained engine policy | OpenCode per-agent `permission` block: `edit: ask/allow/deny`, `bash: {glob → ask/allow/deny}`, `webfetch`, `doom_loop`, `external_directory` (SDK 1.17.11 `Agent` type); scalar form works too (this repo's own [.opencode/opencode.json](../../.opencode/opencode.json) sets `"permission": "allow"`) |
| Per-request UI | [permission-approval-modal.tsx](../../apps/app/src/react-app/domains/session/chat/permission-approval-modal.tsx): allow **once / always / reject**, typed rendering for bash/edit/read/external_directory/task/todowrite/question/skill, doom-loop handling |
| Config write path | `permission` is a managed key in [portable-opencode.ts](../../apps/server/src/portable-opencode.ts); writes via [runtime-opencode-config-store.ts](../../apps/server/src/runtime-opencode-config-store.ts) + engine reload |
| Server approval rail | approvals state machine (`GET /approvals`, `POST /approvals/:id`), `OPENWORK_APPROVAL_MODE=auto` for dev; orchestrator approvals CLI |
| Enterprise policy delivery | [desktop-policies.ts](../../packages/types/src/den/desktop-policies.ts) — Den-delivered allow/deny policy catalog enforced client-side |
| Safe substrate | Orchestrator **sandbox mode** (Docker / Apple `container`) mounting the workspace into a container boundary |
| Audit | Server audit/export routes; README: "Auditable: show what happened, when, and why" |

## The gap

Every primitive exists; **none of it is legible**. Specifically:

1. "Always" in the permission modal persists only for the session — users re-approve `pnpm test` forever. No durable trusted-commands store, no UI to review/revoke trust.
2. No named autonomy levels — users can't answer "what will it do without asking me?" without reading OpenCode config docs. There is no global mode state in the app at all (verified: no yolo/auto-accept concept in `apps/app`).
3. No policy ceiling — nothing stops a hook or a shared workspace from being configured to full-auto in an org that forbids it.

## Proposal

### 1. Three named execution modes (product vocabulary, not new engine)

| Mode | Plain-language promise | Compiles to (OpenCode permission profile) |
|---|---|---|
| **Review** (default) | "Asks before changing anything" | `edit: ask`, `bash: {"*": ask}`, `webfetch: ask` |
| **Autopilot** | "Works ahead inside this project; asks for anything risky" | `edit: allow` (workspace-scoped), `bash: trusted-list → allow, "*": ask`, `external_directory: ask/deny` |
| **Full autopilot** | "Doesn't ask. Use in a sandbox." | `edit/bash/webfetch: allow` — **only offered when sandboxed or explicitly policy-permitted** |

Modes are *presets over the existing permission schema* — power users can still hand-tune; the preset picker shows the resulting profile ("This mode allows: editing files here; running: pnpm …, git status …").

Mechanics: mode is chosen per **workspace** (default) and overridable per **session** and per **automation** (hook runs and spec tasks declare a mode — [02](./02-agent-hooks.md), [01](./01-spec-driven-development.md)). The server materializes the profile through the runtime config store / per-agent permission blocks; no client-side enforcement invention (server-consumption-first).

### 2. Trusted commands: promote "always" into a durable, reviewable store

- The modal's **Always allow** gains scope: *this session* (today's behavior) / *this workspace* / *everywhere*. Workspace scope writes a glob rule into project `opencode.json` `permission.bash`; global scope into the global config — both already managed files.
- Command generalization on promote: suggest the pattern (`pnpm test` → `pnpm test *`), never auto-widen beyond the suggestion the user accepts.
- **Settings → Trust**: table of every durable rule — pattern, scope, provenance (who/when/from which session), hit count (from audit) — with revoke. This answers Kiro's trusted-commands UI and exceeds it with provenance.
- Deny rules are first-class too (`git push*: deny` stays deniable even in Full autopilot).

### 3. Policy ceilings (enterprise; beats Kiro outright)

Extend the Den desktop-policy catalog with:

- `maxExecutionMode: review | autopilot | full` — UI hides/disables anything above the ceiling; server refuses to materialize profiles above it (enforced host-side, not just client-side).
- `trustedCommandCeiling`: org-curated allowlist that workspace rules cannot exceed.
- `requireSandboxForFullAutopilot: true` — full autonomy only inside orchestrator sandbox mode.

Delivery/enforcement piggybacks the existing `GET /v1/me/desktop-config` flow. Kiro has org admin *settings*, but no local-runtime policy enforcement of autonomy with audit — this is OpenWork's enterprise wedge.

### 4. UX details that make it legible

- **Mode selector in the composer**, adjacent to the existing agent/model pickers ([composer.tsx](../../apps/app/src/react-app/domains/session/surface/composer/composer.tsx)) — one glance answers "what can it do right now?"; command-palette action to switch.
- **Run-ahead ledger in Autopilot**: since asks are suppressed, the session surface shows a running "changed 4 files · ran 2 commands" chip linking to the session diff ([05](./05-checkpoints-and-session-diff.md)) — review-after replaces review-before, it doesn't disappear.
- **Doom-loop and risk asks never auto-allow** in Autopilot (destructive patterns list: `rm -rf`, force-push, credential files) — a small hardcoded floor beneath user config.
- **Non-technical copy**: modes phrased as promises (above), not permission matrices.

## Phasing

| Phase | Scope | Size |
|---|---|---|
| MVP | Mode presets + composer selector + profile materialization via runtime config store; modal "always" → workspace scope | M |
| v1 | Trust settings table w/ provenance + revoke, pattern-suggest on promote, run-ahead ledger | M |
| v1.1 | Den policy ceilings (`maxExecutionMode`, sandbox requirement), audit hit counts | M |
| Later | Per-directory profiles, anomaly nudges ("this session asked for 3 unusual scopes") | M |

## Verification (fraimz)

Flow `modes-and-trust`: Review mode → ask agent to edit a file → modal appears → switch workspace to Autopilot → same edit proceeds without ask, run-ahead chip increments → agent runs `pnpm test` → ask appears → "Always (workspace)" → assert `opencode.json` gains `permission.bash["pnpm test*"] = "allow"` on disk → re-run without ask → revoke in Trust settings → ask returns → set Den policy ceiling `review` (test fixture) → Autopilot option disabled with explanation.

## Open questions

1. Naming: "Review / Autopilot / Full autopilot" vs OpenCode-community "ask/allow". Recommended: the three product names mapping transparently onto OpenCode config (shown in UI).
2. Does `edit: allow` in OpenCode 1.17 scope to workspace root reliably (`external_directory` covers escapes)? Verify against pinned version; if gaps, keep `external_directory: deny` in Autopilot preset.
3. Should session-scoped mode override persist across app restart? Recommended: yes (it's route/session state on the server, not localStorage).
