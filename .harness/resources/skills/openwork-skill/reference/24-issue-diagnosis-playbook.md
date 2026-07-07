# 24 — Issue Diagnosis Playbook (symptom → checks → fix files)

> Operational triage for the known failure classes. Each play: **realm** → **diagnostic
> entry points** (verified files/symbols) → **check order** → **fix locations**. Anchors
> verified against the checkout at HEAD `49d3f9ec`. Issue *context* (why it matters,
> related issues/PRs) lives in `10-issues-risk-register.md`; exact edit recipes in
> `17-change-recipes.md`; runnable tools in `26-agent-capability-catalog.md`.

## Start every diagnosis the same way

1. **Name the realm** (16-code-graph.md): UI / host stack / desktop bridge / Den cloud. The symptom's realm decides which play below applies.
2. **Snapshot the stack:** `bash scripts/openwork-debug.sh` (processes, ports, health, orphans). Hang/crash? → `diagnose-hang`.
3. **Open the in-app inspector** (browser/Electron console):
   - `window.__openwork.snapshot()` — routing, workspace, session, boot state
   - `window.__openwork.events(50)` — last 50 diagnostic events
   - `window.__openworkDevLogs` / `window.__openworkPerfLogs` — ring buffers
4. **Know the state locations:** runtime config DB `~/.config/openwork/runtime.sqlite` (`$OPENWORK_RUNTIME_DB`); OpenCode DB `$XDG_DATA_HOME/opencode/opencode.db`; server config `~/.config/openwork/server.json`; dev log sink `$OPENWORK_DEV_LOG_FILE`.

React Query cache keys worth inspecting when UI state looks stale:
`["react-session-snapshot"|"react-session-transcript"|"react-session-status"|"react-session-permissions"|"react-session-questions", workspaceId, sessionId]` and `["opencode-provider-list", baseUrl, directory]`.

---

## Play 1 — "OpenCode unavailable" / config schema errors

**Realm:** host stack. **Reference tests:** `apps/server/src/runtime-opencode-config-store.test.ts`.

| Entry point | File / symbol |
|---|---|
| Config read + key filter | `apps/server/src/runtime-opencode-config-store.ts` — `readRuntimeOpencodeConfig()`, `normalizeRuntimeOpencodeConfig()` |
| Config merge/write | `apps/server/src/openwork-runtime-config.ts` — `buildOpenworkRuntimeConfigObject()` (validates `default_agent`, `plugin`, `mcp`, `permission`, `provider`, `disabled_providers`) |
| Field validators | `apps/server/src/validators.ts` — `validateMcpName()`, `validateMcpConfig()` |
| Error wrapper | `apps/server/src/errors.ts` — `ApiError` |

**Check order:** ① unrecognized/typo'd key in `opencode.jsonc` (the normalizer filters known keys) → ② runtime DB state at `~/.config/openwork/runtime.sqlite` → ③ shape vs `RuntimeOpencodeConfig` in `apps/server/src/types.ts` → ④ engine stdout at startup for "unrecognized key".

