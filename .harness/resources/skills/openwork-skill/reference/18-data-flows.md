# 18 — Data Flows (end-to-end call-path traces)

> Runtime edges of the [code graph](16-code-graph.md), spelled out as **ordered file
> sequences**. Use these to trace a user action across process boundaries and to know
> exactly where to put a breakpoint, log line, or fix. Paths verified at HEAD `49d3f9ec`.

Legend: `→` in-process call · `⇒` cross-process (HTTP/IPC/SSE) · `⟳` event/subscription.

---

## Flow A — App boot & provider stack (`apps/app`)

Verified from `apps/app/src/index.react.tsx` and `apps/app/src/react-app/shell/providers.tsx`:

```text
apps/app/src/index.react.tsx
  bootstrapTheme()               ← apps/app/src/app/theme.ts   (no-flash theme)
  initLocale()                   ← apps/app/src/i18n/index.ts
  initializeDenBootstrapConfig() ← apps/app/src/app/lib/den.ts
  ReactDOM.createRoot(...).render(
    QueryClientProvider          ← react-app/infra/query-client.ts
    → TooltipProvider
    → PlatformProvider           ← react-app/kernel/platform.tsx   (electron vs web)
    → AppProviders               ← react-app/shell/providers.tsx  ▼
    → Router (HashRouter desktop / BrowserRouter web)
    → AppRoot                    ← react-app/shell/app-root.tsx
  )

AppProviders composition (exact nesting, providers.tsx):
  BootStateProvider
   └ ServerProvider(defaultUrl)          ← kernel/server-provider.tsx   (server URL + health)
      └ ArchitectureMismatchGate
         ├ <DesktopRuntimeBoot/>         ← shell/desktop-runtime-boot.ts (workspace list via IPC)
         └ DenAuthProvider               ← domains/cloud/den-auth-provider.tsx
            └ DesktopConfigProvider      ← domains/cloud/desktop-config-provider.tsx (policies)
               └ BrandThemeProvider      ← domains/cloud/brand-theme.tsx
                  └ RestrictionNoticeProvider
                     └ LocalProvider     ← kernel/local-provider.tsx (draft/model/notif)
                        └ ReloadCoordinatorProvider + <Toaster/>
```

> ⚠️ **Drift note:** the older `ARCHITECTURE.md` / skill doc 05 shows
> `ServerProvider → GlobalSDKProvider → GlobalSyncProvider → LocalProvider`. The real
> top-level `providers.tsx` no longer nests `GlobalSDKProvider`/`GlobalSyncProvider`
> here — those kernel providers (`kernel/global-sdk-provider.tsx`,
> `kernel/global-sync-provider.tsx`) are mounted deeper (server/session scope). Trust
> `providers.tsx` for the top-level stack; read the two kernel files for the SDK layer.

## Flow B — Send a chat prompt & stream the response

The core loop. Where to look when "messages don't appear" or "streaming breaks":

```text
1. Composer submit
   domains/session/surface/composer/composer.tsx
   → domains/session/sync/draft-store.ts        (read draft parts/attachments)

2. Dispatch prompt
   domains/session/sync/runtime-sync.tsx / actions-provider.tsx
   → app/lib/opencode-session.ts  promptAsync()
   → app/lib/opencode.ts          createOpencodeClient()  (@opencode-ai/sdk v2)

3. Cross-process
   ⇒ OpenWork server  /w/:id/opencode/...   (apps/server proxy: opencode-proxy-gate.ts)
   ⇒ OpenCode server  (real engine)

4. Stream back (SSE)
   ⟳ kernel/global-sdk-provider.tsx  event.subscribe → GlobalEventEmitter
   → domains/session/sync/session-sync.ts       (reconcile message/part/todo)
   → kernel/global-sync-provider.tsx             (workspace state cache)
   → domains/session/surface/markdown.tsx        (render parts, Shiki highlight)
   → domains/session/chat/session-page.tsx       (transcript)

5. Tool calls inside the stream
   → domains/session/sync/parse-tool-parts.ts
   → apps/app/src/components/tools/*.tsx          (bash, edit, file, grep, webfetch…)
   → permission requests → domains/session/chat/permission-approval-modal.tsx
```

## Flow C — Server selection & health

Where to look for "can't connect to server" / stale URLs:

```text
kernel/server-provider.tsx  (owns active URL, localStorage list, health poll)
  → app/lib/openwork-server.ts   (normalize URL, hydrate from env)
  → app/lib/opencode.ts          (health client)
  desktop runtime: app/lib/desktop.ts  desktopFetch()   (avoids stale raw daemon URLs)
  default URL logic: providers.tsx resolveDefaultServerUrl()
     desktop → http://127.0.0.1:4096 ; web → <origin>/opencode ; env VITE_OPENWORK_URL/VITE_OPENCODE_URL
```

## Flow D — Desktop policy delivery (cloud ⇒ desktop)

