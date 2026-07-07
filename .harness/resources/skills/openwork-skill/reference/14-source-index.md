# 14 — Source Index

Snapshot date: **2026-07-05**. Re-check live sources before making current-status claims.

> **Two provenance classes.** The **code graph** (docs `16`–`23`, `meta/code-graph.json`)
> was built by reading the **local checkout** at `/Users/jalillaaraichi/openwork`
> (branch `codex/setup-fork`, HEAD `49d3f9ec`, 2026-07-06) — those paths are verified on
> disk. The GitHub `blob/dev` URLs below remain the citation anchors for *line-level*
> references and for briefing docs. When in a checkout, prefer local paths; the graph
> tells you the file, this index tells you the line.
>
> **Freshness delta since the 2026-07-05 snapshot (7 commits):** Azure + GCP EE deploy
> guides added (`#2495`), Slack cloud Connections (`#2496`), admin-connect on Your
> Connections (`#2492`); `den-controller` is now **deprecated** (folded into `den-api`);
> release cut to `v0.17.12`. Re-run the verification commands below before citing status.

## Primary Repo Sources

| Source | What it supports |
|---|---|
| `https://github.com/different-ai/openwork/blob/dev/README.md` | Product positioning, quick start, included features, architecture, plugins, security, contribution checklist, languages. |
| `https://github.com/different-ai/openwork/blob/dev/AGENTS.md` | Contributor workflow, product philosophy, coding standards, fraimz proof expectations. |
| `https://github.com/different-ai/openwork/blob/dev/package.json` | Root scripts, dev modes, Den scripts, tests, release scripts, package manager. |
| `https://github.com/different-ai/openwork/blob/dev/pnpm-workspace.yaml` | Monorepo package zones, React catalog, build allowlist. |
| `https://github.com/different-ai/openwork/blob/dev/turbo.json` | Turbo tasks, persistent dev tasks, global envs, build outputs. |
| `https://github.com/different-ai/openwork/blob/dev/apps/app/package.json` | React/Vite app dependencies and scripts. |
| `https://github.com/different-ai/openwork/blob/dev/apps/desktop/package.json` | Electron desktop dependencies/scripts. |
| `https://github.com/different-ai/openwork/blob/dev/apps/server/package.json` | OpenWork server package/deps/scripts. |
| `https://github.com/different-ai/openwork/blob/dev/apps/server/README.md` | Server config, env vars, endpoints, approvals. |
| `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/package.json` | Orchestrator deps/scripts. |
| `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/README.md` | Host stack, sidecars, sandbox, logs, router daemon, approvals, file sessions. |
| `https://github.com/different-ai/openwork/blob/dev/apps/opencode-router/package.json` | Router deps/scripts. |
| `https://github.com/different-ai/openwork/blob/dev/apps/opencode-router/README.md` | Slack/Telegram setup, identity routing, health/send APIs, tests. |
| `https://github.com/different-ai/openwork/blob/dev/packages/types/package.json` | Shared type exports. |
| `https://github.com/different-ai/openwork/blob/dev/packages/ui/package.json` | Shared UI package exports/deps. |
| `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md` | UI layering, dependency rules, provider flow, route identity, testing. |
| `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/kernel/global-sdk-provider.tsx` | OpenCode client creation, event subscription, event coalescing. |
| `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/kernel/server-provider.tsx` | Server URL state, localStorage, health checks, desktop fetch, proxy forcing. |
| `https://github.com/different-ai/openwork/blob/dev/docs/desktop-app-policies.md` | Desktop policy loading and restriction hooks. |
| `https://github.com/different-ai/openwork/blob/dev/docs/enterprise-plan-gating.md` | Enterprise packaging/gating/grandfathering/kill switch. |
| `https://github.com/different-ai/openwork/blob/dev/docs/extensions-manifest-foundation.md` | Extension abstraction and PR stack. |
| `https://github.com/different-ai/openwork/blob/dev/docs/mcp-ui-control-profile.md` | Semantic UI control via MCP and bridge design. |
| `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md` | Memory bank roadmap, routes, data model, security, staging. |
| `https://github.com/different-ai/openwork/blob/dev/docs/google-workspace-oauth-verification.md` | Google Workspace scopes, data use, verification blockers. |
| `docs/single-org-mode-plan.md` | Single-org deployment mode (first pass implemented). |
| `docs/org-install-links.md` | Organization install links for self-host operators. |
| `docs/aws-eks-helm.md`, `docs/azure-aks-helm.md`, `docs/gcp-gke-helm.md` | EE Kubernetes/Helm deploy guides (AWS/Azure/GCP). |

## Important Line Anchors

### README