**Fix in:** `runtime-opencode-config-store.ts` (normalizer), `validators.ts` (friendlier validation), `openwork-runtime-config.ts` (merge). A clearer error message here is a high-trust contribution (issue class #2386).

## Play 2 — Provider/model discovery (LM Studio/Ollama wrong models, 0 models after subscribe)

**Realm:** UI + host stack (+ cloud when provisioned). **Reference test:** `apps/server/src/runtime-provider-merge.test.ts`.

| Entry point | File / symbol |
|---|---|
| Client fetch + 5-min cache | `apps/app/src/react-app/infra/provider-list-query.ts` — `fetchProviderList()`, `getConnectedProviderSnapshot()`, `refreshProviderListQueries()` |
| New-provider events | `apps/app/src/app/lib/provider-events.ts` — `dispatchNewProviders()` |
| Server-side merge | `apps/server/src` — `mergeRuntimeProviderUpdate()` (upsert/null-delete semantics) |
| Cloud auto-sync | `apps/app/src/react-app/domains/cloud/use-cloud-provider-auto-sync.ts` |
| Model picker | `apps/app/src/react-app/domains/session/modals/use-model-picker.ts` |

**Check order:** ① `client.provider.list()` called with the right `directory`? → ② `connected` vs `all` filtering → ③ custom provider has a non-empty model dict → ④ stale 5-min cache (`PROVIDER_LIST_CACHE_MS`) — force refresh → ⑤ merge dropping providers via null semantics → ⑥ cloud: did auto-sync run after org connect?

**Fix in:** `provider-list-query.ts` (client), `mergeRuntimeProviderUpdate` (server), `use-cloud-provider-auto-sync.ts` (cloud path).

## Play 3 — Session/message failures (missing messages, SSE drops, seq/NOT NULL, switch bugs)

**Realm:** UI sync layer + OpenCode DB.

| Entry point | File / symbol |
|---|---|
| SSE pump + delta coalescing | `apps/app/src/react-app/domains/session/sync/session-sync.ts` — `trackWorkspaceSessionSync()`, `deltaFlushBuffer` |
| Transcript reconcile | `.../sync/transcript-reconcile.ts` — `reconcileTranscriptMessages()`, `applyRevertCursor()` |
| DB schema/seeding | `apps/server/src/opencode-db.ts` — `seedOpencodeSessionMessages()` (session/message/part tables) |
| Snapshot read model | `apps/server/src/session-read-model.ts` |
| Error recovery heuristics | `apps/app/scripts/session-error-recovery.ts` — `shouldResetRunState()` |

**Check order:** ① SSE stream up (status 200, events flowing — `test:events`)? → ② delta buffer flushing (`deltaFlushScheduled`)? → ③ NOT NULL/seq constraints in the OpenCode DB → ④ client snapshot vs server sequence mismatch → reconcile → ⑤ out-of-order messages: inspect `applyRevertCursor()`.

**Proof commands:** `pnpm --filter @openwork/app test:{events,sessions,session-switch,session-error-recovery}`.

## Play 4 — Skill/plugin install failures (frontmatter mangling, marketplace materialization)

**Realm:** host stack (+ cloud source).

| Entry point | File / symbol |
|---|---|
| Skill parse + validation | `apps/server/src/skills.ts` — `parseSkillEntry()` (name regex `^[a-z0-9]+(-[a-z0-9]+)*$`, description 1–1024) |
| Frontmatter round-trip | `apps/server/src/frontmatter.ts` — `parseFrontmatter()`, `buildFrontmatter()` |
| Hub catalog | `apps/server/src/skill-hub.ts` — GitHub fetch + `cachedCatalogByRepo` |
| Cloud plugin normalize | `apps/server/src/cloud-plugins.ts` — `normalizeConfigObject()` |
| Cloud skill cards | `apps/app/src/app/lib/den-skills.ts`; marketplace store `ee/apps/den-api/src/routes/org/plugin-system/store.ts` |

**Check order:** ① SKILL.md frontmatter well-formed (name/description/trigger)? → ② name violates the regex (uppercase/underscore)? → ③ `parseFrontmatter → buildFrontmatter` round-trip mangles YAML (the #2350 class — write the failing round-trip test first) → ④ cloud install: `normalizeConfigObject()` dropping `rawSourceText`? → ⑤ GitHub rate limits on hub fetch.

## Play 5 — Desktop launch/packaging failures (native deps, arch, sidecars)

**Realm:** desktop bridge.

| Entry point | File / symbol |
|---|---|
| Arch normalize + Rosetta | `apps/desktop/electron/main.mjs` / `runtime.mjs` — `normalizeRuntimeArch()`, `isMacRunningUnderRosetta()` |
| Sidecar presence | `runtime.mjs` — `commandMatchesPackagedSidecar()` (platform-suffixed binaries under `…/Resources/sidecars`) |
| UI arch gate | `apps/app/src/react-app/shell/architecture-mismatch-gate.tsx` |
| Console forwarder + hang detector | `apps/app/src/react-app/shell/debug-logger.ts` (3s heartbeat) |
| IPC contract guard | `apps/desktop/scripts/check-electron-bridge.mjs` |

**Check order:** ① `scripts/openwork-debug.sh diagnose-hang` classifies crash/hang/sidecar/app-state → ② packaged sidecar exists with correct arch suffix → ③ `normalizeRuntimeArch()` returns "unknown" ⇒ wrong-platform binary (the macOS-Intel node-pty class) → ④ `~/.config/openwork/server.json` readable → ⑤ `window.__openwork.snapshot()` for boot-phase state.

## Play 6 — Approval/permission confusion (writes blocked, prompts missing/stale)

**Realm:** host stack + UI. **Reference tests:** `apps/app/tests/{session-sync-permissions,permission-approval-modal}.test.ts`.

| Entry point | File / symbol |
|---|---|
| Approval service | `apps/server/src/approvals.ts` — `requestApproval()`, modes manual/auto |
| Permission cache | `session-sync.ts` — `seedPermissionState()`, `permissionKey()` |
| UI modal | `apps/app/src/react-app/domains/session/chat/permission-approval-modal.tsx` (Deny / Allow once / Allow for session) |
| Proxy gate | `apps/server/src/opencode-proxy-gate.ts` |

**Check order:** ① query cache at `permissionKey(workspaceId, sessionId)` — pending list present? → ② `receivedAt` older than snapshot start ⇒ dropped as stale → ③ "Allow for session" scope propagating? → ④ approval mode (`OPENWORK_APPROVAL_MODE`) and timeout (~12s default on den requests).

## Play 7 — Router/messaging failures (Slack/Telegram undelivered, wrong directory)

**Realm:** host stack (router).

| Entry point | File / symbol |
|---|---|
| Error classifier | `apps/opencode-router/src/delivery.ts` — `classifyDeliveryError()` → auth/forbidden/not_found/invalid_target/rate_limited/payload_too_large/unsupported_media/network/timeout |
| Health + identities | `apps/opencode-router/src/health.ts` — `GET /health` `HealthSnapshot` |
| Binding resolution | `apps/opencode-router/src/bridge.ts` — `(channel, identityId, peerId) → directory` |
| Channel adapters | `slack.ts`, `telegram.ts` |

**Check order:** ① `GET /health` — channel status + inbound/outbound activity counts → ② binding maps to the expected directory (`db.ts` BridgeStore) → ③ classify the error: retry only network/timeout/429; 401/403/404 = credential/target problem → ④ payload/media size limits.

## Play 8 — Cloud auth/org issues (sign-in loops, desktop-config 401/403, restriction misfires)

**Realm:** Den cloud + UI cloud domain. **Reference test:** `ee/apps/den-api/test/auth-protection.test.ts`.

| Entry point | File / symbol |
|---|---|
| Auth state machine | `apps/app/src/react-app/domains/cloud/den-auth-provider.tsx` — checking/signed_in/signed_out; 401 → `clearDenSession()` |
| Den client | `apps/app/src/app/lib/den.ts` — `createDenClient()`, `ensureDenActiveOrganization()`, 12s timeout, token storage keys |
| Handoff | `ee/apps/den-api/src/routes/auth/desktop-handoff.ts` (one-time grant exchange) |
| Guards | `ee/apps/den-api/src/routes/auth/index.ts` — Better-Auth proxy, single-org mode, SSO enforcement |
| Policy delivery | Flow D in `18-data-flows.md` (`/v1/me/desktop-config`) |

**Check order:** ① stored `authToken` → 401 = expired/invalid → ② `refresh()` result: 401 vs network error → ③ `activeOrgId`/`activeOrgSlug` set after refresh? → ④ `DEN_REQUIRE_SIGNIN` / `VITE_DEN_REQUIRE_SIGNIN` build flag → ⑤ single-org mode 403 on org mismatch → ⑥ policy misfire: recompute via `calculateDesktopPolicyForOrgMember` resolution order (member > team > org).

---

## When the play doesn't fit

- Trace the matching **data flow** in `18-data-flows.md` — breaks live at `⇒` boundaries (contract, URL/port, auth gate).
- Find the nearest **reference test** (Play tables above name them) — they encode the intended behavior and give you a harness to reproduce in.
- Reproduce minimally, then write the failing test *first*; this repo's review culture rewards a repro + test + smallest fix + proof (`13-development-workflow.md`).
