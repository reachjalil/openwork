# 26 — Agent Capability Catalog ("everything you can run/do in this repo")

> The verified operations surface an agent has inside the OpenWork checkout: commands,
> tests, proof tools, diagnostics, internal skills, and MCP servers. Use this to act,
> not just read. Verified at HEAD `49d3f9ec`. Companion docs: `19-entrypoints-and-processes.md`
> (what each process is), `24-issue-diagnosis-playbook.md` (when something is broken).

## 1. Run the product

```bash
pnpm dev                 # full desktop app (Electron + host stack)
pnpm dev:ui              # UI only at :5173 (fastest edit loop for apps/app)
pnpm dev:den             # local Den cloud (MySQL docker + den-api :8790 + den-web :3005 + app)
pnpm demo:den            # Den demo with extra app ports
pnpm dev:electron:two    # two Electron windows (multi-instance flows)
pnpm dev:headless-web    # headless web server (CI/daemon)
```

Reset states: `pnpm demo:den:reset` (drop MySQL vol + reseed), `pnpm demo:electron:reset`.

## 2. Verify a change (fast → thorough)

| Tier | Command | Catches |
|---|---|---|
| 1. Types | `pnpm typecheck` (+ `pnpm --filter @openwork/desktop typecheck:electron`) | contract breaks, incl. IPC map |
| 2. Unit | `pnpm --filter <ws> test` (Bun) — strongest suites: `openwork-server` (90 test files), `den-api` (57), app (32) | logic regressions |
| 3. Targeted app scripts | `pnpm --filter @openwork/app test:{health,sessions,events,todos,permissions,session-scope,session-switch,session-error-recovery,fs-engine,mention-send,artifact-spreadsheet,open-target,desktop-cloud-sync,voice-cdp,remote-diagnostics,local-file-path,browser-entry,dev-log,refactor}` | one behavior end-to-end vs a live server |
| 4. E2E chain | `pnpm test:e2e` | integration |
| 5. **Fraimz proof** | `pnpm fraimz --flow <id>` → `evals/results/<run>/fraimz.html`; `--pr` posts to the PR | user-visible truth (required for visible changes) |

64 flow ids live in `evals/flows/*.flow.mjs` (e.g. `core-flow`, `app-smoke`, `mcp-connections-desktop-e2e`, `desktop-policies-demo`, `memory-save-recall`). Runner internals: `evals/runner/run.mjs` (CDP-driven).

## 3. Diagnose a broken stack

```bash
bash scripts/openwork-debug.sh            # snapshot: processes, ports, health, orphans
bash scripts/openwork-debug.sh tail       # live tail pnpm dev + /dev/log sink
bash scripts/openwork-debug.sh diagnose-hang   # classify Electron crash/hang/sidecar failures
bash scripts/openwork-debug.sh kill-orphans    # clean orphan openwork/opencode procs
bash scripts/openwork-debug.sh wait-healthy    # block until openwork-server /health = 200
openwork status                            # orchestrator health/smoke (if host CLI installed)
curl localhost:8787/health                 # server; :8790 den-api; :8791 inference
```

More diagnostic anchors per symptom: `24-issue-diagnosis-playbook.md`.

## 4. Repo hygiene & analysis tools

| Tool | Command | Does |
|---|---|---|
| Unused-code finder | `bash scripts/find-unused.sh` | knip wrapper cross-referenced against CI/build/scripts/routing to cut false positives |
| i18n audit | `node scripts/i18n-audit.mjs` | locale coverage/consistency (CI: `ci-i18n.yml`) |
| Cycle check | `madge --circular` in `apps/app` | layer-rule enforcement (must be 0) |
| Changelog | `node scripts/generate-changelog.mjs` | from commits |
| Mock OAuth MCP | `node scripts/mock-oauth-mcp-server.mjs` | test OAuth MCP flows without a real provider |
| Release | `scripts/release/` (review/prepare/ship) + `release` skill | versioning/tagging pipeline |

