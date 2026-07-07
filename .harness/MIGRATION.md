# Harness Migration Ledger

Skill guide version: `2026-06-05.profile-isolation-packs`.

## Sources And Targets

| Live path | Classification | Harness source | Generated output | Tracking decision |
| --- | --- | --- | --- | --- |
| `AGENTS.md` | Durable root instruction file | `.harness/dir/AGENTS.md` | `AGENTS.md` | Generated; untracked and root-ignored after convergence |
| `.agents/skills/harness-config/**` | Durable reviewed skill installed for this migration | `.harness/resources/skills/harness-config/**` | `.agents/skills/harness-config/**` and `.claude/skills/harness-config/**` | Generated target output; root-ignored after convergence |
| `tmp/openwork-skill/**` | Durable reviewed OpenWork skill | `.harness/resources/skills/openwork-skill/**` | `.agents/skills/openwork-skill/**` and `.claude/skills/openwork-skill/**` | Active generated target output; root-ignored after convergence |
| `tmp/kiro-openwork-strategy-skill/**` | Local Kiro strategy skill catalog | `.harness/resources/skills/kiro-openwork-strategy-skill/**` | `.agents/skills/kiro-openwork-strategy-skill/**` and `.claude/skills/kiro-openwork-strategy-skill/**` | Git-ignored source (kept local/private); **Harness-ACTIVE** as of 2026-07-06 via `!` force-project in `.harness/resources/.harnessIgnore`. Outputs are git-ignored, so activation adds no tracked files. Promote to tracked by removing `.gitignore` line 62 + the force-project block. |
| `.agents/` | Codex target surface | `.harness/resources/**` | `.agents/**` | Generated target output; root-ignored after convergence |
| `.claude/` | Claude target surface | `.harness/resources/**` | `.claude/**` | Generated target output; root-ignored after convergence |
| `skills-lock.json` | Installed-skill provenance | Kept at repo root | None | Tracked source metadata |
| `.opencode/**` | OpenWork/OpenCode app configuration | Not migrated | None | Preserved as application source outside requested `.agents` and `.claude` targets |
| `.harness/resources/README.md` | Source-root documentation | Source-only via `.harnessIgnore` | None | Tracked Harness source documentation |

## Mutable Seeds

No existing `.claude/settings.json`, `.agents` settings, secrets, or runtime
trust files were present before migration, so no `.harnessMutable` seeds were
created.

## Cleanup Policy

Activation preserves unmanaged files by default. This migration does not use
`--remove-unmanaged` or `--remove-orphans`; any future cleanup should be previewed
with Harness first and checked against this ledger.
