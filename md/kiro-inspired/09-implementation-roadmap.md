# 09 — Implementation Roadmap: Sequencing, Slicing, Risks

## Dependency graph

```
04 Modes/Trust ──────────────┐
05 Checkpoints/Diff ─────────┼──► 01 Specs (needs gates, task diffs, mode per task)
03 Steering ─────────────────┤
06 Context providers ────────┘        02 Hooks (needs modes for safe runs,
07 MCP trust ── (parallel, independent)          checkpoints for pre-run safety,
08 File experience ── (polish layer on 01/02/05/06)      steering for good outputs)
```

Read: ship the **enablers** (04, 05, 03, 06) before the **headliners** (01, 02). Each enabler is independently valuable — no big-bang dependency chain.

## Phased plan

### Phase 1 — "Expose what exists" (small diffs, immediate DX)

| Order | Work | Docs | Size | Why first |
|---|---|---|---|---|
| 1 | Checkpoint restore/undo + Changes panel | [05](./05-checkpoints-and-session-diff.md) | **S** | Engine + lib bindings already exist ([opencode-session.ts](../../apps/app/src/app/lib/opencode-session.ts)); pure UI |
| 2 | Execution modes + durable trusted commands | [04](./04-autopilot-supervised-trust.md) | M | Unblocks every automation story; mostly config materialization |
| 3 | MCP health + reauth CTAs | [07](./07-mcp-and-tool-trust-parity.md) | S–M | Fixes a live pain class (opaque MCP failures) |
| 4 | `#folder` `#git-diff` `#problems` + unified `#` typeahead | [06](./06-context-providers.md) | M | Composer infra exists; three resolvers over existing endpoints |

### Phase 2 — "The workflow layer"

| Order | Work | Docs | Size |
|---|---|---|---|
| 5 | Steering MVP (dir + always-compile + generate + settings page) | [03](./03-steering-and-project-context.md) | S–M |
| 6 | Specs MVP → v1 (artifacts, gates via approvals, task runner, spec panel) | [01](./01-spec-driven-development.md) | M–L |
| 7 | Hooks MVP (manual + file.edited, guards, settings tab) | [02](./02-agent-hooks.md) | M |
| 8 | Context inspector + `#spec`/`#steering` mentions | [03](./03-steering-and-project-context.md)/[06](./06-context-providers.md) | S |

### Phase 3 — "Only OpenWork can do this"

