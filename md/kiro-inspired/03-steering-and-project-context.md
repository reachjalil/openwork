# 03 — Steering & Project Context: Structured, Conditional, Visible

## What Kiro does

Steering is Kiro's persistent project memory: markdown files in `.kiro/steering/` injected into agent context. Three properties make it more than "a rules file":

1. **Generated baseline**: one click produces `product.md` (what/why), `tech.md` (stack, commands, constraints), `structure.md` (layout, conventions) from codebase analysis.
2. **Inclusion modes** via YAML front-matter:
   - `inclusion: always` — in every interaction (default),
   - `inclusion: fileMatch` + `fileMatchPattern: "components/**/*.tsx"` — only when matching files are in play,
   - `inclusion: manual` — only when referenced by name in chat (`#steering-name`).
3. **Live file references**: a steering doc can inline another workspace file (`#[[file:openapi.yaml]]`), so canonical sources stay single-sourced.

The effect: consistent agent behavior without re-explaining the project every session, and without paying the token cost of *all* context *all* the time.

## What OpenWork already has

| Ingredient | Evidence |
|---|---|
| Always-on instructions | OpenCode reads `AGENTS.md` + config `instructions[]` (extra context files) — `instructions` is a recognized top-level key in [portable-opencode.ts](../../apps/server/src/portable-opencode.ts) |
| Generation primitive | OpenCode `POST /session/{id}/init` — analyzes the project and writes `AGENTS.md` |
| Manual-inclusion context | Skills **are** manual steering: `.opencode/skills/*/SKILL.md` loaded on demand ([skills.ts](../../apps/server/src/skills.ts)); the composer already has a `ComposerSkillNode` |
| Config write path + hot reload | [runtime-opencode-config-store.ts](../../apps/server/src/runtime-opencode-config-store.ts), reload-watcher, `POST /workspace/:id/engine/reload` |
| Repo-side precedent | This repo itself: `AGENTS.md` + Harness-generated `.claude/`/`.agents` configs — maintainers already live a steering workflow, users get none of it |
| Adjacent roadmap | `docs/memory-bank-architecture.md` — **user-scoped** durable memory via capability search/execute |

## The gap

- No structured steering directory; everything lands in one monolithic `AGENTS.md` or hand-edited `instructions` array.
- No conditional inclusion — context is all-or-nothing, so big projects pay full token cost every message or under-inform the agent.
- No generation flow in the product (the engine primitive exists, unexposed — onboarding at [welcome-page.tsx](../../apps/app/src/react-app/domains/onboarding/welcome-page.tsx) does folder pick only).
- No visibility: users cannot see *what the agent knows*, which is a top source of "why did it do that?" confusion — especially for OpenWork's non-technical audience.

## Proposal

### 1. Artifact layout

```
<workspace>/.opencode/steering/
├── product.md      # inclusion: always
├── tech.md         # inclusion: always
├── structure.md    # inclusion: always
├── api-style.md    # inclusion: fileMatch, patterns: ["apps/server/**"]
└── release.md      # inclusion: manual
```

Front-matter:

```markdown
---
description: REST conventions for the server
inclusion: fileMatch        # always | fileMatch | manual
patterns: ["apps/server/**/*.ts"]
refs: ["docs/api-guidelines.md"]   # live file references, inlined at assembly time
---
```

Ejectability: files are plain markdown. For a pure-OpenCode user, `always` docs still work (see delivery below); `manual` docs are readable on demand; only `fileMatch` needs OpenWork (or the shipped plugin) to be smart.

### 2. Delivery mechanics — three tiers, honest about each

| Mode | Mechanism | Notes |
|---|---|---|
| `always` | Server compiles the list into OpenCode config `instructions[]` (paths, not copies) via the runtime config store | Zero-magic; works in raw OpenCode after OpenWork wrote config once |
| `manual` | Surfaced as `#steering-name` composer mentions ([06](./06-context-providers.md)); resolution injects the doc as a message part | Mirrors the existing skill mention pattern |
| `fileMatch` | An OpenWork-shipped **OpenCode plugin** (`openwork-steering`) that watches which files the conversation touches (tool calls, mentions, edits) and injects matching docs into context via the plugin hook surface | This is the only part needing runtime smarts; MVP fallback: resolve fileMatch at *prompt time* against files mentioned/attached in the composer, which is server-side only |

