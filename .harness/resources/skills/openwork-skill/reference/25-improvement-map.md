# 25 — Improvement Map (verified opportunities, anchored to code)

> Where an agent can make the codebase better, grounded in **measured signals from the
> checkout** (HEAD `49d3f9ec`) — not vibes. Each entry: evidence → where → first move.
> Pair with `11-contributor-opportunity-map.md` (role-based menu, snapshot-dated) and
> `17-change-recipes.md` (exact edit paths). Re-verify signals before opening a PR.

## How this map was built (rerun to refresh)

```bash
# TODO/FIXME markers (result: nearly none — this repo doesn't accumulate marker debt)
grep -rEn "TODO:|FIXME:" --include="*.ts*" --include="*.mjs" apps packages ee | grep -v node_modules

# Test-coverage surface per workspace
for d in apps/* packages/* ee/apps/* ee/packages/*; do
  echo "$d: $(find $d -name '*.test.*' -not -path '*/node_modules/*' | wc -l) tests"; done

# Dead code / drift
bash scripts/find-unused.sh          # knip, CI-aware
node scripts/i18n-audit.mjs          # locale coverage
grep -in "tauri" README.md           # docs drift check
```

## Tier 1 — Test-coverage gaps (measured, high leverage)

The repo *values* tests (`apps/server`: **90 test files / 61 source**; `den-api`: 57; app: 32 + 20 e2e scripts). The zeros below are anomalies, not culture — which makes them welcome contributions:

| Workspace | Measured | Why it matters | First move |
|---|---|---|---|
| `apps/orchestrator` | **0 test files** vs a **8,761-line monolithic `src/cli.ts`** | It's the host runtime every desktop launch depends on: sidecar resolution, sandbox, ports, health. | Extract-and-test a pure seam first: `resolveSandboxMode`, port allocation, or manifest/version resolution. No behavior change, just coverage. |
| `ee/apps/inference` | **0 tests** on 12 source files | Billing-critical: quota check/deduct (`src/limits.ts`), key resolution (`src/keys.ts`), model alias (`model-catalog.ts`). A metering bug is a revenue/trust bug. | Unit-test `limits.ts` bucket math (windows: five_hour/weekly/monthly) with a stubbed db. |
| `ee/packages/den-db` | **0 tests** on 23 files incl. `src/columns.ts` (AES-256-GCM encrypted columns) | Encryption round-trip + `enc:v1:` format compatibility is silent-corruption territory. | Round-trip test for `encryptedColumn`/`encryptedTextColumn` incl. wrong-key and legacy-format cases. |
| `packages/types` | **0 tests** on the contract hub | Normalizers like `normalizeDesktopConfig` and policy default resolution have real logic. | Table-driven tests for policy normalization + `WorkspaceWire` compile-time assignability tripwires. |
| `packages/ui` | 0 tests | Seed-determinism of `getSeededPaper*Config` is an implicit API. | Snapshot the config for fixed seeds. |

## Tier 2 — Docs-truth drift (verified on disk)

| Drift | Evidence | Fix |
|---|---|---|
| README still teaches **Tauri/Rust** setup | `README.md` lines 84–85, 94, 109, 161, 164, 218; desktop is Electron (`apps/desktop/electron/`, `build-electron-desktop.yml`) | Rewrite build/setup section; remove Rust/Tauri prereqs; fix folder-picker note. Highest-traffic onboarding fix available. |
| **pnpm version split** | root `pnpm@11.4.0` vs `10.27.0` in README L92 + `apps/{app,desktop,server,orchestrator}/package.json` | Align sub-package `packageManager` fields + README to root, or document why they differ. |
| `apps/app/src/react-app/ARCHITECTURE.md` **provider-stack drift** | Real `shell/providers.tsx` nests `BootState → Server → ArchitectureMismatchGate → DenAuth → DesktopConfig → BrandTheme → RestrictionNotice → Local → ReloadCoordinator`; doc still shows `Server → GlobalSDK → GlobalSync → Local` | Update the doc's provider diagram to the current composition (see this skill's `18-data-flows.md` Flow A). |
| `ee/apps/den-controller` deprecated stub | only a README redirect | Sweep repo/docs for lingering `den-controller` references. |

## Tier 3 — In-code confessions (the few that exist)

| Marker | Location | Meaning |
|---|---|---|
| 3× "TODO: Restore the conditional disabled state once this action is wired into the React settings route" | `apps/app/src/react-app/domains/settings/pages/recovery-view.tsx:73,115,144` | Recovery actions lost their disabled-state guard in a route migration — small, well-scoped UI-correctness fix. |
| "TODO: Add tone to the file message" | `apps/app/src/components/chat/message-list.tsx:214` | Minor UX polish. |

(That's essentially all of them — improvement work here is found by *measurement*, not by grepping TODO.)

## Tier 4 — Structural opportunities (judgment calls; propose before doing)

| Opportunity | Evidence | Approach |
|---|---|---|
| Orchestrator monolith seams | one 8,761-line `cli.ts` holding sidecars + sandbox + health + logs + downloads | Don't big-bang refactor (repo prefers smallest diffs). Extract one pure module per PR, each with tests — sandbox resolution is the cleanest first seam. |
| Capability router test harness | search/execute is the declared direction (`docs/memory-bank-architecture.md`, PRs #2438/#2472) but young | Regression tests for: unavailable connection, tools/list timeout, viewer-token rejection, workspace resolution. |
| i18n/RTL completeness | 10 locales in `apps/app/src/i18n/locales/`; RTL requested (#2450); audit tool exists | Run `i18n-audit.mjs`, fix gaps per-locale; RTL needs a layout spike in composer/markdown first. |
| Fraimz flow coverage for new surfaces | 64 flows exist; new features (artifacts editing, voice, memory) keep landing | Adding a missing `.flow.mjs` for an uncovered surface is a maintainer-loved contribution (reduces review load). |
| Dead-code sweeps | `scripts/find-unused.sh` exists precisely because drift happens (e.g. legacy `src/components/markdown/markdown.tsx` beside the domain one, `app/lib/tauri.ts`) | Run the script, verify each hit manually (it warns about false positives), remove in small PRs. |

## Anti-patterns (don't "improve" these)

- **Don't** inject more tools/config into the model context — the architecture is moving to capability search/execute (`08-skills-mcp-extensions.md`).
- **Don't** gate reads/deletes/policy-delivery when touching `ee/` — only management writes gate (`23-cloud-graph.md`).
- **Don't** duplicate a wire type into a consumer — it goes in `packages/types` (`17-change-recipes.md` §F).
- **Don't** land a visible change without fraimz/screenshot proof, or a refactor without naming the exact commands run.
- **Don't** big-bang refactor the orchestrator or rename shared contracts "for cleanliness" — smallest-diff culture is explicit in AGENTS.md.
