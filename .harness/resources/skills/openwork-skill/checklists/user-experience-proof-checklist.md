# Checklist — User Experience Proof

For any visible OpenWork change, produce proof that a reviewer can trust.

## Define the Flow

- [ ] What user problem is solved?
- [ ] What exact route/screen is involved?
- [ ] What state starts the flow?
- [ ] What action does the user take?
- [ ] What observable assertion proves success?
- [ ] What failure/empty/offline/permission state matters?

## Evidence Options

- [ ] Fraimz proof (`evals/results/<run-id>/fraimz.html`) when appropriate.
- [ ] Short video for full user flow.
- [ ] Screenshot before/after for small UI change.
- [ ] Terminal output for CLI/server behavior.
- [ ] Log excerpt/debug export for diagnostics change.

## Accessibility/UX Gates

- [ ] Icon buttons have names/labels.
- [ ] Focus behavior is sensible.
- [ ] Destructive actions are confirmable or reversible where appropriate.
- [ ] Toast/status updates are accessible.
- [ ] Dark/light themes are checked.
- [ ] Non-English/RTL impact is considered if text input/rendering changes.

## PR Evidence Text

```md
## Manual verification
1. Started app with `pnpm dev`.
2. Navigated to ...
3. Performed ...
4. Observed ...
5. Captured proof: ...
```