The `fileMatch` plugin is also a candidate **upstream contribution** to OpenCode (`instructions` with glob-conditional entries) — aligned with the ejectable ethos: push generic capability down the stack.

### 3. Generation flow ("Generate steering docs")

- Onboarding step after folder pick + a settings CTA: runs a `steering-creator` session (same default-skill pattern as `skill-creator` / `agent-creator` in [skills-view.tsx](../../apps/app/src/react-app/domains/settings/pages/skills-view.tsx)) that:
  1. calls OpenCode's `session/init`-grade analysis (find/file/status surfaces),
  2. writes the three baseline docs,
  3. if `AGENTS.md` exists, **imports rather than duplicates**: proposes a split of its content into the structured docs, leaving `AGENTS.md` as the thin always-on entry that references them.
- Refresh: "Update steering from codebase" re-runs analysis and shows a diff (artifact editor + `DiffLines`) instead of overwriting.

### 4. Server surface

```
GET    /workspace/:id/steering              # list + inclusion modes + token estimates
POST   /workspace/:id/steering              # create (writes file)
PUT    /workspace/:id/steering/:name        # edit front-matter/body
POST   /workspace/:id/steering/generate     # run generation session
GET    /workspace/:id/steering/preview      # RESOLVED context for a hypothetical prompt:
                                            #   which docs would be included and why + token cost
```

`preview` is the API behind the visibility feature and is also what the orchestrator TUI and evals use to assert context composition.

### 5. UI

- **Settings → Steering** (or "Project knowledge" in plain-language copy): doc list with inclusion badges, token-cost estimates, edit-in-artifact-editor, generate/refresh CTAs.
- **Context inspector**: a small chip near the composer — "Context: 3 always · 1 matched · 12.4k tokens" — expanding to the `preview` payload. Answers *what does the agent know right now?* No equivalent exists in Kiro; for a non-technical audience it is trust infrastructure.
- **Composer**: `#steering-name` mentions with typeahead (extend the existing mention system).

### 6. Relationship to adjacent systems (do not build twice)

- **Memory bank** (`docs/memory-bank-architecture.md`) is *user-scoped, cross-workspace* memory behind capability search/execute. Steering is *workspace-scoped, file-based*. Keep them distinct; the context inspector should eventually show both ("project knowledge" + "your memories").
- **Skills** stay the packaging for *procedural* knowledge ("how to do X"); steering is *declarative* ("what is true here"). The steering UI should say this — users will otherwise dump procedures into steering.
- **Capability router** (#2438/#2472): once landed, `manual` and `fileMatch` docs become searchable capability cards (`search_capabilities("api conventions")`) instead of being injected wholesale — cheaper than Kiro's always-paste model.

## Phasing

| Phase | Scope | Size |
|---|---|---|
| MVP | Steering dir + `always` compile-to-instructions + settings list/edit + generate flow | S–M |
| v1 | `manual` mentions, context inspector + `preview` API, AGENTS.md import/split | M |
| v1.1 | `fileMatch` (prompt-time resolution), refs inlining, refresh-with-diff | M |
| Later | `fileMatch` plugin / upstream OpenCode conditional instructions, capability-router integration, Den org-level steering (org conventions pushed to every workspace — enterprise story Kiro lacks) | M |

## Verification (fraimz)

Flow `steering-basics`: open fresh workspace → generate steering → three files exist on disk with front-matter (assert content) → ask agent "what is this project?" and assert the answer reflects `product.md` → edit `tech.md` to add a fake constraint ("always use tabs") → new session honors it → mark `release.md` manual → assert it is absent from `preview` until `#release` is mentioned → context inspector token count changes accordingly.

## Open questions

1. Directory name: `.opencode/steering/` vs `.opencode/knowledge/`. Recommended: `steering` (community-legible term Kiro popularized), "Project knowledge" as UI copy.
2. Should `always` docs be inlined into one compiled file or listed individually in `instructions[]`? Recommended: individually — cleaner diffs and attribution.
3. Token budget guardrail: warn when `always` exceeds N tokens (configurable, default ~8k) and suggest demoting docs to `fileMatch`/`manual`.
