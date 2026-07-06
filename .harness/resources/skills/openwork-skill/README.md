# OpenWork Skill Pack

Snapshot date: **2026-07-05**  
Repository reviewed: [`different-ai/openwork`](https://github.com/different-ai/openwork) on the public `dev` branch.

This package is a portable skill folder. Drop `openwork-skill/` into a skills library, or load its Markdown files directly when preparing for an OpenWork contributor interview.

## How to Use This Skill Quickly

- **Interview in 15 minutes:** read `reference/00-agent-quick-map.md`, `reference/09-roadmap-trajectory.md`, `reference/11-contributor-opportunity-map.md`, and `reference/12-interview-briefing.md`.
- **Architecture deep dive:** read `reference/03-tech-stack.md`, `reference/04-runtime-architecture.md`, `reference/05-ui-architecture.md`, and `reference/06-host-stack.md`.
- **Where to help:** read `reference/10-issues-risk-register.md` and `reference/11-contributor-opportunity-map.md`.
- **First PR:** read `reference/13-development-workflow.md` and `checklists/first-contribution-checklist.md`.
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
