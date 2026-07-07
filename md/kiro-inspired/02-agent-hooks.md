# 02 — Agent Hooks: Event-Triggered Automations on the OpenCode Event Bus

## What Kiro does

Agent Hooks are event-driven automations stored in `.kiro/hooks/`: when a file is **created / saved / deleted**, or when a user **clicks a manual trigger button**, Kiro runs a natural-language instruction through the agent. Canonical examples:

- On save of `*.tsx` → "update the corresponding test file to cover the changed props."
- On save of `README.md` → "fix spelling and grammar, keep the diff minimal."
- On save of `locales/en.json` → "propagate new keys to all other locale files."
- Manual button → "scan this project for OWASP top-10 issues and report."

Hooks are the "delegate the boring reflexes" feature — the single biggest *retention* feature Kiro has, because value accrues passively.

## What OpenWork already has (the engine is 90% there)

| Ingredient | Evidence |
|---|---|
| A full event bus | OpenCode SSE `/event`: `file.edited`, `file.watcher.updated`, `session.idle`, `session.created`, `command.executed`, `vcs.branch.updated`, `todo.updated`, `lsp.client.diagnostics`… (verified in SDK 1.17.11 `types.gen.d.ts`) |
| A built-in file watcher | `file.watcher.updated` event + `watcher` recognized as a top-level config key in [portable-opencode.ts](../../apps/server/src/portable-opencode.ts) |
| Native shell hooks (rudimentary) | OpenCode config `experimental.hook.file_edited` (glob → shell commands) and `experimental.hook.session_completed` — shell-only, no agent, no UI |
| Server-side watch/reload precedent | [reload-watcher.ts](../../apps/server/src/reload-watcher.ts): `fs.watch` on `.opencode/`, 750 ms debounce, typed `ReloadReason`, cursor-polled events at `GET /workspace/:id/events` |
| A declared-but-unsupported hooks slot | [claude-plugin-bundle.ts:292](../../apps/server/src/claude-plugin-bundle.ts) — *"This plugin declares hooks, which OpenWork does not support yet. Hooks were skipped."* — imported Claude plugins **already carry hook definitions we drop on the floor** |
| Extension manifest reserves hooks | `docs/extensions-manifest-foundation.md` lists `hooks` as a first-class extension resource |
| Approval + audit rails | Server approvals state machine, audit/export routes, host-gated writes |

So: events exist, watching exists, the extension system expects hooks, and imported plugins already declare them. **Nothing executes them.** This is the clearest single gap in the whole comparison.

## Proposal

### 1. Hook artifact (ejectable, human-writable)

`<workspace>/.opencode/hooks/<hook-name>.md` — same materialization pattern as [skills.ts](../../apps/server/src/skills.ts) and [commands.ts](../../apps/server/src/commands.ts):

```markdown
---
name: keep-tests-fresh
description: Update tests when a component changes
enabled: true
trigger:
  event: file.edited            # file.edited | file.created | file.deleted | manual
                                 # | session.idle | vcs.branch.updated | schedule
  glob: "src/components/**/*.tsx"
  debounce_ms: 2000
run:
  agent: executor                # any .opencode/agents entry
  mode: review                   # execution mode per doc 04: review | autopilot
  timeout_min: 10
guard:
  max_runs_per_hour: 12
  ignore_agent_edits: true       # don't fire on edits made by agent sessions
---
When {{file}} changes, open its test file (create one if missing following the
repo's testing conventions) and update it to cover the changed behavior.
Keep the diff minimal. Do not modify the source file itself.
```

- Body = natural-language instruction (the Kiro model). `{{file}}`, `{{event}}` interpolation.
- Global scope supported at `~/.config/opencode/hooks/` (same dual-scope convention as skills/commands).
- A hook is also installable as an **extension resource**, unblocking the skipped Claude-plugin hooks: the bundle importer maps compatible hook events instead of warning.

### 2. Server: hook engine (`apps/server/src/hooks.ts` + `src/routes/hooks.ts`)

- **Materializer**: parse/validate hook files (Zod schema in `packages/types/src/hooks.ts`); hot-reload via the existing reload-watcher (add `"hooks"` to `ReloadReason`).
- **Subscriber**: one SSE subscription to the workspace's OpenCode `/event` stream (the server already proxies OpenCode); match events → glob → debounce → enqueue.
- **Runner**: each firing creates an OpenCode session tagged `hook:<name>`, prompt = hook body + event payload, agent/model per front-matter. Concurrency cap per workspace (default 2); queue with coalescing (N saves → 1 run).
- **Ledger**: `hook_runs` table in the server's existing SQLite (id, hook, trigger payload, session id, status, started/ended) exposed at:

