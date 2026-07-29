import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export async function ensureSessionWorkspace(ctx, flowId) {
  await ctx.waitFor("Boolean(window.__openworkControl)", {
    timeoutMs: 60_000,
    label: "control API",
  });
  const canCreateTask = await ctx.eval(
    "window.__openworkControl.listActions().some((action) => action.id === 'session.create_task' && !action.disabled)",
  );
  if (!canCreateTask) {
    const workspacePath = resolve(
      process.env.OPENWORK_EVAL_ARTIFACTS_DIR ?? "evals/results",
      "..",
      `${flowId}-workspace`,
    );
    await mkdir(workspacePath, { recursive: true });
    const welcomeInput = 'input[placeholder="/workspace/my-project"]';
    const onWelcome = await ctx.eval(
      `Boolean(document.querySelector(${JSON.stringify(welcomeInput)}))`,
    );
    if (onWelcome) {
      await ctx.fill(welcomeInput, workspacePath);
      await ctx.clickText("Use this folder", {
        selector: "button",
        timeoutMs: 10_000,
      });
      await ctx
        .clickText("Skip and use the free model", {
          selector: "button",
          timeoutMs: 30_000,
        })
        .catch(() => {});
      await ctx
        .clickText("Skip", { selector: "button", timeoutMs: 10_000 })
        .catch(() => {});
    } else {
      await ctx.waitFor(
        "window.__openworkControl.listActions().some((action) => action.id === 'workspace.create' && !action.disabled)",
        { timeoutMs: 30_000, label: "workspace.create enabled" },
      );
      await ctx.control("workspace.create", { path: workspacePath });
    }
  }
  await ctx.waitFor(
    "window.__openworkControl.listActions().some((action) => action.id === 'session.create_task' && !action.disabled)",
    { timeoutMs: 90_000, label: "session.create_task enabled" },
  );
}

export async function selectedSessionId(ctx) {
  return ctx.eval(`(() => {
    const route = window.__openwork?.slice?.("route");
    if (typeof route?.selectedSessionId === "string" && route.selectedSessionId.trim()) {
      return route.selectedSessionId.trim();
    }
    const controlRoute = window.__openworkControl?.snapshot?.().route || "";
    const match = controlRoute.match(/ses_[A-Za-z0-9_-]+/);
    return match ? match[0] : null;
  })()`);
}

export async function waitForCreatedSession(ctx, previousSessionId, label = "created session") {
  return ctx.waitFor(`(() => {
    const previous = ${JSON.stringify(previousSessionId ?? "")};
    const route = window.__openwork?.slice?.("route");
    const selected = typeof route?.selectedSessionId === "string"
      ? route.selectedSessionId.trim()
      : "";
    if (selected && selected !== previous) return selected;
    const controlRoute = window.__openworkControl?.snapshot?.().route || "";
    const match = controlRoute.match(/ses_[A-Za-z0-9_-]+/);
    const routed = match ? match[0] : "";
    return routed && routed !== previous ? routed : null;
  })()`, { timeoutMs: 45_000, label });
}
