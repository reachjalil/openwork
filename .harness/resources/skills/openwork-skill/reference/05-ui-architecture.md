# 05 — UI Architecture

## App Role

`apps/app` is a React 19 + Vite app. It is the UI for every OpenWork deployment: Electron desktop shell loads it, web serves it, and it talks to OpenWork server / OpenCode / Den over HTTP. The architecture doc says the previous Solid runtime was removed and `src/index.react.tsx` is the only entry.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L3-L8`

## Layer Map

```text
apps/app/src/
├── app/                       Framework-agnostic layer; no React imports
│   ├── lib/                   OpenCode, OpenWork server, Den, desktop IPC, analytics, inspector
│   ├── runtime-env.ts         Runtime detection leaf
│   ├── desktop-types.ts       Desktop IPC wire types
│   ├── den-types.ts           Den wire types
│   ├── extensions.ts          Extension manifest contract
│   ├── types.ts               Shared app types
│   └── cloud/, session/, ...  Framework-free helpers
├── i18n/                      Locales and translation helper
└── react-app/
    ├── shell/                 Bootstrap, providers, routes, command palette, menus
    ├── kernel/                App-wide state/provider stack, Zustand, platform
    ├── infra/                 React infra like QueryClient/provider list cache
    ├── design-system/         Reusable presentational primitives
    └── domains/               Feature-scoped product code
        ├── session/
        ├── workspace/
        ├── settings/
        ├── connections/
        ├── cloud/
        └── onboarding/
```

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L10-L40`

## Dependency Rules

The architecture doc states:

1. `src/app/` and `src/i18n/` must not import from `src/react-app/` or `src/components/`.
2. Leaf modules should import nothing or types-only from leaves.
3. Low-level clients import leaf modules, not broad utility barrels that can drag in i18n.
4. `kernel/` and `infra/` sit below `domains/` and must not import domain code.
5. `shell/` sits on top and may import everything.
6. Shared wire contracts live in `packages/types`.
7. `madge --circular` is expected to report zero cycles.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L42-L56`

## Provider/Data Flow

```text
src/index.react.tsx
  └─ QueryClientProvider + PlatformProvider
     └─ react-app/shell/providers.tsx
        ServerProvider
        └─ GlobalSDKProvider
           └─ GlobalSyncProvider
              └─ LocalProvider
                 └─ react-app/shell/app-root.tsx
                    ├─ shell/session-route.tsx
                    ├─ shell/settings-route.tsx
                    └─ domains/{workspace, cloud, onboarding}
```

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L60-L74`

## State Ownership

- `react-app/kernel/store.ts`: app-wide Zustand store.
- `react-app/kernel/selectors.ts`: domain selectors.
- `react-app/infra/query-client.ts`: TanStack Query singleton.
- `react-app/infra/provider-list-query.ts`: shared provider-list cache.
- Feature state tightly coupled to one domain should live inside that domain.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L76-L84`

## Routing Rules

The app is intentionally moving to workspace-scoped route state:

- Active workspace from URL `workspaceId` param.
- Active session from URL `sessionId` param.
- Legacy activeWorkspace/sessionByWorkspace values are fallback memory only.
- Missing resources should show not-found, not silently fall back.
- Workspace-scoped actions should use URL-derived context or explicit IDs.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L86-L128`

## Important UI Stack Details

| Area | Stack |
|---|---|
| Design primitives | `@/components`, shadcn/ui, Base UI, Radix colors, Tailwind 4 |
| State/query | Zustand, TanStack Query |
| Composer/editing | Lexical, CodeMirror |
| Markdown/code | marked, react-markdown, Shiki, DOMPurify |
| Notifications | Sonner `<Toaster />` mounted once |
| Terminal | xterm |
| Virtualization | TanStack Virtual |
| Motion | motion |

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/apps/app/package.json#L41-L104`
- `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L83-L92`
- `https://github.com/different-ai/openwork/blob/dev/apps/app/src/react-app/ARCHITECTURE.md#L57-L58`

## UI Issues Showing Current Pain

Open issues and PRs show the UI layer is actively being polished:

- Code block copy button request and PR.
- Dark-mode code block Shiki theme bugs and PRs.
- Missing Tailwind color classes due Radix palette override.
- Native scrollbar styling.
- Theme preview inheritance.
- Spellcheck toggle for multilingual Windows users.
- RTL/language preference gaps.

These are strong first-contributor areas because they are visible, scoped, and testable.

See: `reference/10-issues-risk-register.md`.

## UI Contribution Pattern

For a frontend issue:

1. Locate the domain or design-system path.
2. Confirm whether it is workspace-scoped.
3. Use existing components/primitives first.
4. Avoid introducing new global state unless domain state is not enough.
5. Add a unit/script/e2e/eval as appropriate.
6. Capture screenshot/video/fraimz proof for visible behavior.
7. Keep the diff small and explain the user-facing before/after.
