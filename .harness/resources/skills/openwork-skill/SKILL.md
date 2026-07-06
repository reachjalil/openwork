---
name: openwork-skill
description: Use when an agent needs to understand, triage, plan, or contribute to Different AI OpenWork. Do NOT use without checking the live repo before PRs.
---

# OpenWork Skill

This skill orients an agent inside [`different-ai/openwork`](https://github.com/different-ai/openwork), the OpenWork desktop/cloud/agent-control repository. It is designed for contributor onboarding, interview preparation, issue triage, roadmap reasoning, and first-PR planning.

## When to Use

Use this skill when the user asks about:

- OpenWork product positioning, philosophy, architecture, or technical stack.
- Where code lives in the OpenWork monorepo.
- How desktop, server, orchestrator, opencode-router, Den cloud, MCP, skills, plugins, extensions, and enterprise controls fit together.
- Which issues, active PRs, or roadmap directions point to useful contribution areas.
- How to prepare for a contributor interview or propose a useful first contribution.

Do **not** use this skill as a substitute for checking the current `dev` branch, issue list, and PR list. This snapshot was built from public repository state reviewed on **2026-07-05** and the repo is moving quickly.

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

1. Start with `reference/00-agent-quick-map.md` and select the correct path for the user’s task.
2. For product positioning, read `reference/01-product-positioning.md`.
3. For code navigation, read `reference/02-repository-map.md` and `reference/03-tech-stack.md`.
4. For architecture, read `reference/04-runtime-architecture.md`, `reference/05-ui-architecture.md`, and `reference/06-host-stack.md`.
5. For cloud, enterprise, or commercial direction, read `reference/07-cloud-den-enterprise.md`.
6. For skills/MCP/extensions/capability routing, read `reference/08-skills-mcp-extensions.md`.
7. For roadmap and “where they are moving,” read `reference/09-roadmap-trajectory.md`.
8. For “what problems are they running into,” read `reference/10-issues-risk-register.md`.
9. For “where can I be useful,” read `reference/11-contributor-opportunity-map.md` and `reference/12-interview-briefing.md`.
10. For PR behavior, use `reference/13-development-workflow.md` and the checklists.
11. Before making claims about current status, verify the live repo, issue, PR, or release.

## Quality Checklist

Before answering from this skill:

- State the snapshot date when the answer depends on repo state.
- Separate verified current architecture from roadmap/open-PR inference.
- Prefer source paths and precise files over vague module names.
- Mention OpenWork’s proof culture: small diffs, `pnpm`, no casual `any`/casts, tests, and fraimz/video evidence for user-visible changes.
- For contribution advice, include a concrete “first useful move” rather than only abstract strategy.
- For risks, include owner/scope/security/compatibility considerations, not only UI polish.

## References

Start with:

- `reference/00-agent-quick-map.md` — routing map for agents.
- `reference/14-source-index.md` — source inventory and line-anchor map.
- `prompts/interview-prep-prompt.md` — ready-to-use interview prep prompt.
- `checklists/first-contribution-checklist.md` — first PR checklist.
