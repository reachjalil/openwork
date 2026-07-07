# 12 — Contributor Interview Briefing

Use this when preparing to speak with OpenWork maintainers.

## Your Opening Summary

> “I reviewed OpenWork as a local-first, cloud-ready control surface for agentic work. My understanding is that the desktop app is one client of a broader server/API architecture: OpenCode, OpenWork server, orchestrator, router, skills/MCP/plugins/extensions, and Den cloud. I’m interested in contributing where I can make the system more reliable and understandable for users — starting with small proof-backed fixes, then helping with capability routing, integrations, or cloud/enterprise surfaces as I learn the codebase.”

## Things You Should Sound Fluent On

### Product thesis

- OpenWork is an open-source desktop app and control surface for AI agents on local files.
- It is framed as an alternative to Claude Cowork/Codex.
- Core principles: local-first/cloud-ready, composable, ejectable, sharing workflows.
- OpenCode is the underlying engine/capability source.
- The product wants repeatable, shareable, productized agentic workflows.

### Architecture thesis

- `apps/app` is React/Vite UI used by desktop and web.
- `apps/desktop` is the Electron shell.
- `apps/server` exposes filesystem-backed OpenWork APIs.
- `apps/orchestrator` runs the host stack with sidecars.
- `apps/opencode-router` connects Slack/Telegram and directory routing.
- `ee/` contains Den cloud/enterprise services.
- `packages/types` should hold shared wire contracts.
- The app should consume server surfaces, not invent parallel behavior.

### Roadmap thesis

- Capability search/execute is a likely unifying layer for skills, MCP, plugins, UI actions, and cloud capabilities.
- Extensions are likely becoming the user-facing installable abstraction.
- Den cloud/enterprise is adding hosted workers, desktop policies, SSO/SCIM, managed deployment, skill development, and MCP consulting.
- Memory bank is scoped as human-verified, explicit lexical search in v0, with pre-GA security fast-follows.
- Semantic UI MCP makes OpenWork controllable from other MCP clients.

### Contributor culture

- Use pnpm.
- Keep diffs small.
- Avoid `any`, typecasts, and unnecessary fallbacks.
- Prefer existing components and shadcn/Base UI.
- Validate visible experiences with fraimz/video/screenshots.
- Include exact commands and outcomes in PRs.

## Smart Questions to Ask

1. “Which part of the in-flight capability-router work needs the most help: server shard, UI action shard, MCP diagnostics, permissions, or eval coverage?”
2. “For first-time contributors, do you prefer small UX issues with proof, docs/DevEx fixes, or test coverage around current PRs?”
3. “Where is the biggest review bottleneck right now — reproductions, tests, fraimz proof, or architecture design?”
4. “How should contributors distinguish local OpenWork server behavior from Den/cloud behavior when a feature spans both?”
5. “What is the current source of truth for desktop setup now that the package is Electron but README still references Tauri?”
6. “Are there high-priority integration issues around OpenCode config/provider compatibility that need repros?”
7. “For memory bank or enterprise policy work, what security or privacy gates must be in place before GA?”

## Good “I Noticed…” Observations

Use sparingly; do not sound like you are auditing them aggressively.

- “I noticed the repo strongly emphasizes server-consumption-first, so I’d avoid solving UI issues with client-only state if a server contract belongs there.”
- “I noticed the docs and issues suggest some Electron migration cleanup remains; I can help verify and update docs or packaging checks.”
- “I noticed a pattern of UX issues around theme tokens, markdown rendering, and cross-platform input behavior. Those seem like useful first PRs with clear proof.”
- “I noticed the enterprise plan-gating doc is careful to gate writes but not reads/deletes/sign-in, which is a good compatibility principle I’d preserve.”
- “I noticed memory bank intentionally starts with explicit lexical search and human-verified writes, so I wouldn’t overclaim semantic memory before the future stages land.”

## Avoid Saying

- “OpenWork is just a wrapper around OpenCode.” It is trying to become a broader control plane.
- “Memory bank already does semantic recall.” The doc says v0 is explicit lexical and no auto-recall.
- “Tauri is the current desktop shell.” Verify; `apps/desktop` points to Electron.
- “The capability router is fully landed.” Verify PR status first.
- “I can fix everything.” Better: propose one small proof-backed first contribution.

## Suggested First Contribution Pitch

> “For a first PR, I’d like to choose a small reproducible issue and deliver it with tests and proof. Good candidates seem to be docs truth around Electron setup, skill frontmatter round-trip tests, provider model-list diagnostics, or a UI polish issue if it is still open. Once I understand the review flow, I’d like to help with capability-router reliability or extension manifest setup/test flows.”

## Interview Prep Checklist

- [ ] Open the repo and confirm latest `dev` branch status.
- [ ] Check whether PRs `#2472`, `#2438`, `#2489`, `#2442`, `#2466`, `#2443`, and `#2470` merged or changed.
- [ ] Pick two issues you can discuss concretely.
- [ ] Pick one architecture area you want to learn deeply.
- [ ] Prepare a first-PR proposal with path, test plan, and proof plan.
- [ ] Be ready to explain local-first/cloud-ready in your own words.
- [ ] Be ready to say how you would validate a visible change.

## 90-Second Self-Intro Template

> “I’m interested in contributing to OpenWork because it sits at the intersection of local-first developer tooling, agent UX, MCP/extensions, and cloud/team workflows. I reviewed the repo structure and saw a monorepo with React/Vite UI, Electron desktop shell, OpenWork server, orchestrator, opencode-router, shared types, and Den cloud services. The most interesting direction to me is the move toward searchable/executable capabilities and extension manifests, because that can make a complex agent ecosystem understandable. For a first contribution, I’d like to start small with a high-signal bug or docs fix, include exact verification and proof, and then move into integration or capability-router work.”
