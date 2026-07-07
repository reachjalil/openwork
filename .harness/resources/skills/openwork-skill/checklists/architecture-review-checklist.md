# Checklist — Architecture Review

Use this before proposing a non-trivial OpenWork change.

## Scope

- [ ] Is this local desktop, local server, orchestrator, router, Den cloud, or shared package work?
- [ ] Does the change cross process boundaries?
- [ ] Does it need a shared type in `packages/types`?
- [ ] Does it affect workspace/session identity or route state?
- [ ] Does it affect approvals, tokens, permissions, policies, or local bridge auth?

## Server-Consumption First

- [ ] Am I consuming an existing server API instead of inventing client-only behavior?
- [ ] If no API exists, should one exist?
- [ ] Does this work for both local/self-hosted and hosted/remote modes?
- [ ] Does it preserve OpenCode ejectability?

## Capability/MCP/Extension Work

- [ ] Is the action discoverable through a capability/search surface?
- [ ] Are arguments schemaed and validated?
- [ ] Are unavailable states and timeouts reported clearly?
- [ ] Are viewer/collaborator/owner scopes enforced?
- [ ] Is the workspace resolved unambiguously?
- [ ] Are caches invalidated or bounded?

## Desktop/Bridge Work

- [ ] Is the localhost bridge protected by token/discovery controls?
- [ ] Does the behavior work across macOS/Windows/Linux where expected?
- [ ] Are native dependencies packaged for target architectures?
- [ ] Does Electron main/renderer boundary remain clear?

## Cloud/Enterprise Work

- [ ] Does gating block only writes/management where intended?
- [ ] Do reads, deletes, sign-in, and policy delivery continue for downgraded/grandfathered orgs?
- [ ] Are self-hosted/default-off assumptions preserved?
- [ ] Are admin/member/owner roles tested?

## Proof

- [ ] Unit tests for pure logic.
- [ ] Script/e2e tests for runtime behavior.
- [ ] Fraimz/video/screenshot for user-visible experience.
- [ ] PR states exact commands and outcomes.
