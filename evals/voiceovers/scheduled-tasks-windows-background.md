# Scheduled Tasks — Windows background execution

## Outcome

My reviewed task runs on this Windows PC while the OpenWork window is closed.

## Proof journey

1. In OpenWork on Windows, create a disabled local task that writes one named
   file into the reviewed workspace.
2. Review its exact schedule, workspace, model, runtime, and file authority,
   then enable it.
3. Inspect the per-user Task Scheduler entry. Show `InteractiveToken`,
   least-privilege execution, wake and missed-start settings, the packaged
   OpenWork executable, and only the opaque profile argument.
4. Quit OpenWork completely and wait past the scheduled time.
5. Show that the task starts without opening or focusing an OpenWork window.
6. Reopen OpenWork and show exactly one completed run, its fresh linked
   session, the workspace file, and the durable receipt.
7. Trigger the scheduled entry again and show that the same occurrence is not
   executed twice.

## Environment qualification

Run this journey from a signed packaged Windows build under a standard user.
Record whether Windows woke from sleep or merely ran the missed trigger after
resume; hardware and power policy determine wake support.
