import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadVoiceoverParagraphs } from "../runner/voiceover.mjs";

const FLOW_ID = "chat-mcp-reconnect";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MOCK_SERVER_SCRIPT = join(ROOT, "scripts", "mock-oauth-mcp-server.mjs");
const MOCK_PORT = Number(process.env.OPENWORK_EVAL_CHAT_RECONNECT_MOCK_PORT || 3994);
const MOCK_SERVER_URL = `http://127.0.0.1:${MOCK_PORT}`;
const DEN_API_URL = (process.env.OPENWORK_EVAL_DEN_API_URL ?? "").trim().replace(/\/+$/, "");
const DEN_ORIGIN = (process.env.OPENWORK_EVAL_DEN_WEB_URL ?? DEN_API_URL.replace("127.0.0.1", "localhost")).trim().replace(/\/+$/, "");
const DEMO_EMAIL = process.env.OPENWORK_EVAL_DEMO_EMAIL?.trim() || "alex@acme.test";
const DEMO_PASSWORD = process.env.OPENWORK_EVAL_DEMO_PASSWORD?.trim() || "OpenWorkDemo123!";
const CONNECTION_PREFIX = "Research Vault";
const CONNECTION_NAME = `${CONNECTION_PREFIX} ${Date.now()}`;
const WORKSPACE_PATH = "/tmp/openwork-chat-mcp-reconnect";
const ECHO_TEXT = `research vault recovered ${Date.now()}`;
const AUTHORIZATION_TOOL = "request_salesforce_authorization";
const AUTHORIZATION_CONNECT_URL = `${MOCK_SERVER_URL}/connect/salesforce`;
const AUTHORIZATION_SUCCESS_TEXT = "salesforce provider sign-in succeeded";
const UNSAFE_CONNECT_URL = "https://cross-origin.example.test/salesforce/start";
const vo = await loadVoiceoverParagraphs(FLOW_ID);

const state = {
  token: null,
  connectionId: null,
  workspaceId: null,
  reconnectBaselineConnectedAt: null,
  pendingAuthorizeUrl: null,
  signInFailureStartedAt: null,
  signInRetryStartedAt: null,
  mockChild: null,
  mockOutput: "",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, message, timeoutMs = 30_000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await check();
      if (value) return value;
      lastError = null;
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`${message}${lastError ? ` (${lastError.message})` : ""}`);
}

function startMockServer() {
  if (state.mockChild) return;
  const child = spawn(process.execPath, [MOCK_SERVER_SCRIPT], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(MOCK_PORT),
      ISSUER: MOCK_SERVER_URL,
      AUTO_APPROVE: "0",
      STRICT_REFRESH_TOKENS: "1",
      MOCK_ERROR_TOOL_NAME: AUTHORIZATION_TOOL,
      MOCK_ERROR_TOOL_TITLE: "Salesforce Authorization Check",
      MOCK_ERROR_TOOL_DESCRIPTION: "Requires provider sign-in until the deterministic eval admin hook marks it complete.",
      MOCK_ERROR_TOOL_MODE: "authorization_required",
      MOCK_ERROR_TOOL_CONNECT_URL: AUTHORIZATION_CONNECT_URL,
      MOCK_ERROR_TOOL_PROVIDER: "salesforce",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk) => { state.mockOutput += String(chunk); });
  child.stderr?.on("data", (chunk) => { state.mockOutput += String(chunk); });
  state.mockChild = child;
}

function stopMockServer() {
  if (!state.mockChild) return;
  state.mockChild.kill("SIGTERM");
  state.mockChild = null;
}

process.once("exit", stopMockServer);

async function mockFetch(path, options) {
  const response = await fetch(`${MOCK_SERVER_URL}${path}`, options);
  const body = await response.json();
  return { response, body };
}

