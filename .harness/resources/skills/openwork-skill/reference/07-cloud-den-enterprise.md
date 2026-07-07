# 07 — Cloud, Den, and Enterprise Direction

## What “Den” Appears to Be

The `ee/` directory contains cloud/enterprise code. Its app packages include:

- `den-api` — cloud API surface.
- `den-web` — web dashboard/admin UI.
- `den-controller` — worker/control-plane service.
- `den-worker-proxy` — worker proxy layer.
- `den-worker-runtime` — worker runtime.
- `inference` — inference/proxy service.
- `landing` — marketing/landing site.

Its packages include:

- `den-db` — database schema/migrations.
- `den-admin-mcp` — admin MCP surface.
- `utils` — shared Den utilities.

Source anchors:

- `https://github.com/different-ai/openwork/tree/dev/ee/apps`
- `https://github.com/different-ai/openwork/tree/dev/ee/packages`

## Cloud Worker Story

The README says hosted OpenWork Cloud workers are launched from the web app after checkout, then connected from the desktop app via `Add a worker` → `Connect remote`.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/README.md#L32-L39`

Interpretation: the desktop app is increasingly a **client of local or remote worker/server surfaces**. If you contribute here, think about account provisioning, workspace pairing, remote diagnostics, token security, and “same UX whether local or remote.”

## Desktop Policies

Desktop app policy config is loaded from OpenWork Cloud via `GET /v1/me/desktop-config` and exposed inside the desktop app through `DesktopConfigProvider`. The canonical policy catalog lives in `packages/types/src/den/desktop-policies.ts` as `desktopPolicyDefinitions` so Den API, Den web, and desktop share IDs and copy.

The app should gate behavior through:

1. `useCheckDesktopRestriction()` for most gates.
2. `useDesktopRestriction(key)` for one-off checks.
3. `useDesktopConfig()` for raw config/loading/refresh.
4. `useOrgRestrictions()` only for raw config reads.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/docs/desktop-app-policies.md#L3-L130`

## Enterprise Plan Gating

The enterprise plan-gating doc says the goal is to move SSO/SAML and Desktop Policies into Enterprise without breaking organizations that already use them. It packages enterprise around:

- managed deployment,
- skill development,
- MCP consulting,
- SSO/SAML + SCIM,
- Desktop policies and version controls,
- custom commercial terms and rollout support.

The principle is “gate management, never delivery or removal”: write/edit management is gated, but reads, sign-in, policy delivery, and deletes are not broken. The kill switch `DEN_PLAN_GATING_ENABLED` defaults off, with self-hosted installs staying opt-in so the open-source/ejectable story remains unchanged.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/docs/enterprise-plan-gating.md#L3-L60`
- `https://github.com/different-ai/openwork/blob/dev/docs/enterprise-plan-gating.md#L93-L101`

## Enterprise Rollout Model

The gating plan includes grandfathering orgs with existing SSO/policies, then enabling the flag on hosted Den. New enterprise customers can be assigned plans through admin surfaces until Stripe enterprise products exist.

Source anchor: `https://github.com/different-ai/openwork/blob/dev/docs/enterprise-plan-gating.md#L103-L137`

## Google Workspace Integration

A Google Workspace OAuth verification doc shows a Phase 1 scope set:

- identity/profile/email,
- Calendar read-only,
- Drive file access,
- Gmail compose.

Opt-in scopes for custom OAuth clients include Gmail read, full Drive, Calendar events, and Google Chat scopes. Runtime enforcement returns 403 when scopes are not granted. The current verification blockers include Gmail restricted-scope review and needing the privacy policy source deployed publicly.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/docs/google-workspace-oauth-verification.md#L17-L41`
- `https://github.com/different-ai/openwork/blob/dev/docs/google-workspace-oauth-verification.md#L61-L71`
- `https://github.com/different-ai/openwork/blob/dev/docs/google-workspace-oauth-verification.md#L131-L134`

## Memory Bank Roadmap

The memory-bank architecture doc is a clear roadmap signal. It proposes:

- per-user memory bank,
- user opt-in by chat,
- agent drafts memory and context,
- human verifies before persisting,
- server-side persistence,
- explicit lexical search in v0,
- desktop management panel for view/delete,
- Den API REST routes auto-surfaced through capability search/execute.

It explicitly defers semantic/vector recall, auto-recall, encryption at rest, hard server gate, quotas/rate limits, org-shared bank activation, PATCH/edit, account deletion cleanup, and desktop save modal.

Source anchors:

- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L13-L35`
- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L38-L76`
- `https://github.com/different-ai/openwork/blob/dev/docs/memory-bank-architecture.md#L232-L358`

## Contributor Opportunities in Cloud/Den

| Opportunity | Why high-value |
|---|---|
| Account/workspace provisioning diagnostics | User issue reports include subscribed accounts with zero models/out-of-sync/404 workspace pages. |
| Desktop policy consistency | Policies cross `packages/types`, Den API, Den web, and desktop. Mistakes can create enterprise support load. |
| Enterprise gating tests | Gating writes but not reads/deletes is subtle and needs regression coverage. |
| Google OAuth verification support | Restricted scopes and data-use statements require exact UX/proof. |
| Memory-bank implementation | Docs already outline staged PRs, security risks, and tests. A disciplined contributor can help land slices. |
| Den/open-source boundary docs | FSL/EE boundary plus self-host/off switch story needs clear docs for trust. |

## Interview Framing

> “I noticed the enterprise docs are careful about not breaking existing orgs and keeping self-hosted installs opt-in. That suggests OpenWork cares about the open-source/ejectable story even while building a hosted business. I’d be careful to preserve that boundary when working on policies, cloud workers, or Den APIs.”
