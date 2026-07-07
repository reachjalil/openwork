# 06 — Context Providers: `#everything` in the Composer

## What Kiro does

Typed context references in chat: `#File`, `#Folder`, `#Problems` (IDE diagnostics), `#Terminal` (recent output), `#Git Diff` (working-tree changes), `#Codebase` (indexed search), `#URL`, `#Docs`, `#Steering`, `#Spec`, plus image paste. The agent gets precisely the context the user pointed at — no copy-paste, no "please look at the file I mentioned".

## What OpenWork already has

The composer is further along than most realize ([editor.tsx](../../apps/app/src/react-app/domains/session/surface/composer/editor.tsx)):

| Exists today | Detail |
|---|---|
| Mention system | `ComposerMentionNode` with `ComposerMentionKind = "agent" | "file" | "app"` ([mention-encoding.ts](../../apps/app/src/react-app/domains/session/surface/composer/mention-encoding.ts)); percent-encoding handled |
| Skill references | `ComposerSkillNode` |
| Slash commands | `ComposerSlashCommandNode` + [slash-command.ts](../../apps/app/src/react-app/domains/session/surface/composer/slash-command.ts) |
| Image paste + attachments | paste handler with canvas compression (target 1.5 MB), attachments to 8 MB, drag-drop of `file://`/`https://` URI lists ([composer.tsx](../../apps/app/src/react-app/domains/session/surface/composer/composer.tsx)) |
| Big-paste chips | `ComposerPastedTextNode` (>3 lines / >200 chars) |
| App mentions (beyond Kiro already) | macOS app targeting via Computer Use ([app-mentions.ts](../../apps/app/src/react-app/domains/session/surface/composer/app-mentions.ts)) |

And the engine has resolution endpoints for nearly every provider (SDK 1.17.11): `/find` (text), `/find/file`, `/find/symbol`, `/file/content`, `/file/status` (git), `/lsp` + `lsp.client.diagnostics` events, `/pty` buffers, `GET /session/{id}/diff`.

## The gap

Mentions stop at agent/file/app. There is no `#problems`, `#terminal`, `#git-diff`, `#codebase`, `#url`, `#folder`, and no `#spec`/`#steering` (which [01](./01-spec-driven-development.md)/[03](./03-steering-and-project-context.md) introduce). Each is a *resolver* over an endpoint that already exists — the missing piece is a uniform pattern.

## Proposal

### 1. One resolver contract, many providers

Server-side (server-consumption-first — the orchestrator TUI and router get providers for free):

```
GET  /workspace/:id/context/providers                 # registry: kinds + availability
POST /workspace/:id/context/resolve                   # {kind, value, budget} → ContextBundle
```

`ContextBundle` (in `packages/types/src/context.ts`): title, provenance, token estimate, and message parts (file parts / text parts) ready to append to a session prompt. Providers declare availability (e.g. `#problems` requires LSP active) so the composer menu never shows dead options.

| Kind | Resolution | Notes |
|---|---|---|
| `#file` / `#folder` | `/file/content`, `/find/file`; folder = tree + capped file set with "N files summarized" honesty line | file exists; folder is new |
| `#problems` | Cached `lsp.client.diagnostics` (the global SDK provider already coalesces LSP events — [global-sdk-provider.tsx](../../apps/app/src/react-app/kernel/global-sdk-provider.tsx)) | severity-filtered, grouped by file |
| `#terminal` | Tail of active `/pty` buffer (last N lines, ANSI-stripped) | the app already embeds xterm |
| `#git-diff` | `/file/status` + working-tree diff; distinct from session diff | pairs with [05](./05-checkpoints-and-session-diff.md) |
| `#codebase` | `/find` + `/find/symbol` behind a query; MVP = ranked matches bundle; later = one-shot subagent search summary | avoids building an indexer — OpenCode already has one |
| `#url` | Server-side fetch → readability extraction → markdown, size-capped, http(s) only, private-range blocked | see security below |
| `#doc` | Files under `docs/` (and configured doc roots) | cheap sugar over `#file` |
| `#spec` / `#steering` | Specs ([01](./01-spec-driven-development.md)) and steering docs ([03](./03-steering-and-project-context.md)) | closes the loop with the workflow layer |
| `#image` | exists (paste/attach) | already done |

### 2. Composer UX

- Typing `#` opens one typeahead across all kinds (Lexical typeahead like existing mention flows); selected chips render with kind-colored pills (slash-command precedent: violet pill).
- Each chip shows a token-cost badge on hover (from `resolve` estimate) — combined with the context inspector ([03](./03-steering-and-project-context.md)), users finally *see* context cost. Kiro shows nothing here.
- Resolution happens at send: chips → `context/resolve` → parts appended to the prompt payload; oversized bundles degrade with an inline warning ("truncated to 8k tokens — open full file instead?").

### 3. Multi-surface (beat Kiro)

- **Router**: `#problems`, `#git-diff`, `#file:path` work in Slack/Telegram messages — the router already proxies to the same server; a PM in Slack can say "summarize `#git-diff`" mid-incident.
- **Orchestrator TUI**: same tokens in the prompt line.
- **UI MCP**: `ui_execute_action("composer.attachContext", {kind, value})` so other agents can compose rich prompts (the semantic-UI-control direction in `docs/mcp-ui-control-profile.md`).

### 4. Security notes

- `#url` fetches happen server-side with: scheme allowlist, private-IP/link-local block, redirect cap, size cap, content-type allowlist, and provenance labeling in the transcript ("fetched from example.com"). Fetched content is untrusted data — render inert, never treat as instructions (prompt-injection hygiene in the bundle framing).
- `#terminal` may contain secrets — mask common token patterns before bundling; show the exact bundled text in an expandable chip preview so nothing leaves invisibly (the transparency rule: users can always see what got sent).

## Phasing

| Phase | Scope | Size |
|---|---|---|
| MVP | Provider registry + resolve API; `#folder`, `#git-diff`, `#problems` (three most-asked), unified `#` typeahead | M |
| v1 | `#terminal`, `#codebase` (ranked matches), `#url` with the security envelope, token badges | M |
| v1.1 | `#spec`/`#steering`/`#doc`, chip preview-before-send, router token support | S–M |
| Later | `#codebase` agentic summaries, UI-MCP attach action, provider SPI for extensions (extensions contribute providers via manifest `contributions`) | M |

## Verification (fraimz)

Flow `context-providers`: introduce a type error → composer `#problems` chip → send "explain" → answer cites the real diagnostic → `#git-diff` after an edit → agent references the exact hunk → `#url` to a fixture page → content summarized, private-IP URL refused with visible reason → chip hover shows token badge; assert resolve payloads via server logs/eval hooks.

## Open questions

1. Prefix choice: Kiro uses `#`, OpenWork mentions use `@` for agent/file/app today. Recommended: keep `@` for *actors* (agents, apps), `#` for *context* — migrate file mentions to `#file` with an alias grace period.
2. Auto-context: should `#problems` auto-attach when the user says "fix the errors"? Recommended: suggest-not-insert (ghost chip the user taps to confirm) — transparency over magic.
3. Budget defaults per provider — start conservative (2k–8k tokens) and expose in advanced settings.
