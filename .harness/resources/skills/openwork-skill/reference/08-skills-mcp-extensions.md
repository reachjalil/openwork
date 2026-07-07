# 08 — Skills, MCP, Plugins, Extensions, and Capabilities

## Skills Manager Today

The README says OpenWork includes a Skills manager that can:

- list installed `.opencode/skills` folders,
- import a local skill folder into `.opencode/skills/<skill-name>`.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/README.md#L59-L72`

## OpenCode Plugins

OpenCode plugins are described as the native way to extend OpenCode. OpenWork manages them from the Skills tab by reading/writing `opencode.json`.

Scopes:

- Project: `<workspace>/opencode.json`
- Global: `~/.config/opencode/opencode.json` or `$XDG_CONFIG_HOME/opencode/opencode.json`

Source anchor: `https://github.com/different-ai/openwork/blob/dev/README.md#L168-L183`

## Extension Manifest Direction

The extension-manifest doc says OpenWork should expose `extension` as the user-facing abstraction. Claude/Anthropic plugins are an initial source format adapted into OpenWork extensions, not a separate product concept.

An extension is a manifest-backed installed capability with:

- `source`: built-in, Den Claude plugin import, OpenWork manifest, MCP directory, manual local install, etc.
- `resources`: skills, MCP servers, OpenCode plugins, providers, secrets, native binaries, hooks, commands, context files.
- `setup`: instructions, env vars, CTA, test actions.
- `contributions`: allowlisted UI/runtime refs such as settings panels, composer prompts, session side panels, rail items, server routes, control actions, native capabilities, tests.
- `lifecycle`: reload/detection hints for OpenCode config, plugins, skills, MCP, agents, commands.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/docs/extensions-manifest-foundation.md#L3-L22`

## Semantic UI Control via MCP

OpenWork exposes its UI as an MCP server so MCP clients can read screen state and execute actions by name rather than using DOM scraping, coordinates, or accessibility hacks.

The documented MCP tools are:

- `ui_status`
- `ui_snapshot`
- `ui_list_actions`
- `ui_execute_action`

Common actions include sessions, composer text/send/stop, navigation, command palette, model picker, transcript reading, and status/docs opening.

Under the hood:

1. OpenWork desktop starts a private localhost HTTP bridge on a random port, protected by a bearer token.
2. It writes a discovery file with port and token.
3. `openwork-ui-mcp` reads the discovery file and proxies MCP calls to the bridge.
4. The bridge calls `window.__openworkControl` in the Electron renderer.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/docs/mcp-ui-control-profile.md#L3-L38`
- `https://github.com/different-ai/openwork/blob/dev/docs/mcp-ui-control-profile.md#L135-L230`
- `https://github.com/different-ai/openwork/blob/dev/docs/mcp-ui-control-profile.md#L231-L253`

## Capability Search/Execute Pattern

The memory-bank architecture doc shows Den’s meta-MCP approach:

```text
harness ── search_capabilities("save a memory")
        └─ execute_capability({ name: "postMemory", body: ... })
```

The durable contract is not a bespoke `memory_save` tool. The agent searches for a capability and then executes the discovered capability.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L38-L76`

Open PR signals show this pattern is becoming a central architecture theme:

- A PR describes a federated index of capability cards exposed as search/execute, with server, UI, MCP, and cloud shards.
- Another PR describes local search/execute routed connections and plugin skills so connections and plugin content stop being pasted into the harness.

These PRs must be checked live before being treated as merged architecture, but they are strong trajectory signals.

Source index: see `reference/14-source-index.md` PR entries `#2438` and `#2472`.

## Why This Direction Matters

Without a search/execute capability layer, the system can become brittle:

- every MCP tool/plugin/skill must be pasted into the model context,
- runtime config hot-add behavior becomes fragile,
- UI actions, cloud actions, local server actions, and MCP actions have different invocation models,
- permissions and diagnostics get scattered.

With a capability index, OpenWork can teach the agent what is available, keep the harness small, and centralize policy, routing, diagnostics, and execution.

## Known Skill/Extension Pain Points

Open issue signals include:

- Cloud skill installation mangling `SKILL.md` YAML frontmatter.
- Slash commands not fully available from OpenWork’s input window compared with raw OpenCode.
- Config schema mismatch causing OpenCode unavailable errors.
- Plugin/connection content migration toward capability-router architecture.

See `reference/10-issues-risk-register.md`.

## Contributor Opportunities

| Area | Useful work |
|---|---|
| Skill materialization | Reproduce and fix frontmatter/name/description corruption from cloud marketplace install. |
| Extension manifests | Add docs/tests around manifest resource/setup/contribution/lifecycle shape. |
| Capability search/execute | Add regression tests for capability discovery, permissions, unavailable diagnostics, timeouts, and workspace resolution. |
| UI MCP actions | Make `ui_snapshot`/actions more complete, stable, and accessible. |
| Plugin/OpenCode compatibility | Smooth migration from raw config injection to search-routed capabilities. |
| Proof flows | Add fraimz flows for extension setup/test actions and capability execution. |

## Interview Framing

> “I’m especially interested in the capability-router direction because it looks like the unifying layer between skills, MCP, plugins, UI actions, and cloud capabilities. I’d want to help make it observable, permission-safe, and easy to test rather than just adding more tools to the model context.”
