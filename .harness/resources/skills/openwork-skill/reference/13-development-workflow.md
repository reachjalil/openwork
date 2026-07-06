# 13 — Development Workflow and Quality Bar

## Maintainer Expectations

AGENTS.md is explicit: if you open a PR, run tests and report exact commands and results. For end-to-end/user-visible flows, include video if possible, screenshots if not. If you cannot run tests or capture proof, state that and give exact reviewer reproduction steps.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L26-L35`

## Fraimz / Proof Culture

The repo uses “fraimz” for frame-by-frame proof of user-visible experiences. A frame binds:

- claim,
- user action,
- observable assertion,
- validated screenshot.

The expected deliverable is `evals/results/<run-id>/fraimz.html`. Report `Passed` only when this exists and every claim is backed by an observable assertion. Pure docs/types-only changes may skip, but say so explicitly.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L37-L61`

## Demo-Driven Development

AGENTS.md describes a paved path:

1. `/voiceover <feature>` — align on demo script before code.
2. Build on a fresh worktree/branch, not the user’s checkout.
3. Prove with fraimz until every frame holds.
4. Open PR against `dev` and post proof with `pnpm fraimz --flow <id> --pr`.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L63-L70`

## Coding Guidelines

- Use TypeScript carefully; avoid `any`, typecasts, and `as` unless truly necessary.
- Use pnpm, never npm/yarn for repo development.
- Use existing `@/components` when possible.
- Prefer shadcn/ui with Base UI for new components.
- Assume most end users are nontechnical.
- Prefer Tailwind, TypeScript, React, shadcn/Base UI, TanStack Query, Zustand, Zod, Drizzle, Better-Auth.
- Keep solutions concise and diffs small.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/AGENTS.md#L72-L102`

## Common Commands

Root scripts include:

```bash
pnpm dev              # desktop dev via @openwork/desktop
pnpm dev:ui           # UI only
pnpm dev:den          # local Den stack helper
pnpm build
pnpm build:ui
pnpm build:web
pnpm typecheck
pnpm test:e2e
pnpm evals
pnpm fraimz           # via eval runner alias in root scripts
```

App package scripts include:

```bash
pnpm --filter @openwork/app typecheck
pnpm --filter @openwork/app test:e2e
pnpm --filter @openwork/app test:health
pnpm --filter @openwork/app test:sessions
pnpm --filter @openwork/app test:events
pnpm --filter @openwork/app test:todos
pnpm --filter @openwork/app test:permissions
pnpm --filter @openwork/app test:fs-engine
```

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/package.json#L7-L61`
- `https://github.com/different-ai/openwork/blob/dev/apps/app/package.json#L8-L39`

## Setup Caution

The README build section lists Node, pnpm, Rust/Tauri, OpenCode, Bun, Xcode CLT, and Linux WebKitGTK. However, `apps/desktop` is Electron. Confirm current maintainer expectations before spending time on Rust/Tauri setup. This is a good docs cleanup opportunity if stale.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/README.md#L81-L136`
- `https://github.com/different-ai/openwork/blob/dev/apps/desktop/package.json#L3-L46`

## PR Template Expectations

README contribution guidance says to:

- review AGENTS, VISION, PRINCIPLES, PRODUCT, ARCHITECTURE docs when present,
- ensure Node, pnpm, Rust toolchain, OpenCode are installed before working,
- run `pnpm install`, verify with `pnpm typecheck` plus `pnpm test:e2e` or targeted scripts,
- use the PR template,
- include exact commands, outcomes, manual verification steps, and evidence,
- classify CI failures as code regression vs external/environment/auth blocker.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/README.md#L217-L222`

## Suggested First-PR Workflow

```text
1. Pick issue with clear reproduction.
2. Pull latest dev.
3. Run baseline command that touches the target area.
4. Reproduce bug and save evidence.
5. Make the smallest fix.
6. Add targeted test or script proof.
7. Run typecheck/test/e2e slice.
8. Capture screenshot/video/fraimz for visible flow.
9. Write PR with:
   - summary,
   - issue link,
   - before/after,
   - commands run and results,
   - proof artifact,
   - risks/limitations.
```

## Definition of a Good Contribution

A strong OpenWork contribution:

- solves a real user-visible or architecture-aligned problem,
- preserves local-first/ejectable/server-consumption principles,
- touches the smallest number of files necessary,
- uses shared types/contracts when crossing process boundaries,
- includes tests and/or proof appropriate to the change,
- makes failure modes clearer,
- does not expand context/tool injection when a capability surface belongs instead,
- documents user impact and verification honestly.
