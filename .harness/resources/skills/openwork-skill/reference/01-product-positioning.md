# 01 — Product Positioning and Philosophy

## What OpenWork Says It Is

OpenWork is presented as a free, open-source desktop app for macOS, Windows, and Linux for doing work with AI agents on local files. It is framed as an open-source alternative to Claude Cowork and Codex, with bring-your-own provider keys, skills, plugins, MCP servers, and team-shareable setups.

The repository's agent-facing guidance describes it as a practical control surface for agentic work:

- run local and remote agent workflows from one place,
- use OpenCode capabilities through OpenWork,
- compose desktop app, server, and messaging connectors,
- treat the app as a client of OpenWork server API surfaces,
- connect to hosted workers through a simple “Add a worker → Connect remote” flow.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/README.md#L3-L13`
- `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L7-L23`

## Philosophy

OpenWork’s repeated philosophy is:

1. **Local-first, cloud-ready.** It should work locally in one click, but connect to remote workers/cloud when needed.
2. **Server-consumption first.** The desktop app should consume server APIs rather than grow parallel client-only behavior.
3. **Composable.** Desktop, server, Slack/Telegram, MCP, plugins, skills, and cloud can be combined.
4. **Ejectable.** Because OpenWork is powered by OpenCode, OpenCode capabilities should remain available even before dedicated UI exists.
5. **Shareable/productized workflows.** The product wants users to turn repeatable agentic workflows into team-shareable processes.

Interview interpretation: they are trying to build more than a pretty chat client. The product thesis is an **agent-work operating surface** where local workflows can graduate into team/cloud workflows without lock-in.

## Why It Exists

The README says current OpenCode CLI/GUIs are developer-oriented: file diffs, tool names, and CLI exposure. OpenWork wants to make these workflows extensible, auditable, permissioned, and local/remote.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/README.md#L48-L58`

## Included Features Today

The README lists:

- Host mode: run OpenCode locally.
- Client mode: connect to an existing OpenCode server by URL.
- Sessions: create/select sessions and send prompts.
- SSE live streaming for realtime updates.
- Execution plan: render OpenCode todos as a timeline.
- Permissions: surface permission requests and allow/deny.
- Templates: save and rerun workflows locally.
- Debug exports.
- Skills manager for installed `.opencode/skills` and importing skill folders.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/README.md#L59-L72`

## Product Packaging Direction

The README links to an Enterprise plan that includes feature prioritization, SSO, SLA support, LTS versions, and more. The enterprise plan-gating doc is more explicit: enterprise packaging includes managed deployment, skill development, MCP consulting, SSO/SAML/SCIM, desktop policies, version controls, custom commercial terms, and rollout support.

This matters for contributors: useful work may not only be “make local desktop better.” Reliability, governance, cloud/account flows, docs, and enterprise-safe controls are likely important.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/README.md#L21-L24`
- `https://github.com/different-ai/openwork/blob/dev/docs/enterprise-plan-gating.md#L15-L31`

## Product Tensions to Understand

| Tension | Why it matters |
|---|---|
| Local-first vs hosted/cloud | They want one product story that works locally and with hosted workers. Avoid introducing cloud-only assumptions into core flows. |
| Ejectable OpenCode power vs friendly UX | They want nontechnical users, but do not want to hide or break OpenCode capabilities. |
| Skills/plugins/MCP abundance vs simple mental model | Capability routing and extension manifests appear to be the unifying abstraction. |
| Fast-moving product vs contributor clarity | Several docs and issues suggest parts of the repo can drift quickly. Good docs and tests are high-leverage. |
| Enterprise controls vs open-source trust | Gating docs explicitly avoid breaking reads/deletes and keep kill switches off by default for self-hosted installs. |

## Interview Talking Point

A strong way to describe the project:

> “I see OpenWork as a local-first agent-control plane. The desktop app is one client, but the center of gravity is moving toward server-backed capabilities, OpenCode orchestration, MCP/extension composition, and cloud/enterprise governance. I’d like to help make that system reliable and understandable for real users.”
