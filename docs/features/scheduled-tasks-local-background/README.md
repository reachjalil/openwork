# Scheduled Tasks: local background delivery

## Outcome

A reviewed Scheduled Task can run on the user's Mac after the OpenWork process has exited. The wake reuses the desktop app's embedded OpenWork server, OpenCode runtime, configuration, credentials, and SQLite ledger; it does not create a second task system.

The user value is deliberately narrow: **“My reviewed task runs on this Mac while the window is closed.”**

## Delivery shape

- The Scheduled Tasks service can drain executions that it has already claimed. A background tick or explicit run-once waits for the run to reach a terminal ledger state before shutdown can cancel the runtime.
- Electron accepts `--background-scheduled-tasks`. A fresh invocation boots the same selected local workspace without creating a browser window, drains the due work, reconciles the next wake, and exits.
- When an Electron instance already owns the profile, the second-instance wake is forwarded into that runtime and returns before the ordinary show/focus path.
- The macOS wake adapter maintains one per-user launchd job for the earliest enabled `nextDueAt`. Its plist contains only the OpenWork executable and opaque profile `local-default`; task names, prompts, workspace paths, models, grants, and credentials stay in OpenWork's ledger/configuration.
- Repeated launchd reconciliation is serialized. Duplicate wake delivery is safe because the SQLite occurrence claim is atomic and idempotent.

## Proof

Approved narration: `evals/voiceovers/scheduled-tasks-local-background.md`.

Focused automated evidence:

- `scheduled-task-architecture.test.ts` runs and drains a reviewed task, closes the module, reopens the same runtime SQLite ledger, and reads the same completed receipt and linked session.
- `scheduled-task-service.test.ts` races two `os-wake` ticks and proves there is one claimed occurrence, one execution, and one completed durable run.
- `scheduled-tasks-background.test.mjs` proves the opaque tick argv and bounded developer run-once parsing.
- `scheduled-tasks-launchd.test.mjs` proves earliest-minute rounding, serialized duplicate reconciliation, policy-free plist content, and immediate kickstart for an already-due wake using a fake launchctl boundary.

No live LaunchAgent was installed while producing this candidate. That is intentional: tests inject the filesystem root and launchctl runner, so they cannot alter the developer machine's launchd state.

## Security and authority boundary

The OS adapter decides only *when to wake OpenWork*. It cannot choose a task, prompt, model, workspace, permission, or credential. The existing Scheduled Tasks ledger remains the source of truth and revalidates the exact active revision and grant at execution time. An explicit run-once accepts task/workspace identifiers only as a developer/proof entry and is never written to the launchd plist.

## Base, gaps, and next action

- Frozen base: `7352171ea50e1bf81a16bbf8311d095b085d1a62` (`refactor(scheduled-tasks): extract portable runtime core`).
- Packaging wakes the signed OpenWork app bundle through macOS's system `open` tool; there is no additional helper binary or signing identity to distribute.
- The remaining release-only proof is to package/sign/notarize the macOS app in CI, install that artifact normally, enable a near-future reviewed task, quit OpenWork, sleep/wake across the due minute, and capture the completed receipt in the existing Scheduled Tasks demo. This workstation has no Developer ID identity, so it cannot prove the Gatekeeper/notarization portion locally.
- A visible background-wake status/control is intentionally outside this smallest vertical slice. Failure remains represented by the existing run receipt/needs-attention behavior.