The enterprise control path. Change any link and org policies break:

```text
apps/app  domains/cloud/desktop-config-provider.tsx
  ⇒ GET /v1/me/desktop-config   (Den API)
     ee/apps/den-api/src/routes/me/*  → src/desktop-policies.ts
        calculateDesktopPolicyForOrgMember(orgId, memberId)
          reads ee/packages/den-db  DesktopPolicyTable + DesktopPolicyMemberTable
          resolution order: member override > team > org default
  ⇐ DesktopConfig  (shape defined in packages/types/src/den/desktop-policies.ts)
apps/app enforces via hooks:
  useCheckDesktopRestriction() / useDesktopRestriction(key) / useDesktopConfig()
apps/desktop/electron/main.mjs also normalizes the same config for shell-level gates.
```

## Flow E — Electron IPC command (renderer ⇒ main)

```text
apps/app/src/app/lib/desktop.ts   desktopBridge Proxy
  → window.__OPENWORK_ELECTRON__.invokeDesktop(command, ...args)   (preload.mjs)
  ⇒ ipcRenderer.invoke("openwork:desktop", command, ...args)
apps/desktop/electron/main.mjs   desktopCommandHandlers[command](...)
  contract: packages/types/src/desktop-ipc.ts  DesktopCommandMap
  validation gate: apps/desktop/scripts/check-electron-bridge.mjs
```

## Flow F — Host stack startup (orchestrator spawns sidecars)

```text
`openwork` (apps/orchestrator/src/cli.ts)
  resolveSidecarConfig() → resolveOpencodeDownload()  (version ← constants.json v1.17.11)
  spawnProcess("opencode", ["serve", ...])            → OpenCode engine
  spawnProcess("openwork-server", ...)                → apps/server (default :8787)
  spawnProcess("opencode-router", ...)   [optional]   → apps/opencode-router
  exposes: URLs, health, pairing token, TUI (tui/app.tsx)
Desktop alternative: apps/desktop/electron/runtime.mjs spawns orchestrator, or falls back
to spawning `opencode serve --hostname 127.0.0.1 --port <free>` directly (direct mode).
```

## Flow G — Slack / Telegram message routing

```text
Slack/Telegram peer message
  apps/opencode-router/src/{slack,telegram}.ts   (adapter receives)
  → src/bridge.ts        (normalize, resolve (channel, identityId, peerId) → directory)
      binding store: src/db.ts (BridgeStore SQLite)
      path guard:    src/path-scope.ts
  → src/opencode.ts createClient(directory)  ⇒ OpenCode server (workspace-scoped)
  ⟳ response parts → src/media.ts / delivery.ts → back to channel (chunk to limits)
Health/identity admin: src/health.ts (GET/POST/DELETE /identities/{slack,telegram})
```

## Flow H — Worker provisioning (Den cloud)

```text
ee/apps/den-api/src/routes/workers/core.ts   (user requests a cloud worker)
  → Daytona SDK creates sandbox
  → store DaytonaSandboxTable + WorkerTokenTable (client/host/activity scopes)  [den-db]
  status: "provisioning"
  ⟳ src/workers/reconciler.ts loop → continueCloudProvisioning (shared.ts) → "healthy"
Public access to the sandbox:
  ee/apps/den-worker-proxy/src/app.ts  (signed preview URL, Daytona proxy)
Desktop connects via "Add a worker → Connect remote" (README quick-start).
```

## Flow I — Inference gateway (metered LLM)

```text
apps/app (OpenWork-hosted model selected)
  ⇒ ee/apps/inference/src/server.ts (OpenAI-compatible endpoint, :8791)
     src/keys.ts    validate InferenceKeyTable → resolve org
     src/limits.ts  check + deduct InferenceOrgUsageBucketTable   [den-db]
     src/proxy.ts   ⇒ OpenRouter (upstream), resolve model alias (packages/types den/inference.ts)
  ⇐ streamed response
```

## Flow J — Capability search/execute (roadmap direction)

The architecture OpenWork is converging on — instead of pasting every tool into context:

```text
harness  ⇒ search_capabilities("save a memory")   (meta-MCP)
         ⇒ execute_capability({ name, body })
Den memory example: ee/apps/den-api/src/routes/memory.ts (REST auto-surfaced as capabilities)
Local direction (open PRs #2438/#2472): server/UI/MCP/cloud "shards" behind one search/execute index.
Docs: docs/memory-bank-architecture.md, docs/extensions-manifest-foundation.md.
Verify live before treating as merged.
```

---

## Using flows to debug

1. **Locate the flow** whose symptom matches (streaming → B, connect → C, policy → D, IPC → E).
2. **Walk it top-down**, confirming each hop's file exists and does what the trace says.
3. **The break is usually at a `⇒` boundary** — a contract mismatch (`packages/types`), a URL/port, or an auth/approval gate. Those are the edges most worth a log line.
