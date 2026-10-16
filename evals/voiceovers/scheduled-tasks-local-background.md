# Scheduled Tasks — a reviewed task runs while OpenWork is closed

1. I review and enable a Scheduled Task for this Mac, and OpenWork shows that the exact reviewed revision—not a hidden automation policy—is what will run.

2. I close the OpenWork window. At the next due time, macOS wakes one opaque OpenWork profile without copying my prompt, workspace path, model, permissions, or credentials into the system schedule.

3. OpenWork reopens the same local configuration and Scheduled Tasks ledger in the background, claims the due occurrence once, and lets the fresh OpenCode session finish before the hidden process exits.

4. If OpenWork is already running, the same wake is forwarded to that process without showing or focusing the window; duplicate wakes remain harmless because the shared ledger accepts the occurrence only once.

5. When I return to Scheduled Tasks, the completed run, linked session, and receipt are in the same history, and the next earliest wake is reconciled for the remaining enabled tasks.