async function denApiFetch(path, options = {}) {
  const response = await fetch(`${DEN_API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      origin: DEN_ORIGIN,
      ...(state.token ? { authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { response, body };
}

async function signInDemoOwner() {
  const result = await denApiFetch("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  if (!result.response.ok || typeof result.body.token !== "string") {
    throw new Error(`Demo owner sign-in failed: ${result.response.status} ${JSON.stringify(result.body).slice(0, 400)}`);
  }
  return result.body.token;
}

async function completeConnectionAuthorization() {
  const start = await denApiFetch(`/v1/mcp-connections/${state.connectionId}/connect/start`);
  if (!start.response.ok || start.body.status !== "needs_auth" || !start.body.authorizeUrl) {
    throw new Error(`connect/start failed: ${start.response.status} ${JSON.stringify(start.body).slice(0, 400)}`);
  }
  const authorize = await fetch(start.body.authorizeUrl, { redirect: "manual" });
  let callbackUrl = authorize.headers.get("location");
  if (!callbackUrl) {
    const approveUrl = new URL(`${MOCK_SERVER_URL}/approve`);
    approveUrl.search = new URL(start.body.authorizeUrl).search;
    const approve = await fetch(approveUrl, { method: "POST", redirect: "manual" });
    callbackUrl = approve.headers.get("location");
  }
  if (!callbackUrl) throw new Error("Mock provider did not return the Den OAuth callback URL.");
  const callback = await fetch(callbackUrl);
  if (!callback.ok) throw new Error(`Den OAuth callback failed: ${callback.status}`);
}

async function approvePendingAuthorization() {
  if (!state.pendingAuthorizeUrl) throw new Error("The pending provider authorization URL was not captured.");
  const approveUrl = new URL(`${MOCK_SERVER_URL}/approve`);
  approveUrl.search = new URL(state.pendingAuthorizeUrl, MOCK_SERVER_URL).search;
  const approve = await fetch(approveUrl, { method: "POST", redirect: "manual" });
  const callbackUrl = approve.headers.get("location");
  if (!callbackUrl) throw new Error("Mock provider approval did not return the Den OAuth callback URL.");
  const callback = await fetch(callbackUrl);
  if (!callback.ok) throw new Error(`Den OAuth callback failed: ${callback.status}`);
}

async function usableConnection() {
  const result = await denApiFetch("/v1/mcp-connections?scope=usable");
  if (!result.response.ok) throw new Error(`Connection list failed: ${result.response.status}`);
  return (result.body.connections ?? []).find((entry) => entry.id === state.connectionId) ?? null;
}

async function readRuntimeCloudControlMcp(ctx) {
  return ctx.eval(`(async () => {
    const port = localStorage.getItem('openwork.server.port');
    const token = localStorage.getItem('openwork.server.token');
    const hostToken = localStorage.getItem('openwork.server.hostToken');
    if (!port || !token) return { ok: false, reason: 'missing server auth' };
    const headers = { Authorization: 'Bearer ' + token };
    if (hostToken) headers['X-OpenWork-Host-Token'] = hostToken;
    const base = 'http://127.0.0.1:' + port + '/workspace/' + ${JSON.stringify(state.workspaceId ?? "")};
    const [response, healthResponse] = await Promise.all([
      fetch(base + '/mcp', { headers }),
      fetch(base + '/mcp/openwork-cloud/health?probe=1', { headers }),
    ]);
    const [text, healthText] = await Promise.all([response.text(), healthResponse.text()]);
    let payload = null;
    try { payload = JSON.parse(text); } catch {}
    let health = null;
    try { health = JSON.parse(healthText); } catch {}
    if (!response.ok) return { ok: false, reason: 'mcp endpoint failed', status: response.status, text };
    if (!healthResponse.ok) return { ok: false, reason: 'health endpoint failed', status: healthResponse.status, text: healthText };
    const items = payload?.items ?? [];
    const entry = items.find((item) => item.name === 'openwork-cloud');
    const engineSync = payload?.engineSync?.status ?? null;
    const directTools = health?.tools?.direct?.present ?? [];
    return {
      ok: Boolean(
        entry?.config?.url?.includes('/mcp/agent')
          && entry?.config?.headers?.Authorization
          && entry?.config?.oauth === false
          && engineSync === 'ok'
          && health?.usable === true
          && health?.engine?.status === 'connected'
          && directTools.includes('search_capabilities')
          && directTools.includes('execute_capability')
      ),
      names: items.map((item) => item.name),
      engineSync,
      engineFailures: payload?.engineSync?.failures ?? [],
      health: {
        usable: health?.usable ?? null,
        firstFailure: health?.firstFailure ?? null,
        engine: health?.engine?.status ?? null,
        directTools,
      },
      entry,
    };
  })()`, { awaitPromise: true });
}

async function ensureCloudControlReady(ctx) {
  await openMcpSettings(ctx);
  await revealHidden(ctx);
  await ctx.expectText("OpenWork Cloud Control", { timeoutMs: 60_000 });

  const alreadyConnected = await ctx.eval(`(() => {
    const card = [...document.querySelectorAll('button')].find((entry) => entry.textContent.includes('OpenWork Cloud Control'));
    return Boolean(card?.textContent.includes('Connected'));
  })()`);
  if (!alreadyConnected) {
    const opened = await ctx.eval(`(() => {
      const card = [...document.querySelectorAll('button')].find((entry) => entry.textContent.includes('OpenWork Cloud Control'));
      card?.scrollIntoView({ block: 'center' });
      card?.click();
      return Boolean(card);
    })()`);
    ctx.assert(opened, "Could not open the OpenWork Cloud Control card.");
    await ctx.expectText("Manage your org", { timeoutMs: 15_000 });
    const connected = await ctx.eval(`(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const button = [...(dialog?.querySelectorAll('button') ?? [])]
        .find((entry) => entry.textContent.trim() === 'Connect' && !entry.disabled);
      button?.click();
      return Boolean(button);
    })()`);
    ctx.assert(connected, "Could not connect OpenWork Cloud Control for the eval workspace.");
  }

  await ctx.waitFor(`(() => {
    const card = [...document.querySelectorAll('button')].find((entry) => entry.textContent.includes('OpenWork Cloud Control'));
    return Boolean(card?.textContent.includes('Connected'));
  })()`, { timeoutMs: 60_000, label: "OpenWork Cloud Control connected card" });
  await ctx.control("extensions.refresh-marketplace").catch(() => undefined);

  const runtime = await waitFor(async () => {
    const current = await readRuntimeCloudControlMcp(ctx);
    return current?.ok ? current : null;
  }, "Runtime OpenWork Cloud Control MCP config never became ready.", 60_000);
  ctx.log(`Runtime Cloud Control ready: ${JSON.stringify({ names: runtime.names, engineSync: runtime.engineSync, health: runtime.health })}`);
}

async function revealHidden(ctx) {
  if (!(await ctx.hasText("Showing hidden"))) {
    await ctx.clickText("Show hidden", { timeoutMs: 30_000 });
  }
}

async function clickExactButtonIfPresent(ctx, label) {
  return ctx.eval(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((entry) => {
        const rect = entry.getBoundingClientRect();
        return (entry.textContent ?? '').trim() === ${JSON.stringify(label)}
          && !entry.disabled
          && rect.width > 0
          && rect.height > 0;
      });
    button?.click();
    return Boolean(button);
  })()`);
}

