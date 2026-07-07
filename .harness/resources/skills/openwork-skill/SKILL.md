---
name: openwork-skill
description: Use when an agent needs to understand, navigate, locate code in, triage, plan, or contribute to Different AI OpenWork. Provides a verified code graph (where code lives + where changes go) plus contributor/interview briefing. Do NOT use without checking the live repo before PRs.
---

# OpenWork Skill

This skill orients an agent inside [`different-ai/openwork`](https://github.com/different-ai/openwork), the OpenWork desktop/cloud/agent-control repository. It has two layers:

1. **Code graph (verified against a local checkout)** — a navigable map of *where the code lives and where changes need to happen*: node/edge model, entry points, feature→file change recipes, and end-to-end data flows. Start at `reference/16-code-graph.md`.
2. **Contributor briefing (public-state snapshot)** — product positioning, roadmap trajectory, issue/PR triage, interview prep, and first-PR planning.

The code graph was built by reading the checked-out repo at HEAD `49d3f9ec` (2026-07-06). Every path in docs `16`–`23` and `meta/code-graph.json` was verified on disk. The briefing layer (docs `01`, `07`, `09`–`12`) is a public-state snapshot and moves faster — re-check live before citing status.

## When to Use

Use this skill when the user asks about:

- **Where code lives / where to change something** in the OpenWork monorepo → the code graph (`16`–`23`, `17-change-recipes.md`).
- **How a feature works end-to-end** across processes → data flows (`18-data-flows.md`).
- **How to run/build/test a process**, ports, env → `19-entrypoints-and-processes.md`.
- **Something is broken — diagnose it** → `24-issue-diagnosis-playbook.md` (symptom → checks → fix files).
- **Where can the codebase be improved** (measured gaps, drift, opportunities) → `25-improvement-map.md`.
- **What can an agent run/do in this repo** (tests, fraimz, internal skills, MCP, diagnostics) → `26-agent-capability-catalog.md`.
- OpenWork product positioning, philosophy, architecture, or technical stack.
- How desktop, server, orchestrator, opencode-router, Den cloud, MCP, skills, plugins, extensions, and enterprise controls fit together.
- Which issues, active PRs, or roadmap directions point to useful contribution areas.
- How to prepare for a contributor interview or propose a useful first contribution.

Do **not** treat the briefing layer as a substitute for checking the current `dev` branch, issue list, and PR list — it reflects public state reviewed **2026-07-05** and the repo moves quickly. The code-graph layer is verified on disk (HEAD `49d3f9ec`, 2026-07-06); still confirm a specific file/symbol exists before proposing an edit, since renames land often.

## Inputs

Useful inputs from the user:

- Their target role or contribution style: frontend, desktop, backend/server, cloud/Den, integrations, docs, design, QA/evals, security, DevEx.
- The exact issue, PR, feature, or interview theme they want to discuss.
- Whether they have a local checkout, can run Electron, and can record end-to-end proof.

## Outputs

When invoked, produce one or more of:

- A concise repo map with source paths and contribution zones.
- A tech-stack and architecture explanation that distinguishes **current `dev`** from **roadmap / open PR signals**.
- A risk and issue triage summary with recommended next action.
- A first-PR plan that includes verification commands and user-visible proof.
- Interview talking points, questions to ask, and concrete ways the user can be useful.

## Workflow

Start by classifying the task as **code navigation** (where is X / where do I change it / how does it flow) or **briefing** (what is it / roadmap / interview / triage), then route:

**Code navigation (use the verified code graph):**

1. Open `reference/16-code-graph.md` — the master map: node inventory, build vs runtime edges, the four runtime realms, and a navigation cheatsheet. Name the realm first (UI / host stack / desktop / cloud).
2. "Where do I change X?" → `reference/17-change-recipes.md` (feature → primary files → contract files → proof).
3. "How does X flow end-to-end?" → `reference/18-data-flows.md` (ordered file traces).
4. "How do I run/build/test it?" → `reference/19-entrypoints-and-processes.md`.
5. Node interiors → `reference/20-frontend-graph.md` (`apps/app`), `21-host-stack-graph.md`, `22-desktop-graph.md`, `23-cloud-graph.md`.
6. Need to traverse programmatically → `meta/code-graph.json`.
7. Confirm the target file/symbol still exists in the working tree before proposing an edit.

**Operating in the repo (diagnose / improve / act):**

8. Bug or failure to triage → `reference/24-issue-diagnosis-playbook.md`: identify the symptom class, follow its check order, land on the fix files.
9. Looking for improvement work → `reference/25-improvement-map.md`: measured test-coverage gaps, verified docs drift, structural seams — with the anti-patterns to avoid.
10. Before acting, check `reference/26-agent-capability-catalog.md` for the right tool: targeted test scripts, fraimz proof, `scripts/openwork-debug.sh`, the 21 internal `.opencode/skills`, and attachable MCP servers.

**Briefing (public-state snapshot):**

11. `reference/00-agent-quick-map.md` routes the question; `01` positioning; `07` cloud/enterprise; `08` skills/MCP/extensions; `09` roadmap; `10` issues; `11`/`12` opportunity + interview; `13` + checklists for PR behavior.
12. Before making claims about current status, verify the live `dev` branch, issue, PR, or release.

## Quality Checklist

Before answering from this skill:

- **Distinguish the two layers.** Code-graph facts (docs `16`–`23`, `meta/code-graph.json`) are verified on disk at HEAD `49d3f9ec` (2026-07-06). Briefing facts (issues, PRs, roadmap) are a public snapshot — state the snapshot date and separate verified architecture from roadmap/open-PR inference.
- **Give exact paths, then confirm them.** Prefer precise files/symbols over vague module names, and verify the file still exists in the working tree before recommending an edit (the `dev` branch moves fast; a renamed file makes advice wrong).
- **Name the runtime realm** (local OpenCode / host stack / desktop bridge / Den cloud) before proposing where a change goes — it prevents editing the wrong layer.
- **Respect the contract hub.** Cross-process changes go through `packages/types` first, not duplicated in a consumer (see `17-change-recipes.md` §F).
- Mention OpenWork’s proof culture: small diffs, `pnpm` (never npm/yarn), no casual `any`/casts/`as`, tests, and fraimz/video evidence for user-visible changes.
- For contribution advice, include a concrete “first useful move” with the file to open, not only abstract strategy.
- For risks, include owner/scope/security/compatibility considerations, and preserve the local-first/ejectable (gating) boundary when touching `ee/`.

## References

**Code graph (verified):**

- `reference/16-code-graph.md` — master map (nodes, edges, realms, cheatsheet). **Start here for code navigation.**
- `reference/17-change-recipes.md` — "change X → edit Y → prove with Z."
- `reference/18-data-flows.md` — end-to-end call-path traces.
- `reference/19-entrypoints-and-processes.md` — processes, ports, env, build/CI graph.
- `reference/20-frontend-graph.md` · `21-host-stack-graph.md` · `22-desktop-graph.md` · `23-cloud-graph.md` — node interiors.
- `meta/code-graph.json` — machine-readable nodes + edges.

**Operating layer (verified):**

- `reference/24-issue-diagnosis-playbook.md` — symptom → checks → fix files.
- `reference/25-improvement-map.md` — measured improvement opportunities + anti-patterns.
- `reference/26-agent-capability-catalog.md` — everything an agent can run/do here.

**Briefing & workflow:**

- `reference/00-agent-quick-map.md` — routing map for agents.
- `reference/14-source-index.md` — source inventory and line-anchor map.
- `prompts/interview-prep-prompt.md` — ready-to-use interview prep prompt.
- `checklists/first-contribution-checklist.md` — first PR checklist.
