# 23 — Cloud / Enterprise Code Graph (`ee/`)

> The Den cloud SaaS: Hono microservices + Next.js dashboards + Drizzle/MySQL, source-
> available and gated to preserve the ejectable promise. Verified at HEAD `49d3f9ec`.
> Change recipes: `17-change-recipes.md` §E. Flows: `18-data-flows.md` D, H, I.
> **`ee/apps/den-controller` is DEPRECATED** (folded into `den-api`) — don't add code there.

## `ee/apps/den-api` — control plane (Hono + Better-Auth, :8790)

**Entry:** `src/server.ts` → `src/app.ts` (Hono app: RequestID, CORS, sessions).

| Area | Files |
|---|---|
| Auth / session | `session.ts` (Better-Auth middleware), `auth-protection.ts`, `sso.ts`, `sso-saml-*.ts` |
| Desktop policies | `desktop-policies.ts` (`calculateDesktopPolicyForOrgMember`: member > team > org) |
| Entitlements / limits | `entitlements.ts`, `organization-limits.ts`, `organization-capabilities.ts` |
| Workers | `workers/{core,provisioner,reconciler,shared,activity,billing,runtime}.ts` (Daytona) |
| MCP catalog | `mcp/index.ts` (`search_capabilities` over API operations) |
| Routes | `routes/{me,org,workers,admin,bootstrap,memory,webhooks,telemetry,mcp,auth}/…` |
| `routes/org/` | `core, billing (Stripe), desktop-policies, api-keys, inference, sso, scim, mcp-connections, llm-providers, oauth-providers, google-workspace, plugin-system/, skills, teams, roles` |

Key endpoints: `GET /v1/me/desktop-config` (policy delivery → desktop), `routes/memory.ts` (memory bank REST), `routes/bootstrap/*` (org install links).

## `ee/apps/den-web` — dashboard (Next.js 16 App Router, :3005)

**Tree:** `app/(den)/dashboard/_components/*` (home, desktop-policy editor, billing, members, analytics, sso/scim, integrations, plugins), `app/admin` (`DenAdminPanel`), `app/api/den/[...path]` (**upstream proxy** → den-api via `app/(den)/_lib/upstream-proxy.ts`), `app/sso/[orgSlug]`, `app/mcp/*`, `app/(den)/{install,join-org,workspace-claim,reset-password}`.

## `ee/apps/inference` — LLM gateway (Hono, :8791)

`src/{server,app,proxy,keys,limits,model-catalog,voice,webhooks}.ts`. Validate `InferenceKeyTable` → resolve org → check/deduct `InferenceOrgUsageBucketTable` → proxy to OpenRouter (alias from `packages/types/src/den/inference.ts`).

## `ee/apps/den-worker-proxy` — Daytona proxy (Hono, :8789)

`src/{server,app}.ts` — signed preview URLs to Daytona sandboxes; uses `DaytonaSandboxTable` + `WorkerTokenTable`. Env: `DAYTONA_API_KEY/URL/TARGET`.

## `ee/apps/landing` — marketing (Next.js 14)

`app/{page,download,enterprise,privacy,terms,trust,feedback}`. Uses `@openwork/ui` + `@openwork/email`.

## `ee/apps/den-worker-runtime` — build-time container root

Not a service. Installs `openwork-orchestrator`, pins OpenCode, packages `./bin/opencode` for Render/Daytona images (`Dockerfile.daytona-snapshot`).

## `ee/packages/den-db` — schema + client (Drizzle, MySQL/PlanetScale)

| File | Contents |
|---|---|
| `src/client.ts` | `createDenDb({databaseUrl, mode})` — mysql2 or PlanetScale; retry logic. |
| `src/columns.ts` | `encryptedColumn`/`encryptedTextColumn` — AES-256-GCM (`enc:v1:iv.tag.cipher`), key `DEN_DB_ENCRYPTION_KEY`. |
| `src/schema/auth.ts` | Better-Auth tables (users, accounts, sessions). |
| `src/schema/org.ts` | `OrganizationTable` (metadata JSON: limits/plan/capabilities/brand), `MemberTable`, `InvitationTable`, `WorkspaceBootstrapTable`. |
| `src/schema/desktop-policies.ts` | `DesktopPolicyTable`, `DesktopPolicyMemberTable`. |
| `src/schema/{teams,subscriptions,workers,inference,system,telemetry}.ts` | teams; Stripe subs; worker/Daytona/token tables; inference keys/limits/usage; system; telemetry. |
| `src/schema/sharables/` | shared plugin-arch, LLM providers, skills, capabilities. |
| `drizzle/` | numbered SQL migrations (`0001…0016+`). |

DB scripts: `db:generate` (diff), `db:push`, `db:migrate` (+ FULLTEXT bootstrap), `db:bootstrap`. CI: `den-db-check.yml`, `den-db-migrate.yml`.

## `ee/packages/den-admin-mcp` — read-only admin MCP

`index.mjs` — SELECT-only tools: `den_overview`, `den_growth`, `den_retention`, `den_users_search`, `den_org_overview`, `den_query`. Env `DATABASE_URL` (read-only user recommended), `DEN_ADMIN_MCP_ROW_LIMIT`.

## `ee/packages/utils`

`typeid` (TypeIDs for org/user/worker/…), `skill-markdown`.

## Enterprise boundary (why it matters)

Gating = **"gate management, never delivery or removal"**: write/edit endpoints return 402 when un-entitled, but reads, sign-in, policy delivery, and deletes keep working. Kill-switch `DEN_PLAN_GATING_ENABLED` defaults off; self-hosted installs stay opt-in. Preserve this when touching `ee/` — it's the open-source/ejectable promise in code. See `docs/enterprise-plan-gating.md`, `docs/single-org-mode-plan.md`, and the `aws-eks-helm.md`/`azure-aks-helm.md`/`gcp-gke-helm.md` deploy guides.
