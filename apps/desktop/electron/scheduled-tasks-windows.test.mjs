import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createWindowsScheduledTaskWakeAdapter,
  renderWindowsScheduledTaskXml,
} from "./scheduled-tasks-windows.mjs";

test("renders a least-privilege interactive wake with only opaque task arguments", () => {
  const taskXml = renderWindowsScheduledTaskXml({
    executablePath: "C:\\Program Files\\OpenWork\\OpenWork.exe",
    profileId: "local-default",
    nextDueAt: Date.parse("2026-08-03T10:02:15+02:00"),
  });

  assert.match(taskXml, /<LogonType>InteractiveToken<\/LogonType>/);
  assert.match(taskXml, /<RunLevel>LeastPrivilege<\/RunLevel>/);
  assert.match(taskXml, /<StartWhenAvailable>true<\/StartWhenAvailable>/);
  assert.match(taskXml, /<WakeToRun>true<\/WakeToRun>/);
  assert.match(taskXml, /<MultipleInstancesPolicy>IgnoreNew<\/MultipleInstancesPolicy>/);
  assert.match(taskXml, /<Command>C:\\Program Files\\OpenWork\\OpenWork\.exe<\/Command>/);
  assert.match(taskXml, /--background-scheduled-tasks --scheduled-tasks-profile local-default/);
  assert.doesNotMatch(taskXml, /<UserId>|<Password>/);
  for (const forbidden of ["workspace_", "task_", "prompt", "provider", "credential", "secret"]) {
    assert.equal(taskXml.toLowerCase().includes(forbidden), false, forbidden);
  }
});

test("creates one scheduled task and starts a due wake immediately", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openwork-schtasks-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const calls = [];
  let storedXml = "";
  const adapter = createWindowsScheduledTaskWakeAdapter({
    platform: "win32",
    enabled: true,
    executablePath: "C:\\Program Files\\OpenWork\\OpenWork.exe",
    profileId: "local-default",
    temporaryDirectory: directory,
    now: () => 2_000,
    async runSchtasks(args) {
      calls.push(args);
      const xmlIndex = args.indexOf("/XML");
      if (xmlIndex >= 0) storedXml = await readFile(args[xmlIndex + 1], "utf16le");
      return { ok: true, stdout: "", stderr: "" };
    },
  });

  await adapter.reconcile({ nextDueAt: 1_000 });

  assert.deepEqual(calls.map((args) => args[0]), ["/Create", "/Run"]);
  assert.equal(calls[0].includes("/F"), true);
  assert.match(storedXml, /OpenWork\.exe/);
  assert.match(storedXml, /local-default/);
});

test("removes the per-profile task when no wake remains", async () => {
  const calls = [];
  const adapter = createWindowsScheduledTaskWakeAdapter({
    platform: "win32",
    enabled: true,
    executablePath: "C:\\Program Files\\OpenWork\\OpenWork.exe",
    profileId: "local-default",
    async runSchtasks(args) {
      calls.push(args);
      return { ok: false, stdout: "", stderr: "task not found" };
    },
  });

  await adapter.reconcile({ nextDueAt: null });

  assert.deepEqual(calls, [
    ["/Delete", "/TN", "OpenWork Scheduled Tasks - local-default", "/F"],
    ["/Query", "/TN", "OpenWork Scheduled Tasks - local-default"],
  ]);
});

test("is unavailable outside packaged Windows", async () => {
  const adapter = createWindowsScheduledTaskWakeAdapter({
    platform: "darwin",
    enabled: true,
    executablePath: "C:\\Program Files\\OpenWork\\OpenWork.exe",
    profileId: "local-default",
  });
  assert.deepEqual(await adapter.capabilities(), {
    supported: false,
    strategy: "dynamic-next-wake",
    minimumIntervalMs: 60_000,
  });
});
