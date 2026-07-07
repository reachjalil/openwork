# Checklist — First Contribution

## Before Coding

- [ ] Pull latest `dev` and check current issue/PR status.
- [ ] Confirm the issue is still reproducible.
- [ ] Identify the smallest source area to inspect.
- [ ] Read relevant architecture docs from `openwork-skill`.
- [ ] Decide whether the change is UI-visible, API-visible, packaging-visible, or docs-only.
- [ ] If UI-visible, decide what screenshot/video/fraimz proof will show.

## During Implementation

- [ ] Use pnpm.
- [ ] Keep the diff small.
- [ ] Prefer existing components and patterns.
- [ ] Avoid `any`, unnecessary `as`, and typecasts.
- [ ] Preserve workspace-scoped routing rules.
- [ ] Use shared types in `packages/types` when crossing process boundaries.
- [ ] Do not duplicate server behavior in the client if a server surface exists.
- [ ] Add a regression test or scripted proof when possible.

## Before PR

- [ ] Run relevant typecheck/test command.
- [ ] Run e2e/eval/fraimz if the user-visible flow needs it.
- [ ] Capture screenshot/video or `fraimz.html`.
- [ ] Write exact commands and outcomes.
- [ ] Link the issue.
- [ ] Explain before/after.
- [ ] State limitations honestly.
- [ ] Classify any failing CI as code-related or environment/auth/external.

## PR Body Skeleton

```md
## Summary
- ...

## Why
- Fixes #...
- User impact: ...

## What changed
- ...

## Verification
- [x] `pnpm ...` — passed
- [x] Manual: ...
- [x] Proof: screenshot/video/fraimz link

## Risks / notes
- ...
```
