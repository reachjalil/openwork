# 00 — Agent Quick Map

Use this file first. It routes the current question to the right reference document.
Two layers: the **code graph** (`16`–`23`, verified on disk) answers *where code is and
where changes go*; the **briefing** (`01`–`14`) answers *what/why/roadmap/interview*.

## Task Router — Code graph (verified)

| User asks | Read next | Produce |
|---|---|---|
| “Where does the code live? / give me the map.” | `16-code-graph.md` | Node inventory + build/runtime edges + realms |
| “Where do I change / add X?” | `17-change-recipes.md` | Primary files + contract files + proof command |
| “How does feature X flow end-to-end?” | `18-data-flows.md` | Ordered cross-process file trace |
| “How do I run/build/test this? ports? env?” | `19-entrypoints-and-processes.md` | Process table + boot + CI/build graph |
| “Show me inside `apps/app` / host stack / desktop / `ee/`.” | `20`/`21`/`22`/`23`-*-graph.md | Node interior (files + symbols) |
| “Traverse it programmatically.” | `../meta/code-graph.json` | Nodes + edges JSON |
| “X is broken — where do I look?” | `24-issue-diagnosis-playbook.md` | Symptom class → check order → fix files |
| “Where can this codebase be improved?” | `25-improvement-map.md` | Measured gaps + drift + seams, with anti-patterns |
| “What can I actually run/do here?” | `26-agent-capability-catalog.md` | Tests, fraimz, debug tools, internal skills, MCP |

## Task Router — Briefing (public snapshot)

| User asks | Read next | Produce |
|---|---|---|
| “What is OpenWork?” | `01-product-positioning.md` | Product thesis + philosophy + current included features |
| “How is the repo structured?” | `02-repository-map.md` → `16-code-graph.md` | Folder map + owner surfaces (graph = source of truth) |
| “What tech stack?” | `03-tech-stack.md` | Stack summary by workspace |
| “Explain the architecture.” | `04-runtime-architecture.md`, `05-ui-architecture.md`, `06-host-stack.md`, `18-data-flows.md` | Runtime diagram + data flow |
| “What is Den / cloud / enterprise?” | `07-cloud-den-enterprise.md`, `23-cloud-graph.md` | Cloud/enterprise map and monetization direction |
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
openwork/                                  (verified on disk, HEAD 49d3f9ec)
├── apps/
│   ├── app/              @openwork/app — React/Vite UI (the ONLY UI)
│   ├── desktop/          @openwork/desktop — Electron shell + packaging
│   ├── installer/        @openwork/installer — per-client installer app
│   ├── server/           openwork-server — filesystem workspace API
│   ├── orchestrator/     openwork-orchestrator — host CLI (installs `openwork`)
│   ├── opencode-router/  opencode-router — Slack/Telegram bridge
│   └── ui-demo/          @openwork/ui-demo — component showcase
├── packages/
│   ├── types/            @openwork/types — cross-process contract hub
│   ├── ui/               @openwork/ui — Paper-shader gradient components
│   ├── openwork-ui-mcp/  MCP bridge for semantic UI control
│   ├── handsfree/        @openwork/handsfree — macOS computer-use MCP
│   ├── email/            @openwork/email — react-email + Resend/nodemailer
│   ├── install-config/   @openwork/install-config — installer config schema
│   ├── openwork-bootstrap/ onboarding CLI (install/doctor/cloud onboard)
│   └── docs/             package docs
├── ee/
│   ├── apps/             den-api (Hono), den-web (Next 16), inference, den-worker-proxy,
│   │                     landing (Next 14), den-worker-runtime (build root), den-controller (DEPRECATED)
│   └── packages/         den-db (Drizzle/MySQL), den-admin-mcp, utils
├── docs/                 architecture/roadmap + AWS/Azure/GCP EE deploy guides
├── prds/                 product requirement docs (SCIM/SSO plans)
├── evals/                fraimz proof flows (runner + 64 flows + voiceovers)
├── packaging/            Docker/build packaging support
├── constants.json        pinned opencodeVersion; warden.toml; skills-lock.json
└── scripts/              build/release/dev automation
```
For the authoritative, edge-annotated version see `16-code-graph.md`.

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
