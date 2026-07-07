# 15 — Glossary

| Term | Meaning in OpenWork context |
|---|---|
| OpenWork | Local-first/cloud-ready app and control surface for agentic work. |
| OpenCode | Underlying agent engine/server that OpenWork consumes and extends. |
| Host mode | Local runtime mode where OpenWork runs a local host stack and connects UI to it. |
| Client mode | Connect to existing local/remote OpenCode/OpenWork server by URL. |
| Orchestrator | `openwork` CLI host that runs OpenCode, OpenWork server, and optionally opencode-router. |
| OpenWork server | Filesystem-backed API for remote clients, workspace resources, skills/plugins/MCP/file sessions, proxies, approvals. |
| opencode-router | Slack/Telegram bridge and directory router for a running OpenCode server. |
| Den | Enterprise/cloud app family under `ee/`, including API, web dashboard, workers, inference, DB. |
| Desktop policies | Cloud-delivered restrictions/config for the desktop app, loaded through desktop config provider. |
| Capability | A discoverable executable action/tool/resource exposed through search/execute patterns. |
| Meta-MCP | A small capability-discovery MCP pattern with search and execute tools rather than every bespoke tool exposed directly. |
| Extension | Planned/user-facing manifest-backed abstraction over skills, MCP servers, OpenCode plugins, providers, secrets, hooks, commands, UI contributions. |
| Skill | Installable `.opencode/skills/<skill-name>` folder with `SKILL.md` and references/instructions. |
| Plugin | OpenCode-native extension configured in `opencode.json`. |
| MCP | Model Context Protocol; OpenWork both consumes MCP servers and exposes UI control via MCP. |
| Fraimz | Frame-by-frame proof artifact for visible user flows, binding claim/action/assertion/screenshot. |
| Voiceover | Demo/script-first planning step before implementation in the repo workflow. |
| Workspace-scoped route | Route that includes workspace ID so workspace/session identity is explicit. |
| Sidecar | External binary/service resolved and run by orchestrator/desktop, e.g. server/router/opencode. |
| Ejectable | Users can still use OpenCode capabilities outside/underneath OpenWork; no hard lock-in. |
