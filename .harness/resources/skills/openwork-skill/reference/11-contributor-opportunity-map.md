# 11 — Contributor Opportunity Map

This file turns repo findings into concrete ways to be useful.

## Contribution Themes Ranked by Leverage

### 1. Proof-Driven UX Polish

Why it matters: many open issues are visible, reproducible, and linked to core chat/workspace experience. They are ideal first PRs because they show you can follow the repo’s proof culture.

Examples:

- Code block copy button / code block theme correctness.
- Theme preview fixes and design-token class validation.
- Native scrollbar polish.
- Composer spellcheck toggle and non-English input UX.
- RTL and language preference behavior.

How to be useful:

- Pick one issue with clear reproduction.
- Make a minimal diff in `apps/app`.
- Add a regression test where possible.
- Include screenshots/video or fraimz proof.
- Explain before/after in user terms.

### 2. Desktop/Electron Release Reliability

Why it matters: launch/package failures block all product value. OpenWork appears to have migrated from Tauri to Electron, and issues show native dependency/package-format pain.

Examples:

- macOS Intel `node-pty` missing optional dependency.
- Linux `.deb`/`.rpm` packaging restoration.
- Windows spellcheck/Chromium behavior.
- Stale Tauri docs in README.

How to be useful:

- Reproduce on a target platform.
- Add packaging artifact checks.
- Clarify setup docs.
- Improve debug export/error messages.

### 3. OpenCode Compatibility and Provider Integrations

Why it matters: OpenWork’s “ejectable” promise depends on OpenCode behavior working through OpenWork. Bring-your-own providers are core to the product story.

Examples:

- `opencode.jsonc` schema mismatch errors.
- Slash command parity.
- Custom model router message-order failure.
- LM Studio/Ollama live model discovery.
- SQLite session sequencing failures.

How to be useful:

- Build minimal repro workspaces.
- Add config validators/migrations/clear error copy.
- Improve provider discovery and diagnostics.
- Add targeted tests that protect the edge case.

### 4. Capability Router / MCP / Extension System

Why it matters: this appears to be a central architectural direction. It unifies skills, MCP, plugins, UI actions, cloud capabilities, and memory bank tools.

Examples:

- Capability search/execution caching and diagnostics.
- Permission and token scope enforcement.
- Workspace resolution for capability execution.
- Extension manifest setup/test lifecycle.
- UI MCP action stability and accessibility.
- Skill marketplace materialization correctness.

How to be useful:

- Start by reading docs and open PRs; ask maintainers which shard needs help.
- Add tests around a narrow failure mode: unavailable connection, timed-out tools/list, viewer token rejection, frontmatter serialization, UI action not exposed.
- Treat observability as part of the feature.

### 5. Cloud/Den and Enterprise Safety

Why it matters: the repo is building a business around hosted workers, SSO, desktop policies, MCP consulting, skill development, and managed deployment. These surfaces need reliability and careful compatibility.

Examples:

- OpenCode Go provisioning/model sync/out-of-sync workspace 404.
- Desktop policy gating and enforcement.
- Enterprise plan grandfathering/gating tests.
- Google Workspace OAuth verification proof.
- Memory bank implementation/security fast-follows.

How to be useful:

- Work from an explicit contract and test matrix.
- Preserve “gate writes, not reads/deletes/delivery.”
- Add admin/user role tests.
- Make errors repairable, not just visible.

### 6. Documentation and DevEx Truth Maintenance

Why it matters: OpenWork is moving quickly; docs drift can waste contributor time and create support load.

Examples:

- Electron vs Tauri setup docs.
- pnpm version mismatch.
- What to run for baseline verification.
- Architecture maps for `apps/app` and host stack.
- Contributor “first useful PR” runbook.

How to be useful:

- Verify locally before editing docs.
- Update only what you can prove.
- Link commands and expected outputs.
- Keep docs short but precise.

## Role-Based Contribution Menu

| Your strength | Best starting area | First useful deliverable |
|---|---|---|
| Frontend React | `apps/app` UI issues | Small visible fix + screenshot/fraimz + test |
| Desktop/native | `apps/desktop`, packaging | Repro/fix native dependency or package target issue |
| Backend/API | `apps/server` | Endpoint behavior test, approval/file session/capability diagnostics |
| Cloud/backend | `ee/apps/den-api`, `ee/packages/den-db` | Gating/provisioning/memory route test or migration hardening |
| Integrations | MCP/plugins/providers/router | LM Studio, Slack/Telegram, skill install, capability execution test |
| QA/evals | `evals/flows`, scripts | Fraimz flow for a visible user journey |
| Docs/DevEx | README/docs/AGENTS | Truth audit for setup/architecture and first-contributor docs |
| Security | auth/permissions/policies/memory | Scope/regression tests and threat-model cleanup |

## “I Can Be Useful” Statements

Use these in an interview and adapt to your actual skills:

- “I’m comfortable starting with a small UX or docs issue, but I’m most interested in the capability-router direction because it seems central to how OpenWork keeps skills, MCP, and extensions usable without bloating context.”
- “I noticed several issues are really integration reliability problems, not just UI bugs. I can help by building minimal repros, adding diagnostics, and attaching proof so maintainers can merge faster.”
- “I like the proof-driven culture in AGENTS.md. I’d plan to include commands, screenshots/video, and fraimz where a user-visible flow changes.”
- “I’d be careful to preserve local-first/ejectable behavior when touching cloud or enterprise code.”
- “A valuable first contribution might be a documentation truth audit around Electron/Tauri setup and pnpm/Bun requirements, because that reduces onboarding friction for every future contributor.”

## First-PR Candidates

Pick one based on what is still open when you check live:

1. **Docs truth audit:** Electron/Tauri setup, pnpm/Bun versions, host stack architecture, first-run commands.
2. **Skill frontmatter serialization test:** reproduce cloud skill install YAML corruption and add round-trip coverage.
3. **Provider discovery diagnostics:** LM Studio/Ollama/custom provider model-list tests and error messages.
4. **Cross-platform package check:** verify native dependencies are present in packaged Electron builds.
5. **RTL/language preference spike:** define user preference path and agent prompt behavior without over-scoping.
6. **Capability-router diagnostics:** add tests for unavailable connection, timeout, viewer-token rejection, or workspace resolution.
7. **Memory-bank preflight:** implement or review one staged item from the memory doc, especially owner-scoping or FULLTEXT bootstrap assertions.

## How to Ask Maintainers for Direction

Good question:

> “I read the repo docs and saw the capability-router, extension-manifest, and Den/enterprise directions. For a first contribution, would it be more useful for me to tackle a small reproducible issue with proof, or help test/document one of the in-flight capability-router shards?”

Good follow-up:

> “Are there areas where you need contributors to reduce review load, such as writing fraimz flows, reproducing platform bugs, or updating stale architecture docs?”
