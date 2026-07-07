# Kiro-Inspired Enhancements for OpenWork

This folder is a set of advocacy documents ("mini-PRDs") proposing how OpenWork can match — and in places beat — the developer experience of [Kiro](https://kiro.dev) (AWS's agentic IDE), **while staying true to OpenWork's core philosophy: everything builds on OpenCode, stays local-first, ejectable, and server-consumption-first.**

> Snapshot: written 2026-07-06 against the `dev`-derived branch `codex/setup-fork`, OpenCode pinned at `v1.17.11` (`constants.json`). Verify live repo/PR state before implementation — several adjacent efforts (capability router #2438/#2472, extension manifests, memory bank) are in flight.

## The one-paragraph thesis

Kiro's differentiation is not the editor — it is a **workflow layer**: Specs (requirements → design → tasks with approval gates), Agent Hooks (event-triggered agent runs), Steering (structured, conditionally-included project context), Autopilot/Supervised execution modes, and Checkpoints. OpenCode `v1.17.11` already ships most of the *engine primitives* these need (event bus, file watcher, revert/unrevert, session diff, todos, permissions, LSP, find/symbol, `experimental.hook`). OpenWork already ships the *product surfaces* (desktop app, server API with approvals, orchestrator CLI, Slack/Telegram router, skills manager, extension manifests). What is missing is a thin, well-designed layer that connects the two — and because OpenWork is not tied to an IDE, the same workflow layer can run on desktop, headless CLI, and chat connectors, which Kiro cannot do.

## Document map

| Doc | Proposal | Kiro feature it answers |
|---|---|---|
| [00-overview-and-gap-analysis.md](./00-overview-and-gap-analysis.md) | Full gap matrix, guiding principles, phasing | — |
| [01-spec-driven-development.md](./01-spec-driven-development.md) | Specs as first-class workspace artifacts with a three-gate workflow | Kiro Specs (`requirements.md` / `design.md` / `tasks.md`, EARS) |
| [02-agent-hooks.md](./02-agent-hooks.md) | Event-triggered agent automations built on the OpenCode event bus | Kiro Agent Hooks |
| [03-steering-and-project-context.md](./03-steering-and-project-context.md) | Structured steering docs with inclusion modes + "generate steering" onboarding | Kiro Steering (`.kiro/steering/`) |
| [04-autopilot-supervised-trust.md](./04-autopilot-supervised-trust.md) | Named execution modes over OpenCode permissions + trusted commands | Kiro Autopilot / Supervised mode |
| [05-checkpoints-and-session-diff.md](./05-checkpoints-and-session-diff.md) | Checkpoint timeline UI over `session/revert`/`unrevert`/`diff` | Kiro Checkpoints |
| [06-context-providers.md](./06-context-providers.md) | `#file` `#problems` `#git-diff` `#codebase` `#url` `#spec` composer context | Kiro chat context providers |
| [07-mcp-and-tool-trust-parity.md](./07-mcp-and-tool-trust-parity.md) | MCP management UX: per-tool trust, health, OAuth — routed through capability search/execute | Kiro MCP config + auto-approve |
| [08-inline-editing-and-file-experience.md](./08-inline-editing-and-file-experience.md) | Artifact/file editing maturity: inline AI edit, problems panel, format-on-save | Kiro's editor affordances (reframed for a non-IDE) |
| [09-implementation-roadmap.md](./09-implementation-roadmap.md) | Sequencing, PR slicing, proof plan (voiceover → fraimz), risks | — |

## Rules every proposal follows

1. **Ejectable**: workflow artifacts are plain markdown/JSON in the workspace (`.opencode/…`), readable by any OpenCode client, never trapped in a proprietary store.
2. **Server-consumption first**: every feature is an `apps/server` API first; the desktop app, orchestrator TUI, and router are clients of it (AGENTS.md).
3. **Build on OpenCode primitives**: no parallel engine. Use the SSE event bus, permissions, revert/diff, todos, `instructions`, agents, and commands that `@opencode-ai/sdk` already exposes.
4. **Non-technical users first**: Kiro targets developers; OpenWork's stated audience includes non-technical users (AGENTS.md). Every proposal includes the "plain-language" framing of the feature.
5. **Proof culture**: each proposal ends with a fraimz-able verification flow.