| Work | Docs |
|---|---|
| Hooks × orchestrator schedule + router triggers; Slack-delivered approvals | [02](./02-agent-hooks.md) |
| Spec approvals from Slack; orchestrator `openwork spec …` verbs | [01](./01-spec-driven-development.md) |
| Den policy ceilings (`maxExecutionMode`, sandbox-required full-auto); org steering; shared spec/hook extensions | [04](./04-autopilot-supervised-trust.md)/[03](./03-steering-and-project-context.md) |
| Capability-router integration for steering/MCP/context (post #2438/#2472) | [03](./03-steering-and-project-context.md)/[07](./07-mcp-and-tool-trust-parity.md) |
| Inline ⌘K, problems panel, per-file reject | [08](./08-inline-editing-and-file-experience.md)/[05](./05-checkpoints-and-session-diff.md) |

## PR slicing (per AGENTS.md demo-driven development)

Every item above follows the paved path — `/voiceover <feature>` script approved **before code**, build on a fresh worktree, prove with `/fraimz`, PR to `dev` with `pnpm fraimz --flow <id> --pr`:

1. **Contracts first**: `packages/types/src/{specs,hooks,steering,context}.ts` + server route module + tests. No UI.
2. **Server behavior**: materializers follow the [skills.ts](../../apps/server/src/skills.ts)/[commands.ts](../../apps/server/src/commands.ts) pattern; events follow the ReloadEventStore cursor pattern; approvals reuse the existing state machine.
3. **UI consumption**: panel tabs extend the `PanelTab` union; settings pages extend `ExtensionsSection`/settings pages list; mentions extend `ComposerMentionKind`. Use `@/components` + shadcn/Base UI; no new global state unless kernel-worthy.
4. **Cross-surface**: orchestrator verbs and router tokens as separate follow-up PRs.

Repo rules that bind every PR: pnpm only; no `any`/`as`; smallest diff; `pnpm typecheck` + targeted tests reported with commands; fraimz/video for anything visible.

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| OpenCode API drift (engine pinned `v1.17.11` in `constants.json`) | Revert/diff/permission shapes change under us | Feature-detect like `shellAsync` already does in [opencode-session.ts](../../apps/app/src/app/lib/opencode-session.ts); contract tests against the pinned SDK; upgrade dance owned in one place |
| Hook runaway (loops, cost) | Trust-destroying incident | Guards are non-optional defaults ([02](./02-agent-hooks.md) §3): provenance filtering, rate circuit breaker, depth cap, kill switch — ship guards **in the MVP**, not after |
| Autonomy misconfiguration | Damaged files / exfil | Mode ceilings via Den policy; destructive-pattern floor; sandbox-required full-auto; audit everything ([04](./04-autopilot-supervised-trust.md)) |
| Spec sprawl (heavyweight process nobody uses) | Dead feature | Lightweight mode (skip design gate), plain-language "Plan" framing, specs generated *from* an existing chat ("promote this conversation to a spec") |
| Context-cost explosion (steering + providers) | Slow/expensive sessions | Token estimates everywhere, always-docs budget warning, capability-router endgame |
| UI complexity vs non-technical audience | Core-audience alienation | Every feature has a plain-language surface (promise-phrased modes, hook builder sentences, plan cards); advanced detail behind progressive disclosure |
| Parallel-behavior drift (client-only shortcuts) | Violates server-consumption-first | Every feature lands as server API first — enforced in review checklists |
| Adjacent in-flight work (capability router, extension manifests, memory bank) | Rework | Verify-live checklist below **before starting each doc's work**; design docs already mark integration points |

## Upstream-to-OpenCode contribution list (ejectable ethos)

| Contribution | Unblocks |
|---|---|
| File-scoped revert (`revert {paths[]}`) | [05](./05-checkpoints-and-session-diff.md) per-file reject without server-side inverse patches |
| Event provenance on `file.edited` (originating session) | [02](./02-agent-hooks.md) `ignore_agent_edits` without correlation heuristics |
| Glob-conditional `instructions[]` entries | [03](./03-steering-and-project-context.md) fileMatch without a plugin |
| Per-tool MCP permission granularity (if missing in 1.17) | [07](./07-mcp-and-tool-trust-parity.md) trust matrix at the engine layer |

## Verify-live checklist (before implementation of each area)

- [ ] Capability router PRs #2438/#2472 — merged? shape of `search/execute` routes?
- [ ] Extension manifest foundation PR stack status (hooks-as-resource semantics)
- [ ] Memory bank implementation status (context inspector integration point)
- [ ] Text-artifact editing PR #2470 state (inline-edit substrate)
- [ ] OpenCode version bump beyond 1.17.11? Re-verify: revert/unrevert semantics, `experimental.hook`, MCP auth routes, permission schema
- [ ] Open issues on slash commands / skill frontmatter mangling (touch the same materializer code paths as hooks/steering)

## Success metrics (how we know it worked)

- **Activation**: % of workspaces with ≥1 steering doc; ≥1 spec created; ≥1 hook enabled (target: steering becomes the default onboarding path).
- **Trust dial usage**: % of sessions run in Autopilot; trusted-command rules per active user; approval-latency drop.
- **Safety net usage**: restores + per-file rejects per week (nonzero = users feel safe; spiking = quality problem — watch both directions).
- **Automation value**: hook runs that produce an accepted diff / total hook runs (target >60%; below that hooks are noise).
- **Ejectability kept honest**: delete-OpenWork test stays green — a workspace's specs/steering/hooks remain readable, `always` steering still loads in raw OpenCode.

## Closing argument

Kiro proved the demand for structured agentic workflows, then locked them inside a single IDE. Every proposal in this set lands as **markdown in the workspace + routes on `apps/server` + thin UI in `apps/app`** — which means the same features run on the desktop, a headless server, and Slack, can be centrally governed by Den policy, are auditable end-to-end, and survive OpenWork's own removal. That is not feature parity with Kiro; it is the same developer experience with strictly better architecture — built on OpenCode, the way OpenWork already promises.
