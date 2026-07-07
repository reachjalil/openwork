# 10 — Issues and Risk Register

Snapshot: public GitHub issues/PRs reviewed on **2026-07-05**. Re-check live status before referencing an issue in an interview or PR.

> To actually **diagnose and fix** any of these classes, use `24-issue-diagnosis-playbook.md`
> (symptom → check order → fix files, verified against the checkout). For where each fix
> lands, `17-change-recipes.md`. This register stays the *what/why*; those are the *how*.

## Risk Categories

| Category | What it suggests | Good contributor posture |
|---|---|---|
| UX polish debt | The product is usable enough for detailed user feedback, but polish gaps remain. | Fix visible bugs with screenshots/video and targeted tests. |
| Theme/design-token fragility | Tailwind/Radix palette choices can silently remove CSS. | Add lint/tests and use sanctioned tokens. |
| Cross-platform Electron packaging | Native deps and packaging formats are fragile after Electron migration. | Reproduce on target OS, improve packaging/test matrix. |
| OpenCode compatibility | Config schemas, slash commands, custom providers, and sessions can break. | Build compatibility checks and migration/error guidance. |
| Cloud/provisioning | Subscriptions/workspaces/models can get out of sync. | Improve diagnostics and repair flows. |
| Skills/marketplace materialization | Skill YAML/frontmatter bugs hurt core extensibility. | Add round-trip tests for skill installation. |
| Roadmap security gaps | Memory bank v0 has accepted plaintext/rate-limit/deletion deferrals. | Help implement staged security gates before GA. |
| Docs drift | Tauri/Electron and pnpm version signals may conflict. | Confirm with maintainers, then update docs. |

## Open Issues Observed

| Issue | Area | Symptom | Why it matters | Useful contribution angle |
|---|---|---|---|---|
| `#2478` Add copy button to code blocks | Chat markdown UX | Users manually select long code blocks. | Code-heavy agent output needs frictionless copy. | Implement/verify copy button; PR `#2489` may already address it. |
| `#2440` Code block dark-mode bug | Markdown/theme | Shiki hardcoded to `github-light`, unreadable in dark mode. | Core chat readability. | Verify merged fix, add regression around resolved theme. |
| `#2454` OpenCode Go account/workspace provisioning | Cloud/account | Subscribed account shows 0 models/out-of-sync and web workspace 404. | Trust-breaking paid/cloud onboarding failure. | Add provisioning diagnostics, repair command, better error copy. |
| `#2450` RTL support + session search | i18n/accessibility | Persian/Arabic/Hebrew RTL and search requested. | Global users and non-English workflows. | Implement RTL toggle/direction inference and session search UX. |
| `#2441` Spell checker in Vietnamese/Windows | Desktop/Electron UX | Chromium spellchecker underlines all Vietnamese; no toggle. | Non-English prompt composition is distracting. | PR `#2443` may fix; verify default and persistence. |
| `#2341` Missing Tailwind classes | Design tokens | `emerald`, `zinc`, `neutral`, default scales compile to no rules because Radix palette replaces Tailwind colors. | Silent unstyled UI and regressions. | Add palette/class validation; PR `#2466` may address. |
| `#2444` Native scrollbars | UI polish | Default OS scrollbar looks outdated. | Visual polish in long conversations. | PR `#2473` may address; verify theme behavior. |
| `#2364` LM Studio wrong models | Provider integration | Shows static/hardcoded models instead of local LM Studio models. | Local provider trust and usability. | PR `#2442`/`#2367` may address; add provider sync tests. |
| `#2386` OpenCode unavailable due config key | OpenCode compatibility | `opencode.jsonc` has unrecognized `instruction` key. | Config migration/schema errors can brick chat. | Friendly config validator/migration docs; debug export classification. |
| `#2099` Custom model router failure | Provider/router | “System message must be at the beginning” with custom API/router. | Bring-your-own provider story depends on compatibility. | Repro with CC-Switch/custom model; inspect message ordering. |
| `#2284` Routines/cron jobs | Product feature | User wants scheduled workflows like Claude Cowork. | Aligns with productized workflows and Slack sharing. | Draft architecture: scheduler + approvals + artifacts + connector send. |
| `#2351` macOS Intel crash | Packaging/native deps | Missing `@lydell/node-pty-darwin-x64` in packaged app. | Launch crash is severe. | Reproduce packaging, fix optional dep bundling, add artifact check. |
| `#2350` Cloud skill frontmatter corruption | Skills/marketplace | Installed shared skill mangles YAML `name`/`description`. | Skills are core product; broken materialization hurts trust. | Add round-trip skill pack test and fix serialization. |
| `#2084` Restore `.deb`/`.rpm` | Linux packaging | Electron migration dropped native Linux package formats. | Linux install friction/regression. | Restore Electron builder targets and test update paths. |
| `#2323` Slash commands unavailable | OpenCode parity | Only `/init` and `/review` appear, not standard commands. | Ejectable OpenCode promise. | Clarify intended parity; surface commands through capability/search model. |
| `#2328` Theme picker previews | Appearance UI | Preview cards inherit active theme. | Small but visible polish issue. | PR `#2486` may address; verify design tokens. |
| `#1943` Respond in user language | i18n/agent behavior | AI replies English despite non-English conversation. | Global UX. | Prompt/user preference integration; test language behavior. |
| `#2096` SQLite `session_message.seq` | Session persistence | NOT NULL failure sending messages. | Data integrity and chat failure. | Add migration/invariant tests around session message sequencing. |