## 5. Internal agent skills (`.opencode/skills/`, 21 verified)

The repo ships its own skills for agents working inside it. High-leverage ones:

| Skill | Use for |
|---|---|
| `voiceover` | **Start feature work here** — demo script alignment before code (AGENTS.md paved path). |
| `fraimz` | Produce the frame-by-frame proof artifact for a PR. |
| `run-evals` | Launch OpenWork on Daytona and run eval flows. |
| `browser-automation` | Drive the local Electron app via CDP (browser_snapshot etc.). |
| `agent-first-screenshots` | Clean product screenshots via CDP. |
| `create-plugin` | Scaffold an OpenCode plugin with correct API/tool/hook shape. |
| `daytona-electron-test` / `daytona-flow-validator` / `daytona-recording-artifacts` | Real-desktop e2e on Daytona sandboxes with pass/fail frames. |
| `daytona-cloud-instance` / `daytona-cloud-server` / `daytona-electron-den` / `daytona-seeded-cloud-demo` | Desktop+cloud two-sandbox e2e, seeded demo org ("Acme Robotics"). |
| `daytona-chrome-cdp` / `daytona-dev` / `daytona-secrets-volume` | Chrome-in-sandbox for OAuth; env setup; provider keys via Infisical. |
| `get-env-var` | Fetch missing secrets/API keys from Infisical. |
| `openwork-models` | Manage OpenWork inference model aliases/overlays/refresh. |
| `upload-photo` | Host an image (Vercel Blob) for embedding in a PR. |
| `shadcn` | Add/fix/compose shadcn UI components. |
| `release` | Step through version/tag/verify. |

## 6. MCP servers an agent can attach

| Server | Start | Gives |
|---|---|---|
| `openwork-ui-mcp` | `npx openwork-ui-mcp` | `ui_snapshot` / `ui_list_actions` / `ui_execute_action` against the running desktop app (semantic UI control — no pixel clicking). Requires app running (bridge discovery file). |
| `@openwork/handsfree` | `npx -y @openwork/handsfree mcp` | macOS Accessibility computer-use (background input, AX snapshots). |
| `den-admin-mcp` | `node ee/packages/den-admin-mcp/index.mjs` | read-only Den analytics (`den_overview`, `den_query` SELECT-only). Needs `DATABASE_URL`. |
| `opencode-chrome-devtools` | configured in `.opencode/opencode.json` | CDP browser control plugin. |

## 7. Cloud/db operations

```bash
pnpm dev:den:mysql            # start local MySQL (docker compose)
pnpm dev:den:db-push          # push den-db schema
pnpm dev:den:seed-demo        # seed demo org
pnpm --filter @openwork-ee/den-db db:generate   # create migration from schema diff
```

Onboarding automation: `npx openwork-bootstrap {install|doctor|cloud onboard|cloud bootstrap-workspace|cloud claim-link}`.

## 8. Harness config (this skill's own pipeline)

```bash
pnpm harness:validate && pnpm harness:preview && pnpm harness:activate
```
Edit skills under `.harness/resources/skills/…` (source), never `.claude/`/`.agents/` (generated).

## Decision guide: which capability for which job

| Job | Reach for |
|---|---|
| Prove a UI fix works | `fraimz` skill / `pnpm fraimz --flow <id>` |
| Explore app behavior interactively | `browser-automation` (CDP) or `openwork-ui-mcp` |
| Reproduce a cloud bug locally | `pnpm dev:den` + seed, or `daytona-seeded-cloud-demo` |
| Stack won't start | `scripts/openwork-debug.sh diagnose-hang` |
| Need a provider API key for e2e | `get-env-var` / `daytona-secrets-volume` |
| Check nothing else broke | `pnpm typecheck` → targeted `test:*` → `test:e2e` |
| Find dead code to clean | `scripts/find-unused.sh` |
| Start any feature | `voiceover` skill first (no code until script approved) |
