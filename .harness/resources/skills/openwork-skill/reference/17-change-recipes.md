# 17 — Change Recipes ("I want to change X → edit Y → prove with Z")

> The reverse index of the code graph. Find the feature, get the **primary files**
> (where the change lives), the **contract/secondary files** (what else must move so
> it compiles and works across process boundaries), and the **proof** (test/eval to run).
> Paths verified against the checkout at HEAD `49d3f9ec`. Confirm a file still exists
> before editing — the `dev` branch moves fast.

**How to use:** name the [runtime realm](16-code-graph.md#the-four-runtime-realms-know-which-one-youre-in) first (UI / host stack / desktop / cloud), then jump to the section. The proof column follows AGENTS.md: user-visible changes want a **fraimz** run; type/logic changes want a targeted test.

---

## A. UI — chat, composer, rendering (`apps/app`)

| Change | Primary file(s) | Contract / secondary | Proof |
|---|---|---|---|
| Chat composer input / editor | `apps/app/src/react-app/domains/session/surface/composer/composer.tsx` (Lexical), `.../composer/editor.tsx` (CodeMirror) | `.../session/sync/draft-store.ts` (state) | `pnpm --filter @openwork/app test:mention-send`; fraimz `core-flow` |
| Markdown + syntax highlight (Shiki) | `apps/app/src/react-app/domains/session/surface/markdown.tsx` | `apps/app/src/components/ui/code-block.tsx` | fraimz `artifact-markdown-render` |
| Code-block dark-mode / theme correctness | `.../session/surface/markdown.tsx` (Shiki theme resolution) | `apps/app/src/app/theme.ts` | screenshot both themes |
| Theme / colors (light/dark/auto) | `apps/app/src/app/theme.ts`, `.../domains/settings/appearance/theme-section.tsx` | `apps/app/index.html` (inline no-flash script), `apps/app/src/app/index.css` | fraimz theme flow |
| Theme picker preview inheritance | `.../domains/settings/appearance/theme-section.tsx` | — | screenshot preview vs active |
| Native scrollbar styling | `apps/app/src/app/index.css` / Tailwind layer | — | screenshot |
| Tailwind color class not rendering | search Radix palette override in `apps/app` Tailwind config / `theme.ts` | `packages/ui` if shared | add regression test |
| Command palette (⌘K) | `apps/app/src/react-app/shell/command-palette.tsx` | `apps/app/src/app/lib/opencode-session.ts` (listCommands) | fraimz `session-command-palette-move-to-group` |
| Notifications / toasts | `apps/app/src/react-app/shell/providers.tsx` (mounts `<Toaster/>`), `.../kernel/notification-store.ts` | `apps/app/src/components/ui/sonner.tsx` | `pnpm --filter @openwork/app test` (notification-store) |
| Find-in-transcript | `.../session/surface/find-bar.tsx` + `find-store.ts` | `.../session/search/session-search.ts` | fraimz `in-chat-find` |
| Terminal (xterm) | `.../session/terminal/terminal-dock.tsx` | desktop PTY IPC (`apps/desktop/electron/main.mjs` terminal handlers) | manual |
| Artifacts (code / spreadsheet) | `.../session/artifacts/artifact-panel.tsx`, `artifact-text-editor.tsx`, `artifact-spreadsheet-editor.tsx` | — | `pnpm --filter @openwork/app test:artifact-spreadsheet`; fraimz `artifact-*` |
| Voice input | `.../session/voice/voice-panel.tsx` | `apps/app/src/app/lib` voice client | fraimz `voice-session-context` |
| Onboarding / welcome | `.../domains/onboarding/welcome-page.tsx`, `provider-selection-step.tsx` | `apps/app/src/react-app/shell/app-root.tsx` (WelcomeRoute) | fraimz `voiceover-first-dx` |

## B. UI — settings, connections, workspace, i18n (`apps/app`)

| Change | Primary file(s) | Contract / secondary | Proof |
|---|---|---|---|
| Add / edit a settings tab | `.../domains/settings/pages/<tab>-view.tsx`, `.../settings/shell/tabs.tsx` | `apps/app/src/app/types.ts` (`SettingsTab` enum) | fraimz `settings-extensions-mcp` |
| Model / provider selection | `.../domains/settings/pages/ai-view.tsx`, `.../session/modals/model-picker-modal.tsx` | `.../domains/connections/provider-auth/*` | fraimz `llm-provider-*` |
| MCP connections UI | `.../domains/connections/modals/add-mcp-modal.tsx`, `.../settings/pages/mcp-view.tsx` | `.../connections/use-org-mcp-connections.ts` | fraimz `mcp-connections-desktop-e2e` |
| MCP silent re-auth | `.../domains/connections/mcp-silent-reauth.ts` | — | fraimz `mcp-oauth-silent-reauth` |
| Skills / plugins UI | `.../domains/settings/pages/skills-view.tsx`, `plugins-view.tsx` | `apps/app/src/react-app/design-system/extension-card.tsx` | fraimz `extensions-marketplace-updates` |
| Extension config panel (new provider/tool) | `.../domains/settings/<name>-config.tsx` + register in `.../settings/extension-registry.tsx` | `apps/app/src/app/extensions.ts` (manifest contract) | fraimz `settings-extensions-mcp` |
| Workspace create / rename / share | `.../domains/workspace/create-workspace-modal.tsx`, `rename-workspace-modal.tsx`, `share-workspace-modal.tsx` | `apps/app/src/app/lib/desktop.ts` (workspace IPC) | manual + fraimz |
| Workspace routing / route identity | `apps/app/src/react-app/shell/workspace-routes.ts`, `session-route.tsx`, `settings-route.tsx` | `apps/app/src/react-app/kernel/store.ts` | `pnpm --filter @openwork/app test:session-scope` |
| i18n string / new locale | `apps/app/src/i18n/index.ts`, `apps/app/src/i18n/locales/<locale>.ts` | `.../settings/appearance/language-section.tsx` | `pnpm i18n-audit` (or CI `ci-i18n.yml`) |
| RTL / language-preference behavior | `apps/app/src/i18n/*` + composer/markdown layout | — | fraimz + screenshot RTL |
| Spellcheck toggle (non-English input) | composer settings in `.../session/surface/composer/*` + a preference store under `.../settings/state/` | desktop webContents flags (`apps/desktop/electron/main.mjs`) | manual on Windows |

## C. Host stack — server, orchestrator, router (`apps/server`, `apps/orchestrator`, `apps/opencode-router`)

| Change | Primary file(s) | Contract / secondary | Proof |
|---|---|---|---|
| Add/modify a server API route | `apps/server/src/routes/{core,workspaces,sessions,files,operations}.ts` + register in `apps/server/src/routes/registry.ts` | `apps/server/src/server.ts` | `pnpm --filter @openwork/app test:health` |
| Workspace CRUD / import-export | `apps/server/src/workspaces.ts`, `routes/workspaces.ts`, `workspace-export-safety.ts`, `workspace-import-preview.ts` | `packages/types/src/workspace.ts` | fraimz `extensions-export-portable` |
| Approval / write-gate behavior | `apps/server/src/approvals.ts` | `apps/server/src/config.ts` (mode parse; `OPENWORK_APPROVAL_MODE=auto`) | `test:permissions` |
| Skills endpoints (install/list/delete) | `apps/server/src/skills.ts`, `skill-hub.ts` | `routes/core.ts` | fraimz `admin-to-member-marketplace` |
| Cloud skill install frontmatter bug | `apps/server/src/skills.ts` + `apps/server/src/frontmatter.ts` | `ee/packages/utils` skill-markdown | round-trip test |
| Plugins / MCP registration | `apps/server/src/plugins.ts`, `mcp.ts`, `cloud-plugins.ts`, `claude-plugin-bundle.ts` | `opencode.json` read/write | fraimz `oauth-mcp-install` |
| OpenCode config schema / `opencode.jsonc` errors | `apps/server/src/runtime-opencode-config-store.ts`, `portable-opencode.ts`, `jsonc.ts` | `constants.json` (pinned opencode version) | repro workspace |
| File sessions (catalog/read/write/TTL) | `apps/server/src/file-sessions.ts`, `routes/files.ts` | — | `test:fs-engine` |
| Sidecar resolution / add a sidecar | `apps/orchestrator/src/cli.ts` (`resolveSidecarConfig`, `spawnProcess`, `downloadSidecarBinary`) | `constants.json` | `openwork status` smoke |
| Sandbox mode (docker/container) | `apps/orchestrator/src/cli.ts` (`resolveSandboxMode`, `resolveSandboxExtraMounts`) | `apps/opencode-router/src/path-scope.ts` pattern | manual sandbox run |
| Orchestrator TUI | `apps/orchestrator/src/tui/app.tsx` (OpenTUI + Solid) | — | manual |
| Add a chat channel (e.g. WhatsApp) | new adapter in `apps/opencode-router/src/` + register in `bridge.ts` + wire in `cli.ts` | `slack.ts` / `telegram.ts` as templates | router tests |
| Slack routing / identities | `apps/opencode-router/src/slack.ts`, `health.ts` | `db.ts` (BridgeStore) | fraimz `slack-org-connection` |
| Telegram pairing / bots | `apps/opencode-router/src/telegram.ts` | `config.ts` | manual |

## D. Desktop shell (`apps/desktop`)

| Change | Primary file(s) | Contract / secondary | Proof |
|---|---|---|---|
| Add / change an IPC command | `apps/desktop/electron/main.mjs` (`desktopCommandHandlers`) | **must** update `packages/types/src/desktop-ipc.ts` (`DesktopCommandMap`) **and** `apps/app/src/app/lib/desktop.ts` invoker; run `check-electron-bridge.mjs` | `pnpm --filter @openwork/desktop typecheck:electron` |
| Runtime mode (orchestrator vs direct spawn) | `apps/desktop/electron/runtime.mjs`, `main.mjs` (`bootRuntimeForSelectedWorkspace`) | env `OPENWORK_DEV_MODE` | launch app |
| Workspace persistence | `apps/desktop/electron/workspace-store.mjs` | `packages/types/src/workspace.ts` | `apps/desktop/electron/*.test.mjs` |
| Auto-update (stable/alpha) | `apps/desktop/electron/updater.mjs` | `electron-builder.yml` publish block | dispatch `build-electron-desktop.yml` |
| Packaging / installers | `apps/desktop/electron-builder.yml`, `scripts/electron-build.mjs` | `build/entitlements.mac.plist` (macOS) | inspect built artifact |
| macOS Intel `node-pty` crash | `apps/desktop/electron/runtime.mjs` (`isMacRunningUnderRosetta`, arch normalize), `scripts/prepare-sidecar.mjs` | `electron-builder.yml` `asarUnpack` | package + run on Intel |
| Linux `.deb`/`.rpm` restore | `apps/desktop/electron-builder.yml` `linux.target` | sidecars in `extraResources` | build Linux target |
| Deep links (`openwork://`) | `apps/desktop/electron/main.mjs` (protocol + `queueDeepLinks`/`flushPendingDeepLinks`) | `apps/app/src/react-app/shell/startup-deep-links.ts` | manual link |
| Native menu / tray | `apps/desktop/electron/app-menu.mjs` | `apps/app/src/react-app/shell/app-menu.tsx` | manual |
| UI-control bridge (for `openwork-ui-mcp`) | `apps/desktop/electron/ui-control-server.mjs` | `packages/openwork-ui-mcp/index.mjs` (discovery file) | MCP snapshot |
| Tauri→Electron migration handoff | `apps/desktop/electron/migration.mjs` | — | fresh-profile launch |

## E. Cloud / enterprise (`ee/`)

| Change | Primary file(s) | Contract / secondary | Proof |
|---|---|---|---|
| Add / change a desktop policy | `packages/types/src/den/desktop-policies.ts` (definition) | `ee/packages/den-db/src/schema/desktop-policies.ts`, `ee/apps/den-api/src/desktop-policies.ts` (calc), `ee/apps/den-web` policy UI, `apps/app/src/react-app/domains/cloud/desktop-config-provider.tsx` | fraimz `desktop-policies-demo` |
| Add a den-api endpoint | `ee/apps/den-api/src/routes/<area>/*.ts` | `ee/apps/den-web/app/api/den/[...path]` proxy passes through automatically | den-api tests |
| Billing / entitlements | `ee/apps/den-api/src/entitlements.ts`, `routes/org/billing.ts` | `ee/packages/den-db/src/schema/subscriptions.ts` (Stripe) | fraimz billing |
| Worker provisioning | `ee/apps/den-api/src/workers/{reconciler,provisioner,shared}.ts` | `ee/apps/den-worker-proxy`, `ee/packages/den-db/src/schema/workers.ts` (Daytona tables) | fraimz `agent-bootstrap-workspace` |
| Inference gateway / quota | `ee/apps/inference/src/{proxy,limits,keys,model-catalog}.ts` | `packages/types/src/den/inference.ts`, `ee/packages/den-db/src/schema/inference.ts` | fraimz `openwork-models-voice-funnel` |
| DB schema change | new migration in `ee/packages/den-db/drizzle/` + `ee/packages/den-db/src/schema/*.ts` | run `pnpm --filter @openwork-ee/den-db db:generate` then `db:push` | CI `den-db-check.yml` |
| Encrypted column | `ee/packages/den-db/src/columns.ts` (`encryptedColumn`/`encryptedTextColumn`) | env `DEN_DB_ENCRYPTION_KEY` (≥32 chars) | migration + read-back |
| Dashboard screen | `ee/apps/den-web/app/(den)/dashboard/_components/*.tsx` | calls a den-api route | fraimz dashboard flow |
| SSO / SCIM | `ee/apps/den-api/src/{sso,sso-saml-*}.ts`, `routes/org/{sso,scim}.ts` | `prds/scim/*` plans | fraimz `den-single-org-sso-mode` |
| Memory bank | `ee/apps/den-api/src/routes/memory.ts` | `docs/memory-bank-architecture.md`, capability search/execute | fraimz `memory-save-recall` |
| Org install links / self-host bootstrap | `ee/apps/den-api/src/routes/bootstrap/*`, `packages/openwork-bootstrap` | `docs/org-install-links.md`, `packages/install-config` | fraimz `org-install-link` |

## F. Cross-cutting contract changes (edit → ripple)

These start in `packages/types` (the hub). **Never** duplicate a wire type in a consumer — add it here first.

| Edit | Must also update |
|---|---|
| `packages/types/src/desktop-ipc.ts` — command shape | `apps/desktop/electron/main.mjs` handler + `apps/app/src/app/lib/desktop.ts` invoker |
| `packages/types/src/workspace.ts` — `WorkspaceWire` | `apps/desktop/electron/workspace-store.mjs`, `apps/server/src/types.ts`, `apps/app/src/app/lib/desktop-types.ts`, `ee/packages/den-db` |
| `packages/types/src/den/desktop-policies.ts` | `ee/apps/den-api` (calc+endpoint), `ee/apps/den-web` (UI), `apps/app/.../cloud/desktop-config-provider.tsx`, `apps/desktop/electron/main.mjs` |
| `packages/types/src/den/inference.ts` | `ee/apps/den-api` (budget), `ee/apps/inference` (metering), `apps/app` (display) |
| `packages/install-config/src/index.ts` | `apps/installer`, `ee/apps/den-api` install route |
| `packages/email/src/templates/index.ts` | `ee/apps/den-api` email service call sites |

## Proof commands quick reference

```bash
# Targeted app tests (Bun/Node scripts under apps/app/scripts, run from repo root)
pnpm --filter @openwork/app test:health          # server up
pnpm --filter @openwork/app test:sessions        # session CRUD
pnpm --filter @openwork/app test:events          # SSE streaming
pnpm --filter @openwork/app test:permissions     # approval flow
pnpm --filter @openwork/app test:session-scope   # workspace-scoped routing
pnpm --filter @openwork/app test:fs-engine       # file sessions
pnpm --filter @openwork/app test:e2e             # e2e chain

# Typecheck (fastest global gate)
pnpm typecheck

# Fraimz proof for a user-visible flow (see evals/flows/*.flow.mjs for ids)
pnpm fraimz --flow <flow-id>
pnpm fraimz --flow <flow-id> --pr    # post proof on the PR
```

> If you can't run a proof, AGENTS.md requires you to **say so explicitly** and give the reviewer exact repro steps. Pure docs/types-only changes may skip fraimz — but state that.
