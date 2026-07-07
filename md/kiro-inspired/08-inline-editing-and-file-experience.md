# 08 — Inline Editing & File Experience: IDE-Grade Affordances Without Becoming an IDE

## Framing (read this first)

Kiro's remaining pillars are editor affordances: inline AI edit (Cmd+I), ghost-text completions, a problems panel, editor-native diffs. OpenWork **should not chase IDE-hood** — its audience includes non-technical users (AGENTS.md) and its wedge is the workflow/control plane, not text editing. But there is a defensible middle: the places where OpenWork users *already touch file content* should feel first-class, and diagnostics should be visible without opening VS Code. This doc scopes exactly that and explicitly rejects the rest.

**Out of scope, deliberately**: ghost-text completions, a file-tree-first editing workbench, LSP-powered editor features (hover/rename/go-to-def). Users who want an IDE have one — meet them with deep links instead.

## What OpenWork already has

| Ingredient | Evidence |
|---|---|
| Artifact panel with real editors | [artifact-panel.tsx](../../apps/app/src/react-app/domains/session/artifacts/artifact-panel.tsx): text (CodeMirror), markdown, HTML, PDF, spreadsheet ([artifact-spreadsheet-editor.tsx](../../apps/app/src/react-app/domains/session/artifacts/artifact-spreadsheet-editor.tsx)); optimistic-concurrency saves (artifacts API, PR #2470 trajectory) |
| File APIs | Server `files/content`, `files/raw`, `files/stat`, file sessions with JIT catalog + batch read/write ([files.ts](../../apps/server/src/routes/files.ts)) |
| Diagnostics stream | Engine `/lsp` + `lsp.client.diagnostics` events (already coalesced app-side) |
| Formatter | Engine `/formatter` endpoint (SDK 1.17.11) |
| Diff rendering | `DiffLines` in [tool.tsx](../../apps/app/src/components/ui/tool.tsx) |
| OS integration | Desktop IPC `__openPath` / `__revealItemInDir` ([desktop-ipc.ts](../../packages/types/src/desktop-ipc.ts)) |
| Terminal | xterm embedded; `/pty` engine surface |

## Proposal

### 1. Inline AI edit in the artifact editor ("Cmd+K where users already are")

- Select text in the artifact text/markdown editor → `⌘K` → instruction popover ("make this friendlier", "convert to a table").
- Runs a **scoped micro-session** server-side: prompt = instruction + selection + file context, agent constrained to that file (execution modes from [04](./04-autopilot-supervised-trust.md) apply; Review mode shows the patch first).
- Result renders as an in-editor diff (reuse `DiffLines` styling) with accept/reject — never silent replacement.
- Works for the spreadsheet editor at range granularity later ("fill this column from that one") — a Kiro-has-nothing surface OpenWork uniquely owns via its sheet editor.

### 2. Problems panel (diagnostics without the IDE)

- New panel tab kind `"problems"` (PanelTab union, same extension point as docs [01](./01-spec-driven-development.md)/[05](./05-checkpoints-and-session-diff.md)): live list from `lsp.client.diagnostics`, grouped by file, severity-filtered.
- Row actions: **Fix with agent** (spawns/attaches a session with the diagnostic + file context — the `#problems` resolver from [06](./06-context-providers.md) reused), **Open file** (artifact editor at line), **Explain**.
- Session-idle summary: "run finished · 2 new problems" chip when diagnostics regress after an agent run — closes the loop autopilot leaves open.

### 3. Format-on-save & save hygiene

- Artifact saves optionally pipe through the engine `/formatter` (per-workspace toggle). Small, but it's the difference between "toy editor" and "safe editor" for code files.
- Conflict UX: optimistic-concurrency failures (file changed on disk mid-edit) get a three-way choice (reload / overwrite / diff) instead of an error toast.

### 4. Meet-the-IDE deep links

- "Open in editor" on file chips, diff rows, problems rows, artifact tabs: `vscode://file/<path>:<line>` (+ Cursor/JetBrains schemes; configurable default) via existing `__openPath` IPC.
- Reverse direction later: a tiny `openwork://` protocol handler so IDE extensions/terminals can jump into a session ("continue this in OpenWork").

### 5. What this sets up

Inline edits, problems, and format-on-save are the last mile that makes **specs** (task diffs reviewed where they land), **hooks** (fix-on-diagnostic automations), and **checkpoints** (per-file reject → tweak in place) feel complete. This doc is deliberately last among the feature docs: it polishes surfaces the others create.

## Phasing

| Phase | Scope | Size |
|---|---|---|
| MVP | Open-in-editor deep links; format-on-save toggle; conflict three-way UX | S |
| v1 | Problems panel + fix-with-agent; session-idle problems chip | M |
| v1.1 | Inline ⌘K edit with diff accept/reject in text/markdown artifacts | M |
| Later | Spreadsheet range edits; `openwork://` handler; hunk-level tooling shared with doc 05 | M |

## Verification (fraimz)

Flow `file-experience`: open a `.ts` artifact with a deliberate type error → problems panel lists it → Fix with agent → diff appears → accept → diagnostic clears from panel → select a paragraph in a markdown artifact → ⌘K "make this a bulleted list" → in-editor diff → accept → save with format-on-save → assert formatted content on disk → Open in editor launches VS Code at the right line (assert via desktop IPC call record in dev log).

## Open questions

1. ⌘K micro-sessions: transcript-visible sessions (auditable, noisier) vs ephemeral (clean, less auditable)? Recommended: real sessions in a collapsed "edits" group — audit wins.
2. Problems panel default-on only when LSP is active for the workspace language; availability via the provider registry ([06](./06-context-providers.md)).
3. Which editor schemes to ship first — VS Code + Cursor cover the bulk; make it a settings enum with custom template.
