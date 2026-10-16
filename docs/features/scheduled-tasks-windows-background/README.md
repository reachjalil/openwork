# Windows background Scheduled Tasks

## Outcome

My reviewed task runs on this Windows PC while the OpenWork window is closed.

This delivery adds Windows Task Scheduler as a wake adapter for the existing
local Scheduled Tasks runtime. Task Scheduler does not own task definitions,
prompts, grants, credentials, retries, or receipts. It only starts the packaged
OpenWork executable with an opaque profile identifier at the earliest due time.

## Layering

- Parent proposal: `different-ai/openwork#3236` at `a0248a606`
- Portable runtime extraction: `7352171ea`
- Required local-background base: `5186df5c8`
- This branch adds only the Windows wake adapter, its integration, tests, and
  proof instructions.

The base already supplies the hidden Electron entry point, foreground-process
forwarding, the shared SQLite ledger, awaited execution drain, and durable
receipts. Windows reuses those pieces instead of introducing another scheduler
or database.

## Runtime flow

1. The local runtime calculates the earliest due occurrence.
2. The adapter creates or replaces one per-user Task Scheduler entry.
3. Task Scheduler starts `OpenWork.exe --background-scheduled-tasks
   --scheduled-tasks-profile <opaque-profile>`.
4. Electron creates no renderer window. If the profile is already owned, the
   wake is forwarded to the running process.
5. The shared runtime atomically claims due work, revalidates its reviewed
   authority, and executes it in a fresh OpenCode session.
6. The result is stored in the same local SQLite ledger, the next wake is
   reconciled, and the background process exits.

The scheduled task uses `InteractiveToken` and `LeastPrivilege`. It runs as the
current signed-in user and does not request administrator elevation or store a
password. The XML contains the packaged executable path and opaque profile ID,
but no workspace path, prompt, provider, credential, or grant.

Task Scheduler is configured to start missed work when Windows becomes
available, request wake-from-sleep, allow battery execution, ignore duplicate
process starts, and leave runtime limits to the reviewed Scheduled Task grant.
Windows power policy and hardware can still prevent wake-from-sleep, and a
powered-off device cannot execute local tasks.

## Verification

Automated proof:

- XML contract: least-privilege interactive principal, wake and missed-start
  policy, duplicate-process suppression, and policy-free arguments.
- Adapter contract: one replaceable per-profile entry, immediate start when a
  due wake is reconciled, and removal when no wake remains.
- Existing local-background tests: hidden argv, launchd parity, atomic
  occurrence claim, execution drain, and receipt persistence.

Release proof remains required on a signed Windows package:

1. Create, review, and enable a local Scheduled Task.
2. Quit OpenWork and verify the Task Scheduler entry is least privilege and
   contains no private task data.
3. Let Windows start the task without opening a window.
4. Confirm one fresh session and workspace artifact are created.
5. Reopen OpenWork and inspect the durable receipt.
6. Repeat across sleep/wake, a missed trigger, duplicate invocation, app
   update, locked credentials, and an unavailable workspace.

No live Windows Task Scheduler registration is performed by repository tests.
