# OpenWork Skill Pack

Snapshot date: **2026-07-05**  
Repository reviewed: [`different-ai/openwork`](https://github.com/different-ai/openwork) on the public `dev` branch.

This package is a portable skill folder. Drop `openwork-skill/` into a skills library, or load its Markdown files directly when preparing for an OpenWork contributor interview.

## Three Layers

1. **Code graph (verified on disk).** `reference/16`–`23` + `meta/code-graph.json` map *where the code lives and where changes go* — built by reading the checkout at HEAD `49d3f9ec` (2026-07-06). Every path was confirmed on disk.
2. **Operating layer (verified on disk).** `reference/24` diagnoses failures (symptom → checks → fix files), `25` maps measured improvement opportunities (test gaps, drift, seams), `26` catalogs everything an agent can run/do (tests, fraimz, debug tools, 21 internal skills, MCP servers).
3. **Contributor briefing (public snapshot).** `reference/00`–`14` cover positioning, architecture narrative, roadmap, issues/PRs, and interview prep from the 2026-07-05 public state.

## How to Use This Skill Quickly

- **Find/change code (the code graph):** start at `reference/16-code-graph.md`; then `reference/17-change-recipes.md` for "change X → edit Y → prove with Z"; `reference/18-data-flows.md` for end-to-end traces; `reference/19-entrypoints-and-processes.md` to run/build/test.
- **Fix a bug / triage a failure:** `reference/24-issue-diagnosis-playbook.md` — 8 plays covering the known failure classes, plus the inspector/debug tooling.
- **Find improvement work:** `reference/25-improvement-map.md` — measured test-coverage gaps, verified drift, structural seams, and the anti-patterns to avoid.
- **Act effectively:** `reference/26-agent-capability-catalog.md` — every command, test tier, proof tool, internal skill, and MCP server available in the repo.
- **Node interiors:** `reference/20-frontend-graph.md` (`apps/app`), `21-host-stack-graph.md`, `22-desktop-graph.md`, `23-cloud-graph.md`.
- **Interview in 15 minutes:** read `reference/00-agent-quick-map.md`, `reference/09-roadmap-trajectory.md`, `reference/11-contributor-opportunity-map.md`, and `reference/12-interview-briefing.md`.
- **Architecture deep dive:** read `reference/16-code-graph.md`, then `03-tech-stack.md`, `04-runtime-architecture.md`, `18-data-flows.md`, and `06-host-stack.md`.
- **Where to help:** read `reference/10-issues-risk-register.md` and `reference/11-contributor-opportunity-map.md`.
- **First PR:** read `reference/17-change-recipes.md`, `reference/13-development-workflow.md`, and `checklists/first-contribution-checklist.md`.
- **Source verification:** use `reference/14-source-index.md`.

## Important Caveat

OpenWork appears to move quickly. This skill includes live repo findings, open issues, and open PR signals from 2026-07-05. Before citing status in an interview or opening a PR, re-check:

1. the `dev` branch,
2. the issue/PR you plan to reference,
3. the latest release,
4. whether an open PR has merged or been superseded.

## Core Mental Model

OpenWork is positioning itself as a **local-first, cloud-ready control surface for agentic work**. The desktop app is not the whole system; it is one client for a broader server/API/control-plane surface. The repo is moving toward a composable stack:

```text
User / Agent / MCP client
        ↓
OpenWork UI, desktop bridge, orchestrator CLI, Slack/Telegram connectors
        ↓
OpenWork server API + OpenCode server/proxy + capability search/execute rails
        ↓
Local workspace, remote worker, Den cloud, enterprise policy, extension/skill/MCP ecosystem
```

The fastest way to be useful is to help make this stack more reliable, testable, documented, and user-friendly while preserving the local-first/ejectable promise.