## Open PR Signals Observed

| PR | Direction | What to verify live |
|---|---|---|
| `#2492` Den web shared MCP connection connect affordance | Cloud/admin UX | Whether merged; regression around owner/admin vs non-admin. |
| `#2489` Code block copy | Chat UX | Whether it closes `#2478`; keyboard/accessibility states. |
| `#2486` Theme preview fix | Theme UI | Whether it duplicates/overlaps `#2466`. |
| `#2470` Text artifact preview/edit/save | Artifact/file workflows | Optimistic concurrency, unsupported file fallback, tests. |
| `#2472` Search/execute routed connections and plugin skills | Capability router | Permissions, cache invalidation, workspace resolution, timeouts. |
| `#2473` Scrollbar styling | UI polish | Cross-platform scrollbar behavior. |
| `#2467` / `#2447` Shiki dark theme | Markdown/theme | Which approach merged and whether duplicates remain. |
| `#2466` Missing Tailwind classes | Design tokens | Regression test coverage. |
| `#2443` Spellcheck toggle | Desktop/i18n | Electron + Lexical sync and Windows behavior. |
| `#2442` / `#2367` LM Studio live models | Provider integration | Model refresh, fallback endpoints, stale selection behavior. |
| `#2438` Federated search/execute capability pattern | Architecture | Whether superseded by `#2472` or split into smaller shards. |
| `#2423` Workspace-scoped session APIs | Architecture cleanup | Whether old server compatibility removal affects current users. |

## Hidden / Strategic Risks From Docs

| Risk | Source | Why it matters | Useful mitigation |
|---|---|---|---|
| Memory v0 plaintext at rest | Memory-bank doc | Sensitive user memory could be stored unencrypted. | Help build pre-GA encryption at rest and secret filtering tests. |
| Memory no quota/rate limit v0 | Memory-bank doc | Abuse/storage exhaustion. | Add cheap input bounds now, quota fast-follow. |
| Memory delete cleanup gap | Memory-bank doc | Account/org deletion may not reap memory rows. | Add offboarding cleanup hook before GA. |
| Fulltext bootstrap hazard | Memory-bank doc | Drizzle migrations may not create FULLTEXT on fresh production DB. | Implement idempotent bootstrap assertion. |
| Enterprise gating breaks trust if wrong | Plan-gating doc | Gating must not break sign-in, reads, deletes, policy delivery. | Add regression tests around never-gated paths. |
| OAuth restricted scopes | Google doc | Gmail compose/verification can block launch. | Produce compliance-ready demos and data-use docs. |
| Capability router permissions | PR trajectory | Search/execute across MCP/UI/cloud could expose actions incorrectly. | Enforce scopes, diagnostics, viewer-token rejection, proof flows. |

## Best Interview Use

Do not walk into the interview saying “your product has bugs.” Instead:

> “I saw a few classes of issues where I could be helpful: cross-platform Electron packaging, OpenCode/provider compatibility, skills marketplace reliability, and proof-driven UI polish. I’d like to start with a small reproducible issue, add a test or fraimz proof, and then graduate into capability-routing or cloud policy work once I understand the maintainers’ review style.”
