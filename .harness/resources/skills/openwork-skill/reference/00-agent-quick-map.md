# 00 — Agent Quick Map

Use this file first. It routes the current question to the right reference document.

## Task Router

| User asks | Read next | Produce |
|---|---|---|
| “What is OpenWork?” | `01-product-positioning.md` | Product thesis + philosophy + current included features |
| “How is the repo structured?” | `02-repository-map.md` | Folder map + owner surfaces |
| “What tech stack?” | `03-tech-stack.md` | Stack summary by workspace |
| “Explain the architecture.” | `04-runtime-architecture.md`, `05-ui-architecture.md`, `06-host-stack.md` | Runtime diagram + data flow |
| “What is Den / cloud / enterprise?” | `07-cloud-den-enterprise.md` | Cloud/enterprise map and monetization direction |
| “How do skills/MCP/extensions fit?” | `08-skills-mcp-extensions.md` | Integration model + capability-router trajectory |
| “Where are they moving?” | `09-roadmap-trajectory.md` | Roadmap signals and likely trajectory |
| “What issues are they running into?” | `10-issues-risk-register.md` | Risk register and contribution angles |
| “Where can I be useful?” | `11-contributor-opportunity-map.md` | Contribution menu ranked by leverage |
| “I have an interview tomorrow.” | `12-interview-briefing.md` | Talking points, questions, and first-PR ideas |
| “How do I open a PR?” | `13-development-workflow.md`, checklists | Commands, evidence, and review expectations |
| “What are the sources?” | `14-source-index.md` | Source list and path anchors |

## One-Minute Repo Narrative

OpenWork is an open-source desktop app and broader control plane for doing work with AI agents on local files, OpenCode, skills, plugins, MCP servers, and shared/team workflows. The public product story is “local-first, cloud-ready,” “composable,” “ejectable,” and “sharing is caring.” The architecture is intentionally not just a UI wrapper: the desktop app, web app, CLI orchestrator, OpenWork server, OpenCode server/proxy, messaging router, Den cloud services, and extension/skill ecosystem are being unified around API and capability surfaces.

## Current High-Level Structure

```text
openwork/
├── apps/
│   ├── app/              React/Vite UI used by desktop and web
│   ├── desktop/          Electron desktop shell and packaging
│   ├── server/           Filesystem-backed OpenWork server API
│   ├── orchestrator/     CLI host for opencode + OpenWork server + router
│   ├── opencode-router/  Slack/Telegram bridge and directory router
│   └── ui-demo/          UI/demo surface
├── packages/
│   ├── types/            Shared wire contracts and Zod-backed types
│   ├── ui/               Shared UI package
│   ├── openwork-ui-mcp/  MCP bridge for semantic UI control
│   ├── handsfree/        HandsFree integration package
│   ├── email/            Email package
│   └── docs/             Package docs
├── ee/
│   ├── apps/             Den API, web, controller, workers, inference, landing
│   └── packages/         Den DB, admin MCP, utilities
├── docs/                 Product/architecture/roadmap docs
├── evals/                Real-app proof/evaluation flows
├── packaging/            Docker/build packaging support
└── scripts/              Build/release/dev automation
```

## Fast Contribution Heuristics

1. **Do not fight the architecture.** OpenWork wants the app to consume server surfaces, not invent parallel behavior.
2. **Prefer proof over claims.** For visible changes, expect tests plus fraimz/video/screenshot evidence.
3. **Work small.** The repo explicitly prefers concise, smallest-diff solutions.
4. **Anchor work to a real user issue.** Many open issues are reproducible UX/integration problems.
5. **Separate local and cloud paths.** Desktop/local OpenCode behavior and Den/cloud worker behavior often overlap but are not identical.
6. **Watch for stale docs.** Some docs still mention Tauri while the desktop package is Electron; treat documentation truth audits as valuable.

## Best “Be Useful” Entry Points

- **Frontend/UI polish with tests:** markdown code blocks, theme colors, scrollbars, spellcheck, i18n/RTL.
- **Desktop reliability:** Electron packaging, native dependency bundling, Windows/Linux/macOS edge cases.
- **Integration reliability:** OpenCode config migration, model provider discovery, slash commands, LM Studio/Ollama/provider sync.
- **Capability router / MCP:** search-and-execute capability patterns, permissions, caching, diagnostics, fraimz flows.
- **Skills/extensions:** marketplace materialization bugs, extension manifest docs, install/setup/test flows.
- **Docs/DevEx:** update stale setup docs, clarify Electron vs Tauri, normalize pnpm/Bun requirements, first-contributor runbooks.