```
GET    /workspace/:id/hooks                 # list + enabled state + last run
POST   /workspace/:id/hooks                 # create from UI (writes the .md file)
PUT    /workspace/:id/hooks/:name           # edit / enable / disable
POST   /workspace/:id/hooks/:name/run       # manual trigger
GET    /workspace/:id/hooks/runs?since=     # run feed (ReloadEventStore cursor pattern)
```

### 3. Safety model (this must be stricter than Kiro)

1. **No self-oscillation**: runner ignores `file.edited` events originating from agent sessions when `ignore_agent_edits` is true (default) — match on the event's session provenance; additionally a per-hook cooldown and `max_runs_per_hour` circuit breaker with UI surfacing ("hook paused: rate limit").
2. **Hook-on-hook suppression**: events produced by a hook session never trigger the same hook; cross-hook chains capped at depth 1 by default.
3. **Permissions are inherited, not invented**: a hook run is an ordinary OpenCode session under the hook's declared execution mode ([04](./04-autopilot-supervised-trust.md)). In `review` mode a hook can *prepare* changes but its permission asks land in the approval queue — Slack/desktop notification, human clicks allow. `autopilot` hooks require the workspace to permit it (and Den policy can forbid it org-wide).
4. **Kill switch**: global "pause all hooks" toggle (workspace setting + orchestrator flag `--no-hooks`).
5. **Audit**: every run in the ledger, linked session inspectable like any chat; server audit/export includes hook runs.

### 4. UI (`apps/app`)

- **Hooks tab** in settings extensions section — extend `ExtensionsSection` (`"all" | "mcp" | "skills" | "plugins"`) in [extensions-view.tsx](../../apps/app/src/react-app/domains/settings/pages/extensions-view.tsx) with `"hooks"`. List, enable/disable, run history with per-run session links.
- **Natural-language hook builder** (non-technical users): "When *a file matching …* changes, *tell the agent to …*" — two fields and a dropdown; writes the markdown file. Prompt-assisted creation: describe the automation, a `hook-creator` skill drafts the file (mirrors existing `skill-creator`/`agent-creator` defaults).
- **Manual hooks as buttons**: manual-trigger hooks surface in the session sidebar and command palette ("Run: security sweep") — Kiro's button parity.
- **Run feed**: lightweight activity indicator ("keep-tests-fresh ran 2m ago ✓") on the session surface, click-through to the hook session diff.

### 5. Triggers beyond Kiro (differentiators)

| Trigger | Backed by | Story |
|---|---|---|
| `schedule` (cron) | Orchestrator daemon (desktop can't be assumed alive) | "Every morning, summarize yesterday's commits to Slack" — roadmap doc 09 already flags scheduled routines as a requested capability |
| `vcs.branch.updated` | Existing event | "On branch switch, brief me on what this branch changes" |
| `session.idle` | Existing event | "After each completed run, update CHANGELOG draft" |
| Inbound message | opencode-router (Slack/Telegram) | "When a Telegram message arrives in #support, triage it into the tracker" |
| `lsp.client.diagnostics` | Existing event | "When new type errors appear, fix or explain them" |

Because hooks live in the **server**, they fire with the desktop app closed (orchestrator host mode) — Kiro hooks only exist while the IDE runs. That, plus Slack-delivered approval asks, is the headline: *automations that keep working when you leave.*

## Phasing

| Phase | Scope | Size |
|---|---|---|
| MVP | Hook file format + materializer + manual & `file.edited` triggers + runner with guards + settings list/enable/run | M |
| v1 | Hook builder UI, run feed, `session.idle`/`vcs`/diagnostics triggers, Claude-plugin hook import mapping | M |
| v1.1 | Schedule trigger in orchestrator, router message trigger, Slack approval delivery | M |
| Later | Org-shared hooks via Den/extensions marketplace, capability-router exposure (`search_capabilities("on file save…")`) | M |

## Verification (fraimz)

Flow `hook-file-save`: create hook via builder (assert `.opencode/hooks/keep-tests-fresh.md` on disk) → edit a matching file in the artifact editor → within debounce window a `hook:` session appears in its group → permission ask lands in approval modal (review mode) → approve → test file diff visible → run feed shows ✓ → rapid-save 5× and assert exactly one additional run (coalescing) → disable hook, save again, assert no run.

## Open questions

1. Should `experimental.hook` (shell) entries be surfaced in the same Hooks UI as read-only "engine hooks"? Recommended: yes — one pane of glass, marked "shell (OpenCode)".
2. Event provenance for `ignore_agent_edits`: verify OpenCode 1.17 exposes the originating session on `file.edited`; if not, correlate via active-session file-op tracking in the server (fallback), and file an upstream issue.
3. Per-hook model override economics — default to the workspace's cheap/fast model with an explicit override field.
