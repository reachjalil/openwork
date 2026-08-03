import assert from "node:assert/strict";
import test from "node:test";

import {
  parseScheduledTasksBackgroundArgs,
  scheduledTasksBackgroundArgv,
} from "./scheduled-tasks-background.mjs";

test("parses an opaque scheduled-task wake without task policy", () => {
  const argv = scheduledTasksBackgroundArgv("local-default");
  assert.deepEqual(argv, [
    "--background-scheduled-tasks",
    "--scheduled-tasks-profile",
    "local-default",
  ]);
  assert.deepEqual(parseScheduledTasksBackgroundArgs(argv), {
    mode: "tick",
    profileId: "local-default",
    source: "os-wake",
  });
  assert.equal(argv.join(" ").includes("workspace"), false);
  assert.equal(argv.join(" ").includes("prompt"), false);
});

test("requires both ids for an explicit developer run-once", () => {
  assert.throws(
    () => parseScheduledTasksBackgroundArgs([
      "--background-scheduled-tasks",
      "--scheduled-task-run-once",
      "task_1",
    ]),
    /both task and workspace ids/,
  );
  assert.deepEqual(parseScheduledTasksBackgroundArgs([
    "OpenWork",
    "--background-scheduled-tasks",
    "--scheduled-task-run-once",
    "task_1",
    "--scheduled-task-workspace",
    "workspace_1",
  ]), {
    mode: "run-once",
    profileId: "",
    taskId: "task_1",
    workspaceId: "workspace_1",
  });
});