async function advanceVisibleOnboarding(ctx) {
  if (await ctx.eval(`(() => {
    const input = document.querySelector('input[placeholder="/workspace/my-project"]');
    if (!input) return false;
    const rect = input.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  })()`)) {
    await ctx.fill('input[placeholder="/workspace/my-project"]', WORKSPACE_PATH);
    return clickExactButtonIfPresent(ctx, "Use this folder");
  }
  if (await clickExactButtonIfPresent(ctx, "Skip and use the free model")) return true;
  if (await clickExactButtonIfPresent(ctx, "Continue without OpenWork Models")) return true;
  if (await clickExactButtonIfPresent(ctx, "Skip")) return true;
  if (await clickExactButtonIfPresent(ctx, "Continue with organization")) return true;
  return clickExactButtonIfPresent(ctx, "Continue to workspace");
}

async function ensureWorkspace(ctx) {
  await mkdir(WORKSPACE_PATH, { recursive: true });
  await ctx.waitFor(
    "Boolean(localStorage.getItem('openwork.server.port') && localStorage.getItem('openwork.server.token') && localStorage.getItem('openwork.server.hostToken'))",
    { timeoutMs: 60_000, label: "OpenWork server auth for eval workspace" },
  );
  const created = await ctx.eval(`(async () => {
    const port = localStorage.getItem('openwork.server.port');
    const token = localStorage.getItem('openwork.server.token');
    const hostToken = localStorage.getItem('openwork.server.hostToken');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      'X-OpenWork-Host-Token': hostToken,
    };
    const response = await fetch('http://127.0.0.1:' + port + '/workspaces/local', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        folderPath: ${JSON.stringify(WORKSPACE_PATH)},
        name: 'chat-mcp-reconnect',
        preset: 'starter',
      }),
    });
    const text = await response.text();
    let payload = null;
    try { payload = JSON.parse(text); } catch {}
    if (!response.ok) return { ok: false, status: response.status, text };
    const workspaceId = payload?.activeId
      ?? payload?.selectedId
      ?? payload?.workspaces?.find((workspace) => workspace.path === ${JSON.stringify(WORKSPACE_PATH)})?.id;
    if (!workspaceId) return { ok: false, status: response.status, text: 'workspace id missing' };
    const activate = await fetch('http://127.0.0.1:' + port + '/workspaces/' + workspaceId + '/activate?persist=true', {
      method: 'POST',
      headers,
    });
    if (!activate.ok) return { ok: false, status: activate.status, text: await activate.text() };
    await window.__OPENWORK_ELECTRON__?.invokeDesktop('workspaceSetSelected', workspaceId);
    await window.__OPENWORK_ELECTRON__?.invokeDesktop('workspaceSetRuntimeActive', workspaceId);
    await window.__OPENWORK_ELECTRON__?.invokeDesktop('openworkServerRestart', {});
    localStorage.setItem('openwork.react.activeWorkspace', workspaceId);
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('openwork.preferences') || '{}'); } catch {}
    localStorage.setItem('openwork.preferences', JSON.stringify({
      ...prefs,
      hasCompletedOnboarding: true,
      providerStepCompleted: true,
    }));
    return { ok: true, workspaceId };
  })()`, { awaitPromise: true });
  ctx.assert(created?.ok && created.workspaceId, `Could not prepare the eval workspace: ${JSON.stringify(created)}`);
  state.workspaceId = created.workspaceId;
  await ctx.navigateHash(`/workspace/${state.workspaceId}/session`);
  await ctx.waitFor(`window.location.hash.includes(${JSON.stringify(`/workspace/${state.workspaceId}`)})`, {
    timeoutMs: 60_000,
    label: "eval workspace route",
  });
}

async function openMcpSettings(ctx) {
  const deadline = Date.now() + 120_000;
  let lastNavigationAt = 0;
  while (Date.now() < deadline) {
    const advanced = await advanceVisibleOnboarding(ctx);
    if (await ctx.hasText("Add Custom App")) return;

    const hash = await ctx.eval("window.location.hash");
    const workspaceId = typeof hash === "string"
      ? (hash.match(/\/workspace\/([^/]+)/) ?? [])[1]
      : null;
    if (workspaceId) state.workspaceId = workspaceId;

    if (!advanced && state.workspaceId && Date.now() - lastNavigationAt >= 2_000) {
      await ctx.navigateHash(`/workspace/${state.workspaceId}/settings/extensions/mcp`);
      lastNavigationAt = Date.now();
    }
    await sleep(500);
  }
  throw new Error("MCP settings did not become available after completing visible onboarding.");
}

async function createFreshTask(ctx) {
  await ctx.navigateHash(`/workspace/${state.workspaceId}/session`);
  await ctx.waitFor("Boolean(window.__openworkControl)", { timeoutMs: 30_000, label: "desktop control API" });
  let created = false;
  let lastCreateError = null;
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    await ctx.waitFor(
      "window.__openworkControl.listActions().some((entry) => entry.id === 'session.create_task' && entry.disabled === false)",
      { timeoutMs: 45_000, label: "new task action" },
    );
    try {
      await ctx.control("session.create_task");
      created = true;
    } catch (error) {
      lastCreateError = error;
      if (!String(error?.message ?? error).includes("Action is disabled")) throw error;
      await sleep(500);
    }
  }
  if (!created) throw lastCreateError ?? new Error("Could not create a fresh task.");
  await ctx.waitFor(
    "Boolean(document.querySelector('[contenteditable=\"true\"][data-lexical-editor=\"true\"]'))",
    { timeoutMs: 30_000, label: "task composer" },
  );
}

async function sendPrompt(ctx, prompt) {
  await ctx.control("composer.set_text", { text: prompt });
  await ctx.waitFor(
    "window.__openworkControl.listActions().some((entry) => entry.id === 'composer.send' && entry.disabled === false)",
    { timeoutMs: 30_000, label: "enabled send action" },
  );
  await ctx.control("composer.send");
}

