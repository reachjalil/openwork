# 09 — Roadmap Signals and Trajectory

This file separates **verified current direction** from **inferred trajectory**. Always re-check the live repo before stating that an open PR has merged.

## Executive Summary

OpenWork appears to be moving toward:

1. **Local-first agent control plane.** Desktop remains important, but app/server/orchestrator/CLI/connectors share one control surface.
2. **Server-consumption architecture.** The UI should consume OpenWork server surfaces rather than duplicating behavior locally.
3. **Search/execute capabilities.** Skills, MCP, plugins, UI actions, cloud operations, and future memory bank features are being shaped into discoverable capability cards/tools.
4. **Extension abstraction.** User-facing “extensions” unify skills, MCP servers, OpenCode plugins, providers, secrets, binaries, hooks, commands, and UI contributions.
5. **Cloud/Den commercialization.** Hosted workers, desktop policies, SSO/SCIM, enterprise plan gating, managed deployment, custom skills, and MCP consulting.
6. **Proof-driven contribution culture.** Fraimz/video/e2e evidence is expected for visible flows.
7. **Cross-platform desktop hardening.** Electron migration, packaging, native deps, Windows/Linux/macOS UX are active pain areas.

## Trajectory 1 — App as Client of Server Surfaces

AGENTS.md explicitly says the app should consume OpenWork server surfaces, self-hosted or hosted, and not invent parallel behavior. README host mode says the default runtime is now `openwork` orchestrating OpenCode, OpenWork server, and optionally opencode-router.

Implication: if you propose a feature, ask “what is the server/API contract?” before adding a client-only shortcut.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L17-L23`
- `https://github.com/different-ai/openwork/blob/dev/README.md#L145-L159`

## Trajectory 2 — Search/Execute Capability Router

Roadmap signals:

- Memory bank uses Den REST routes auto-surfaced through meta-MCP `search_capabilities` and `execute_capability`.
- Open PR `#2438` describes a federated capability index spanning server, UI, MCP, and cloud shards.
- Open PR `#2472` describes local search/execute routed connections and plugin skills, with routes like `/workspace/:id/capabilities/search` and `/execute`.

Implication: the project is trying to avoid stuffing all tools into context. The next architecture likely teaches agents through searchable capability cards and executes only what is selected.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L38-L76`
- See `reference/14-source-index.md` for PR `#2438` and `#2472` notes.

## Trajectory 3 — Extension Manifests

The extension manifest doc says `extension` should be the user-facing abstraction over plugins and installable capabilities. It anticipates manifests covering resources, setup, contributions, and lifecycle.

Implication: marketplace/install/setup flows should become more structured and testable. This is a useful place for contributors who like schemas, UX, and integration tests.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/docs/extensions-manifest-foundation.md#L3-L22`

## Trajectory 4 — Semantic UI Control and Hands-Free Operation

The MCP UI control profile turns OpenWork UI into a semantic action surface. Instead of screenshot/coordinate control, MCP clients can ask what actions are available and execute them by ID.

Implication: OpenWork wants to be controllable by other agents and accessibility tools, not only humans clicking a desktop UI.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/docs/mcp-ui-control-profile.md#L3-L38`

## Trajectory 5 — Memory Bank / Durable Knowledge

The memory-bank doc proposes per-user, human-verified, server-side memory with explicit lexical search in v0 and future vector/hybrid/private/org-scoped evolution. It is careful about owner-scoping, plaintext-at-rest risk, and pre-GA encryption requirements.

Implication: memory is not just a chat feature. It is a durable capability surfaced through Den/API/MCP rails.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L13-L35`
- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L40-L76`
- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L240-L358`

## Trajectory 6 — Enterprise Controls and Managed Deployment

Enterprise plan docs package SSO/SAML/SCIM, desktop policies/version controls, managed deployment, custom skill development, MCP consulting, and rollout support. The gating principle protects existing users by gating writes but not reads/deletes/sign-in/policy delivery.

Implication: enterprise will need careful tests around entitlements, grandfathering, billing/admin UX, desktop policy enforcement, and self-host boundaries.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/docs/enterprise-plan-gating.md#L3-L171`

## Trajectory 7 — Artifact and File Workflow Maturity

Open PR `#2470` adds text file artifacts to the side panel with edit/save, relying on existing server classification and optimistic concurrency. Orchestrator docs also include file sessions with JIT catalog and batch read/write.

Implication: OpenWork is moving from “chat with files” toward a richer workspace file/artifact control surface.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/orchestrator/README.md#L177-L215`
- See `reference/14-source-index.md` for PR `#2470`.

## Trajectory 8 — Desktop Reliability After Electron Migration

Signals include:

- `apps/desktop` is Electron.
- README still has Tauri references that may be stale.
- Issues include macOS Intel native dependency packaging and Linux package formats dropped after Tauri → Electron migration.
- Windows spellcheck behavior and Windows access/support are active concerns.

Implication: cross-platform release engineering is likely valuable.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/desktop/package.json#L3-L46`
- `https://github.com/different-ai/openwork/blob/dev/README.md#L81-L99`
- Issue notes in `reference/10-issues-risk-register.md`.

## Roadmap Map by Confidence

| Confidence | Direction | Why |
|---|---|---|
| High | Server-consumption first | Explicit in AGENTS.md and README architecture. |
| High | Desktop + server + orchestrator + router composition | Existing packages and docs. |
| High | Cloud/enterprise controls | Enterprise plan docs are concrete. |
| High | Proof-driven fraimz flow | Explicit in AGENTS.md. |
| Medium-high | Capability search/execute unification | Existing Den docs plus active PRs. Verify merge state. |
| Medium-high | Extension manifest abstraction | Docs outline PR stack. Verify implementation status. |
| Medium | Memory bank | Detailed draft, staged PR handoff. Verify whether implementation has started/landed. |
| Medium | Semantic UI MCP ecosystem | Docs and package exist; scope likely expanding. |
| Medium | Scheduled routines/cron | User issue request aligns with product positioning but no implementation evidence in snapshot. |

## How to Talk About Trajectory in an Interview

Good phrasing:

> “My read from the docs and active PRs is that OpenWork is moving from a desktop wrapper around OpenCode into a composable agent-control plane: local orchestrator, server APIs, UI MCP, routed capabilities, cloud workers, and enterprise policy. I’d like to help by taking a small part of that direction and making it reliable end to end.”

Avoid overclaiming:

- Do not say open PRs are merged unless rechecked.
- Do not claim semantic memory exists; the doc says v0 is explicit lexical and no auto-recall.
- Do not say Tauri is the current desktop shell without verifying; package manifests point to Electron.
