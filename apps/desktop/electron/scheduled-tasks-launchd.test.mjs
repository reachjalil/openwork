import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createLaunchdScheduledTaskWakeAdapter } from "./scheduled-tasks-launchd.mjs";

test("reconciles one earliest opaque wake and duplicate requests stay policy-free", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openwork-launchd-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const calls = [];
  const adapter = createLaunchdScheduledTaskWakeAdapter({
    platform: "darwin",
    enabled: true,
    executablePath: "/Applications/OpenWork.app/Contents/MacOS/OpenWork",
    profileId: "local-default",
    launchAgentsDir: directory,
    uid: 501,
    now: () => Date.parse("2026-08-03T10:00:00+02:00"),
    async runLaunchctl(args) {
      calls.push(args);
      return { ok: true, stdout: "", stderr: "" };
    },
  });

  const dueAt = Date.parse("2026-08-03T10:02:15+02:00");
  await Promise.all([
    adapter.reconcile({ nextDueAt: dueAt }),
    adapter.reconcile({ nextDueAt: dueAt }),
  ]);

  const plist = await readFile(adapter.plistPath, "utf8");
  assert.match(plist, /\/usr\/bin\/open/);
  assert.match(plist, /\/Applications\/OpenWork\.app/);
  assert.match(plist, /--background-scheduled-tasks/);
  assert.match(plist, /--scheduled-tasks-profile/);
  assert.match(plist, /local-default/);
  assert.match(plist, /<key>Minute<\/key><integer>3<\/integer>/);
  for (const forbidden of ["workspace_", "task_", "prompt", "provider", "credential", "secret"]) {
    assert.equal(plist.toLowerCase().includes(forbidden), false, forbidden);
  }
  assert.equal(calls.filter((args) => args[0] === "bootstrap").length, 2);
  assert.equal(calls.filter((args) => args[0] === "kickstart").length, 0);
});

test("a due wake is loaded then kicked immediately", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openwork-launchd-due-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const calls = [];
  const adapter = createLaunchdScheduledTaskWakeAdapter({
    platform: "darwin",
    enabled: true,
    executablePath: "/Applications/OpenWork.app/Contents/MacOS/OpenWork",
    profileId: "local-default",
    launchAgentsDir: directory,
    uid: 501,
    now: () => 2_000,
    async runLaunchctl(args) {
      calls.push(args);
      return { ok: true, stdout: "", stderr: "" };
    },
  });
  await adapter.reconcile({ nextDueAt: 1_000 });
  assert.deepEqual(calls.map((args) => args[0]), ["bootout", "bootstrap", "kickstart"]);
});