async function waitForAssistantToFinish(ctx, timeoutMs = 180_000) {
  await ctx.waitFor(
    "window.__openworkControl.listActions().some((entry) => entry.id === 'composer.stop' && entry.disabled === false)",
    { timeoutMs: 45_000, label: "assistant run started" },
  ).catch(() => undefined);
  await ctx.waitFor(
    "window.__openworkControl.listActions().some((entry) => entry.id === 'composer.stop' && entry.disabled === true)",
    { timeoutMs, label: "assistant run finished" },
  );
}

async function recentMockRequests() {
  const { response, body } = await mockFetch("/requests");
  if (!response.ok) throw new Error(`Mock request log failed: ${response.status}`);
  return body.requests ?? [];
}

export default {
  id: FLOW_ID,
  title: "Expired MCP credentials can be reconnected from the failed chat tool",
  kind: "user-facing",
  requiredEnv: ["OPENWORK_EVAL_DEN_API_URL"],
  steps: [
    {
      name: "Setup: real Den connection, OAuth credential, desktop sign-in, and Cloud Control",
      run: async (ctx) => {
        state.token = process.env.OPENWORK_EVAL_DEN_TOKEN?.trim() || await signInDemoOwner();
        ctx.assert(Boolean(state.token), `Demo owner sign-in failed for ${DEMO_EMAIL}.`);
        startMockServer();
        await waitFor(async () => (await fetch(`${MOCK_SERVER_URL}/health`).catch(() => null))?.ok, "Mock OAuth MCP server did not become healthy.", 30_000);

        const existing = await denApiFetch("/v1/mcp-connections?scope=manageable");
        ctx.assert(existing.response.ok, `Could not list existing connections: ${existing.response.status}`);
        for (const connection of existing.body.connections ?? []) {
          if (connection.name.startsWith(CONNECTION_PREFIX)) {
            await denApiFetch(`/v1/mcp-connections/${connection.id}`, { method: "DELETE" });
          }
        }

        const created = await denApiFetch("/v1/mcp-connections", {
          method: "POST",
          body: JSON.stringify({
            name: CONNECTION_NAME,
            url: `${MOCK_SERVER_URL}/mcp`,
            authType: "oauth",
            credentialMode: "per_member",
            access: { orgWide: true },
          }),
        });
        ctx.assert(created.response.ok, `Connection creation failed: ${created.response.status} ${JSON.stringify(created.body).slice(0, 400)}`);
        state.connectionId = created.body.id;
        await completeConnectionAuthorization();
        const connected = await usableConnection();
        ctx.assert(connected?.connectedForMe === true, "Research Vault did not become connected for the signed-in member.");
        ctx.assert(Boolean(connected.connectedAt), "The initial member authorization timestamp was missing.");
        state.reconnectBaselineConnectedAt = connected.connectedAt;

        await ctx.waitFor("Boolean(window.__openworkControl)", { timeoutMs: 120_000, label: "desktop control API" });
        await ctx.waitFor("Boolean(window.__OPENWORK_ELECTRON__?.invokeDesktop)", { timeoutMs: 30_000, label: "desktop bridge" });
        const bootstrap = { baseUrl: DEN_ORIGIN, apiBaseUrl: `${DEN_ORIGIN}/api/den`, requireSignin: false, handoff: null };
        const written = await ctx.eval(`(async () => {
          await window.__OPENWORK_ELECTRON__.invokeDesktop("setDesktopBootstrapConfig", ${JSON.stringify(bootstrap)});
          localStorage.setItem('openwork.den.baseUrl', ${JSON.stringify(DEN_ORIGIN)});
          localStorage.setItem('openwork.den.apiBaseUrl', ${JSON.stringify(`${DEN_ORIGIN}/api/den`)});
          return true;
        })()`, { awaitPromise: true });
        ctx.assert(written === true, "Could not point the desktop app at the eval Den.");
        await ctx.eval("location.reload()");
        await ctx.waitFor("Boolean(window.__openworkControl)", { timeoutMs: 60_000, label: "control API after Den bootstrap" });

        const handoff = await denApiFetch("/v1/auth/desktop-handoff", {
          method: "POST",
          body: JSON.stringify({ desktopScheme: "openwork" }),
        });
        ctx.assert(handoff.response.ok && handoff.body.grant, `Desktop handoff failed: ${handoff.response.status}`);
        await ctx.waitFor(
          "window.__openworkControl.listActions().some((entry) => entry.id === 'auth.exchange-grant' && entry.disabled === false)",
          { timeoutMs: 30_000, label: "auth.exchange-grant action" },
        );
        await ctx.control("auth.exchange-grant", { grant: handoff.body.grant, baseUrl: DEN_ORIGIN });
        await ctx.waitFor("Boolean((localStorage.getItem('openwork.den.authToken') ?? '').trim())", { timeoutMs: 45_000, label: "desktop Den token" });
        await ctx.waitFor("Boolean((localStorage.getItem('openwork.den.activeOrgId') ?? '').trim())", { timeoutMs: 60_000, label: "desktop active org" });

        await ensureWorkspace(ctx);
        await ensureCloudControlReady(ctx);
        await ctx.expectNoText("Something went wrong");
      },
    },
    {
      name: "Frame 1 — a structured reauthentication failure becomes an inline chat action",
      run: async (ctx) => {
        await ctx.prove("The failed Cloud capability identifies the expired connection and renders one concise reconnect action", {
          voiceover: vo[0],
          action: async () => {
            const expired = await mockFetch("/admin/expire-oauth-tokens", { method: "POST" });
            ctx.assert(expired.response.ok && expired.body.expiredAccessTokens > 0 && expired.body.expiredRefreshTokens > 0, `Mock credentials were not invalidated: ${JSON.stringify(expired.body)}`);
            await createFreshTask(ctx);
            const exactCapability = `mcp:${state.connectionId}:mock_echo`;
            await sendPrompt(ctx, `Use OpenWork Cloud Control to call the Research Vault mock echo capability. Follow the normal sequence: first search_capabilities for "Research Vault mock echo", then execute the exact returned capability named ${exactCapability} with body {"text":"expired credential proof"}. Continue through the execute call and report its result.`);
          },
          assert: async () => {
            await ctx.waitFor("Boolean(document.querySelector('[data-testid=\"chat-mcp-reconnect-action\"]'))", { timeoutMs: 180_000, label: "inline MCP reconnect action" });
            await waitForAssistantToFinish(ctx).catch(() => undefined);
            await ctx.expectText("Reconnect required");
            const action = await ctx.eval(`(() => {
              const button = document.querySelector('[data-testid="chat-mcp-reconnect-action"]');
              return button ? {
                label: (button.textContent ?? '').trim(),
                accessibleLabel: button.getAttribute('aria-label'),
              } : null;
            })()`);
            ctx.assert(action?.label === "Reconnect", `Expected the compact Reconnect label, received ${JSON.stringify(action?.label)}.`);
            ctx.assert(action?.accessibleLabel === `Reconnect ${CONNECTION_NAME}`, "The compact action lost its connection-specific accessible label.");
            const actionCount = await ctx.eval("document.querySelectorAll('[data-testid=\"chat-mcp-reconnect-action\"]').length");
            ctx.assert(actionCount === 1, `Expected one reconnect action, found ${actionCount}.`);
            await ctx.eval("document.querySelector('[data-testid=\"chat-mcp-reconnect-action\"]')?.scrollIntoView({ block: 'center' })");
            await sleep(250);
          },
          screenshot: {
            name: "chat-mcp-reconnect-required",
            claim: "A real search_capabilities live probe encounters invalid-grant and offers a one-click reconnect for the exact connection in chat.",
            requireText: ["Reconnect required", "Reconnect"],
            rejectText: ["Something went wrong"],
          },
        });
      },
    },
    {
      name: "Frame 2 — pending browser sign-in can be reopened immediately",
      run: async (ctx) => {
        await ctx.prove("Pending browser authorization remains an enabled, repeatable action", {
          voiceover: vo[1],
          action: async () => {
            await ctx.eval("window.__openwork?.clearEvents()");
            const clickedAt = new Date().toISOString();
            await ctx.trustedClick('[data-testid="chat-mcp-reconnect-action"]', { timeoutMs: 20_000 });
            await ctx.waitForText("Open sign-in again", { timeoutMs: 30_000 });
            await waitFor(async () => {
              const entries = await recentMockRequests();
              return entries.some((entry) => entry.at >= clickedAt && entry.method === "GET" && entry.path === "/authorize");
            }, "The initial chat action did not open the provider authorization page.", 45_000);
            await ctx.trustedClick('[data-testid="chat-mcp-reconnect-action"]', { timeoutMs: 20_000 });
            const requests = await waitFor(async () => {
              const entries = await recentMockRequests();
              const authorize = entries.filter((entry) => entry.at >= clickedAt && entry.method === "GET" && entry.path === "/authorize");
              return authorize.length >= 2 ? entries : null;
            }, "Open sign-in again did not reopen the same provider authorization.", 45_000);
            const authorizeRequests = requests.filter((entry) => entry.at >= clickedAt && entry.method === "GET" && entry.path === "/authorize");
            state.pendingAuthorizeUrl = authorizeRequests.at(-1)?.url ?? null;
            ctx.assert(Boolean(state.pendingAuthorizeUrl), "The reopened provider authorization URL was not captured.");
            ctx.assert(!requests.some((entry) => entry.at >= clickedAt && entry.method === "POST" && entry.path === "/token"), "Reopening sign-in unexpectedly completed authorization without consent.");
            ctx.log(`Pending authorization opened ${authorizeRequests.length} times without starting a second chat reconnect transaction.`);
          },
          assert: async () => {
            const action = await ctx.eval(`(() => {
              const button = document.querySelector('[data-testid="chat-mcp-reconnect-action"]');
              return button ? { label: (button.textContent ?? '').trim(), disabled: button.disabled } : null;
            })()`);
            ctx.assert(action?.label === "Open sign-in again", `Expected a reusable sign-in action, received ${JSON.stringify(action)}.`);
            ctx.assert(action?.disabled === false, "Pending sign-in must not lock the user out of reopening authorization.");
            const events = await ctx.eval("window.__openwork?.events(20) ?? []");
            const started = events.filter((entry) => entry.name === "mcp.chat_reconnect.started");
            const reopened = events.filter((entry) => entry.name === "mcp.chat_reconnect.authorization_reopened");
            ctx.assert(started.length === 1, `Expected one reconnect transaction, observed ${started.length}.`);
            ctx.assert(reopened.length === 1, `Expected one authorization reopen event, observed ${reopened.length}.`);
          },
          screenshot: {
            name: "chat-mcp-reconnect-sign-in-reopen",
            claim: "While browser authorization is pending, the chat row stays usable and offers Open sign-in again instead of a disabled 90-second wait.",
            requireText: ["Reconnect required", "Open sign-in again"],
            rejectText: ["Opening sign-in", "Could not start", "Something went wrong"],
          },
        });
      },
    },
    {
      name: "Frame 3 — provider consent completes the real Den OAuth reconnect flow",
      run: async (ctx) => {
        await ctx.prove("The reusable sign-in action still completes only after real provider consent", {
          voiceover: vo[2],
          action: async () => {
            const approvedAt = new Date().toISOString();
            await approvePendingAuthorization();
            const requests = await waitFor(async () => {
              const entries = await recentMockRequests();
              return entries.some((entry) => entry.at >= approvedAt && entry.method === "POST" && entry.path === "/token") ? entries : null;
            }, "Provider approval did not reach the token endpoint.", 45_000);
            ctx.log(`Reconnect completion requests: ${requests.filter((entry) => entry.at >= approvedAt).map((entry) => `${entry.method} ${entry.path}`).join(", ")}`);
            await ctx.waitForText("Reconnected", { timeoutMs: 45_000 });
            await ctx.waitForText("Try again", { timeoutMs: 10_000 });
          },
          assert: async () => {
            const connected = await waitFor(async () => {
              const connection = await usableConnection();
              return connection?.connectedForMe === true
                && connection.connectedAt
                && connection.connectedAt !== state.reconnectBaselineConnectedAt
                ? connection
                : null;
            }, "Den did not persist a fresh member authorization timestamp.", 30_000);
            ctx.assert(connected.id === state.connectionId, "Reconnect completed for a different connection.");
            await ctx.expectText("Reconnected");
            await ctx.expectText("Try again");
          },
          screenshot: {
            name: "chat-mcp-reconnect-completed",
            claim: "The reused browser authorization changes to Reconnected only after Den persists a newer member authorization.",
            requireText: ["Reconnected", "Try again"],
            rejectText: ["Open sign-in again", "Could not start", "Something went wrong"],
          },
        });
      },
    },
    {
      name: "Frame 4 — retry is prepared safely without auto-replaying a tool",
      run: async (ctx) => {
        await ctx.prove("Try again drafts a guarded retry instead of auto-replaying a possible write", {
          voiceover: vo[3],
          action: async () => {
            const sessionHash = await ctx.eval("window.location.hash");
            await ctx.navigateHash(`/workspace/${state.workspaceId}/settings/extensions/mcp`);
            await ctx.waitForText("Add Custom App", { timeoutMs: 30_000 });
            await ctx.navigateHash(sessionHash.replace(/^#/, ""));
            await ctx.waitForText("Reconnected", { timeoutMs: 30_000 });
            await ctx.waitForText("Try again", { timeoutMs: 10_000 });
            await ctx.trustedClick('[data-testid="chat-mcp-reconnect-action"]', { timeoutMs: 20_000 });
            await ctx.waitFor(
              `Boolean([...document.querySelectorAll('[contenteditable="true"][data-lexical-editor="true"]')].find((entry) => (entry.textContent ?? '').includes('Before repeating any write action')))`,
              { timeoutMs: 20_000, label: "guarded retry draft" },
            );
            await ctx.eval(`([...document.querySelectorAll('[contenteditable="true"][data-lexical-editor="true"]')].find((entry) => (entry.textContent ?? '').includes('Before repeating any write action')))?.scrollIntoView({ block: 'center' })`);
          },
          assert: async () => {
            await ctx.expectText("Reconnected");
            await ctx.expectText("The Research Vault");
            await ctx.expectText("Before repeating any write action");
          },
          screenshot: {
            name: "chat-mcp-reconnect-safe-retry",
            claim: "Try again prepares a visible retry draft that searches live state and warns against duplicating a write; it does not auto-send or replay the failed tool.",
            requireText: ["Reconnected", "Before repeating any write action"],
            rejectText: ["Something went wrong"],
          },
        });
      },
    },
    {
      name: "Frame 5 — the same real capability succeeds after reconnect",
      run: async (ctx) => {
        await ctx.prove("Fresh authorization repairs the capability used by desktop chat", {
          voiceover: vo[4],
          action: async () => {
            await createFreshTask(ctx);
            const exactCapability = `mcp:${state.connectionId}:mock_echo`;
            await sendPrompt(ctx, `Use OpenWork Cloud Control to call the Research Vault mock echo capability. Follow the normal sequence: first search_capabilities for "Research Vault mock echo", then execute the exact returned capability named ${exactCapability} with body {"text":"${ECHO_TEXT}"}. Continue through the execute call and reply with exactly the returned text.`);
          },
          assert: async () => {
            await ctx.waitFor(
              `(document.body.innerText.match(new RegExp(${JSON.stringify(ECHO_TEXT)}, 'g')) ?? []).length >= 2`,
              { timeoutMs: 180_000, label: "recovered capability result in prompt and response" },
            );
            await waitForAssistantToFinish(ctx).catch(() => undefined);
            const requests = await recentMockRequests();
            ctx.assert(requests.some((entry) => entry.path === "/mcp" && entry.toolNames?.includes("mock_echo")), "The provider did not receive the recovered mock_echo tools/call.");
          },
          screenshot: {
            name: "chat-mcp-reconnect-recovered",
            claim: "After reconnect, the same exact capability crosses desktop, Den, and the provider and returns its exact result.",
            requireText: [ECHO_TEXT],
            rejectText: ["Reconnect required", "Something went wrong"],
          },
        });
      },
    },
    {
      name: "Frame 6 — provider authorization always becomes one structured sign-in action",
      run: async (ctx) => {
        await ctx.prove("A real Den capability error renders one exact sign-in target without opening it automatically", {
          voiceover: vo[5],
          action: async () => {
            const reset = await mockFetch("/admin/error-tool-state", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ authorized: false, connectUrl: AUTHORIZATION_CONNECT_URL }),
            });
            ctx.assert(reset.response.ok && reset.body.authorized === false && reset.body.connectUrl === AUTHORIZATION_CONNECT_URL, `Could not reset provider sign-in state: ${JSON.stringify(reset.body)}`);
            await createFreshTask(ctx);
            state.signInFailureStartedAt = new Date().toISOString();
            const exactCapability = `mcp:${state.connectionId}:${AUTHORIZATION_TOOL}`;
            await sendPrompt(ctx, `Use OpenWork Cloud Control to call the Research Vault Salesforce authorization check. Follow the normal sequence: first search_capabilities for "Research Vault Salesforce authorization check", then execute the exact returned capability named ${exactCapability} with body {}. Continue through the execute call and report its result.`);
          },
          assert: async () => {
            await ctx.waitFor("Boolean(document.querySelector('[data-testid=\"chat-mcp-signin-action\"]'))", { timeoutMs: 180_000, label: "inline MCP provider sign-in action" });
            await waitForAssistantToFinish(ctx).catch(() => undefined);
            const action = await ctx.eval(`(() => {
              const link = document.querySelector('[data-testid="chat-mcp-signin-action"]');
              return link ? {
                count: document.querySelectorAll('[data-testid="chat-mcp-signin-action"]').length,
                label: (link.textContent ?? '').trim(),
                accessibleLabel: link.getAttribute('aria-label'),
                href: link.getAttribute('href'),
                rel: link.getAttribute('rel'),
              } : null;
            })()`);
            ctx.assert(action?.count === 1, `Expected one structured sign-in action, received ${JSON.stringify(action)}.`);
            ctx.assert(action?.label === "Sign in to salesforce", `The sign-in action lost its safe provider label: ${JSON.stringify(action)}.`);
            ctx.assert(action?.accessibleLabel === action.label, "The sign-in action is not exposed accessibly.");
            ctx.assert(action?.href === AUTHORIZATION_CONNECT_URL, `Expected exact connect URL ${AUTHORIZATION_CONNECT_URL}, received ${JSON.stringify(action?.href)}.`);
            ctx.assert(action?.rel?.includes("noopener") && action.rel.includes("noreferrer"), "The external sign-in action lost its opener protections.");
            const requests = await recentMockRequests();
            ctx.assert(!requests.some((entry) => entry.at >= state.signInFailureStartedAt && entry.method === "GET" && entry.url === "/connect/salesforce"), "Rendering the sign-in action opened the provider URL automatically.");
            const reconnectCount = await ctx.eval("document.querySelectorAll('[data-testid=\"chat-mcp-reconnect-action\"]').length");
            ctx.assert(reconnectCount === 0, `Provider sign-in incorrectly rendered ${reconnectCount} reconnect action(s).`);
            await ctx.eval("document.querySelector('[data-testid=\"chat-mcp-signin-action\"]')?.scrollIntoView({ block: 'center' })");
            await sleep(250);
          },
          screenshot: {
            name: "chat-mcp-provider-signin-required",
            claim: "The real Cloud tool row always exposes one app-authored sign-in action for the exact Den-sanitized provider URL, without auto-opening it.",
            requireText: ["Sign-in required", "Sign in to salesforce"],
            rejectText: ["Reconnect required", "Something went wrong"],
          },
        });
      },
    },
    {
      name: "Frame 7 — clicking opens the exact URL and Try again only drafts",
      run: async (ctx) => {
        await ctx.prove("User click opens the exact provider URL, then guarded retry remains an unsent draft", {
          voiceover: vo[6],
          action: async () => {
            await ctx.eval("window.__openwork?.clearEvents()");
            const clickedAt = new Date().toISOString();
            await ctx.trustedClick('[data-testid="chat-mcp-signin-action"]', { timeoutMs: 20_000 });
            const opened = await waitFor(async () => {
              const entries = await recentMockRequests();
              return entries.find((entry) => entry.at >= clickedAt && entry.method === "GET" && entry.url === "/connect/salesforce") ?? null;
            }, "The desktop shell did not open the exact provider URL.", 45_000);
            ctx.assert(opened.url === new URL(AUTHORIZATION_CONNECT_URL).pathname, `External open reached ${opened.url} instead of ${AUTHORIZATION_CONNECT_URL}.`);
            await ctx.waitForText("Opened sign-in in your browser", { timeoutMs: 20_000 });
            await ctx.waitForText("Try again", { timeoutMs: 20_000 });

            const authorized = await mockFetch("/admin/error-tool-state", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ authorized: true }),
            });
            ctx.assert(authorized.response.ok && authorized.body.authorized === true, "The mock provider could not complete sign-in.");

            state.signInRetryStartedAt = new Date().toISOString();
            await ctx.trustedClick('[data-testid="chat-mcp-signin-action"]', { timeoutMs: 20_000 });
            await ctx.waitFor(
              `Boolean([...document.querySelectorAll('[contenteditable="true"][data-lexical-editor="true"]')].find((entry) => (entry.textContent ?? '').includes('I finished signing in') && (entry.textContent ?? '').includes('Before repeating any write action')))`,
              { timeoutMs: 20_000, label: "provider sign-in guarded retry draft" },
            );
            const requests = await recentMockRequests();
            ctx.assert(!requests.some((entry) => entry.at >= state.signInRetryStartedAt && entry.toolNames?.includes(AUTHORIZATION_TOOL)), "Try again auto-sent the provider capability instead of drafting.");
          },
          assert: async () => {
            await ctx.waitFor(
              "window.__openwork?.events(20).some((entry) => entry.name === 'mcp.chat_signin.opened')",
              { timeoutMs: 5_000, label: "desktop sign-in inspector event" },
            );
            await ctx.waitFor(
              "window.__openwork?.events(20).some((entry) => entry.name === 'mcp.chat_reconnect.retry_drafted')",
              { timeoutMs: 5_000, label: "guarded retry inspector event" },
            );
            await ctx.expectText("Sign-in opened");
            await ctx.expectText("Before repeating any write action");
          },
          screenshot: {
            name: "chat-mcp-provider-signin-retry-draft",
            claim: "After the user opens provider sign-in, Try again creates a visible guarded draft and does not send it.",
            requireText: ["Sign-in opened", "Opened sign-in in your browser", "Before repeating any write action"],
            rejectText: ["Something went wrong"],
          },
        });
      },
    },
    {
      name: "Frame 8 — sending the guarded retry succeeds after provider sign-in",
      run: async (ctx) => {
        await ctx.prove("Sending the user-reviewed draft reruns the real capability successfully", {
          voiceover: vo[7],
          action: async () => {
            state.signInRetryStartedAt = new Date().toISOString();
            await ctx.waitFor(
              "window.__openworkControl.listActions().some((entry) => entry.id === 'composer.send' && entry.disabled === false)",
              { timeoutMs: 20_000, label: "enabled guarded retry send action" },
            );
            await ctx.control("composer.send");
          },
          assert: async () => {
            await waitForAssistantToFinish(ctx);
            const requests = await recentMockRequests();
            ctx.assert(requests.some((entry) => entry.at >= state.signInRetryStartedAt && entry.toolNames?.includes(AUTHORIZATION_TOOL)), "The reviewed retry did not re-run execute_capability against the provider.");
            const expanded = await ctx.eval(`(() => {
              const rows = [...document.querySelectorAll('button')]
                .filter((entry) => (entry.textContent ?? '').includes('Running openwork cloud execute capability'));
              const latest = rows.at(-1);
              latest?.click();
              latest?.scrollIntoView({ block: 'center' });
              return Boolean(latest);
            })()`);
            ctx.assert(expanded, "The successful execute_capability tool row was not available for exact-result proof.");
            await ctx.waitFor(
              `[...document.querySelectorAll('pre')].some((entry) => (entry.textContent ?? '').includes(${JSON.stringify(AUTHORIZATION_SUCCESS_TEXT)}))`,
              { timeoutMs: 10_000, label: "exact successful provider tool result" },
            );
          },
          screenshot: {
            name: "chat-mcp-provider-signin-succeeded",
            claim: "After explicit sign-in and explicit send, the same provider capability succeeds through desktop, Den, and the real mock MCP.",
            requireText: [AUTHORIZATION_SUCCESS_TEXT],
            rejectText: ["Something went wrong"],
          },
        });
      },
    },
    {
      name: "Frame 9 — a cross-origin provider URL never becomes a button",
      run: async (ctx) => {
        await ctx.prove("Den origin discipline and renderer URL gates leave an unsafe provider link non-actionable", {
          voiceover: vo[8],
          action: async () => {
            const unsafe = await mockFetch("/admin/error-tool-state", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ authorized: false, connectUrl: UNSAFE_CONNECT_URL }),
            });
            ctx.assert(unsafe.response.ok && unsafe.body.connectUrl === UNSAFE_CONNECT_URL, "The mock provider did not enter the cross-origin safety case.");
            await createFreshTask(ctx);
            const exactCapability = `mcp:${state.connectionId}:${AUTHORIZATION_TOOL}`;
            await sendPrompt(ctx, `Use OpenWork Cloud Control to call the Research Vault Salesforce authorization check. First search_capabilities for "Research Vault Salesforce authorization check", then execute the exact returned capability named ${exactCapability} with body {}. Continue through the execute call and report its result.`);
          },
          assert: async () => {
            await waitForAssistantToFinish(ctx);
            const actions = await ctx.eval(`({
              signIn: document.querySelectorAll('[data-testid="chat-mcp-signin-action"]').length,
              reconnect: document.querySelectorAll('[data-testid="chat-mcp-reconnect-action"]').length,
            })`);
            ctx.assert(actions.signIn === 0, `Cross-origin provider URL rendered ${actions.signIn} sign-in action(s).`);
            ctx.assert(actions.reconnect === 0, `Cross-origin provider URL rendered ${actions.reconnect} reconnect action(s).`);
            const expanded = await ctx.eval(`(() => {
              const rows = [...document.querySelectorAll('button')]
                .filter((entry) => (entry.textContent ?? '').includes('Running openwork cloud execute capability'));
              const latest = rows.at(-1);
              latest?.click();
              latest?.scrollIntoView({ block: 'center' });
              return Boolean(latest);
            })()`);
            ctx.assert(expanded, "The rejected cross-origin execute_capability result was not available for raw fallback proof.");
            await ctx.waitFor(
              `(() => {
                const rows = [...document.querySelectorAll('button')]
                  .filter((entry) => (entry.textContent ?? '').includes('Running openwork cloud execute capability'));
                const raw = rows.at(-1)?.closest('[data-slot="collapsible"]')?.querySelector('pre.text-destructive');
                return Boolean((raw?.textContent ?? '').includes('connection_failed'));
              })()`,
              { timeoutMs: 10_000, label: "raw provider failure fallback" },
            );
            const rawResult = await ctx.eval(`(() => {
              const rows = [...document.querySelectorAll('button')]
                .filter((entry) => (entry.textContent ?? '').includes('Running openwork cloud execute capability'));
              const raw = rows.at(-1)?.closest('[data-slot="collapsible"]')?.querySelector('pre.text-destructive');
              raw?.scrollIntoView({ block: 'center' });
              return raw?.textContent ?? '';
            })()`);
            ctx.assert(rawResult.includes("connection_failed"), "The cross-origin provider failure did not degrade to raw tool text.");
            ctx.assert(!rawResult.includes(UNSAFE_CONNECT_URL), "Den relayed the rejected cross-origin provider URL into the tool result.");
          },
          screenshot: {
            name: "chat-mcp-provider-signin-cross-origin-blocked",
            claim: "A cross-origin provider-declared URL remains raw error text with no structured sign-in or reconnect action.",
            requireText: ["connection_failed"],
            rejectText: ["Sign-in required", "Reconnect required", UNSAFE_CONNECT_URL, "Something went wrong"],
          },
        });
      },
    },
    {
      name: "Cleanup",
      run: async (ctx) => {
        if (state.connectionId) {
          const removed = await denApiFetch(`/v1/mcp-connections/${state.connectionId}`, { method: "DELETE" });
          ctx.assert(removed.response.ok, `Connection cleanup failed: ${removed.response.status}`);
        }
        stopMockServer();
        ctx.log("Removed the eval connection and stopped the mock OAuth MCP server.");
      },
    },
  ],
};