- Product description: `https://github.com/different-ai/openwork/blob/dev/README.md#L3-L6`
- Core philosophy: `https://github.com/different-ai/openwork/blob/dev/README.md#L8-L13`
- Enterprise plan note: `https://github.com/different-ai/openwork/blob/dev/README.md#L21-L24`
- Orchestrator alternate UI: `https://github.com/different-ai/openwork/blob/dev/README.md#L26-L30`
- Quick start/cloud workers: `https://github.com/different-ai/openwork/blob/dev/README.md#L32-L39`
- Why/product values: `https://github.com/different-ai/openwork/blob/dev/README.md#L48-L58`
- Included features: `https://github.com/different-ai/openwork/blob/dev/README.md#L59-L72`
- Build/dev commands: `https://github.com/different-ai/openwork/blob/dev/README.md#L81-L136`
- Architecture: `https://github.com/different-ai/openwork/blob/dev/README.md#L145-L159`
- Plugins: `https://github.com/different-ai/openwork/blob/dev/README.md#L168-L183`
- Security/contributing: `https://github.com/different-ai/openwork/blob/dev/README.md#L212-L222`

### AGENTS

- What OpenWork is: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L7-L15`
- Core philosophy: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L17-L23`
- PR expectations: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L26-L35`
- Fraimz/proof: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L37-L61`
- Demo-driven path: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L63-L70`
- Coding guidelines: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L72-L102`

### Architecture and runtime

- UI architecture overview: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L3-L40`
- Dependency rules: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L42-L56`
- Provider data flow: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L60-L74`
- Workspace/session route rules: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L86-L128`
- Server endpoints/approvals: `https://github.com/different-ai/openwork/blob/dev/apps/server/README.md#L80-L161`
- Orchestrator sidecars/sandbox/logs/file sessions: `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/README.md#L29-L235`
- Router setup/routing/tests: `https://github.com/different-ai/openwork/blob/dev/apps/opencode-router/README.md#L53-L190`

## Open Issues Observed in Snapshot

| Issue | Title / area |
|---|---|
| `#2478` | Add copy button to code blocks. |
| `#2440` | Code block dark mode bug, Shiki theme hardcoded to light. |
| `#2454` | OpenCode Go account/workspace provisioning: 0 models/out of sync/404. |
| `#2450` | RTL support and search button request. |
| `#2441` | Cannot disable spellchecker in Windows/Vietnamese composer. |
| `#2341` | Invalid Tailwind color classes render no CSS due Radix palette replacement. |
| `#2444` | Native scrollbar styling. |
| `#2364` | LM Studio showing wrong/hardcoded models. |
| `#2386` | OpenCode unavailable due unrecognized config key `instruction`. |
| `#2099` | Custom model API/router failure: system message ordering. |
| `#2284` | Routines/cron jobs request. |
| `#2351` | macOS Intel package crash due missing `node-pty` platform dependency. |
| `#2350` | Cloud skill install mangles `SKILL.md` frontmatter. |
| `#2084` | Restore `.deb` and `.rpm` Linux packages after Electron migration. |
| `#2323` | OpenCode slash commands unavailable in OpenWork input. |
| `#2328` | Theme picker previews inherit active theme. |
| `#1943` | Answer based on user language preference. |
| `#2096` | SQLite `session_message.seq` NOT NULL failure. |

## Open PR Signals Observed in Snapshot

| PR | Signal |
|---|---|
| `#2492` | Den web shared MCP connection connect affordance. |
| `#2489` | Copy-to-clipboard for markdown code blocks. |
| `#2486` | Theme picker preview fix. |
| `#2470` | Text artifacts in side panel with edit/save. |
| `#2472` | Search/execute-routed connections and plugin skills. |
| `#2473` | Styled native scrollbars. |
| `#2467` | Resolved Shiki theme for code blocks. |
| `#2466` | Replace invalid Tailwind palette classes and add regression test. |
| `#2447` | Theme-aware Shiki dual-palette rendering. |
| `#2443` | Composer spellcheck toggle, disabled by default. |
| `#2442` | Fetch live LM Studio models. |
| `#2438` | Federated search/execute capability pattern. |
| `#2423` | Remove old-server compatibility path; use workspace-scoped session APIs. |

## Verification Commands for Live Recheck

```bash
git clone https://github.com/different-ai/openwork.git
cd openwork
git checkout dev
git pull --ff-only origin dev

gh issue view 2350 --repo different-ai/openwork
gh pr view 2472 --repo different-ai/openwork
gh pr list --repo different-ai/openwork --state open --limit 30
```

## Snapshot Integrity Note

This skill is not a generated clone of the repo. It is a curated contributor briefing built from public repo docs, package manifests, issue/PR metadata, and architecture files observed on 2026-07-05.
