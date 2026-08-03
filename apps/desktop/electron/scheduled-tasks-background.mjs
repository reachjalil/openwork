const BACKGROUND_FLAG = "--background-scheduled-tasks";
const PROFILE_FLAG = "--scheduled-tasks-profile";
const RUN_ONCE_FLAG = "--scheduled-task-run-once";
const WORKSPACE_FLAG = "--scheduled-task-workspace";

function argumentValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) return "";
  return String(argv[index + 1] ?? "").trim();
}

export function normalizeScheduledTasksProfileId(value) {
  const profileId = String(value ?? "").trim();
  if (!/^[a-z0-9][a-z0-9.-]{0,63}$/i.test(profileId)) {
    throw new Error("Scheduled Tasks profile id must be opaque alphanumeric text.");
  }
  return profileId;
}

export function parseScheduledTasksBackgroundArgs(argv) {
  if (!Array.isArray(argv) || !argv.includes(BACKGROUND_FLAG)) return null;
  const profileId = argumentValue(argv, PROFILE_FLAG);
  const taskId = argumentValue(argv, RUN_ONCE_FLAG);
  const workspaceId = argumentValue(argv, WORKSPACE_FLAG);
  if ((taskId && !workspaceId) || (workspaceId && !taskId)) {
    throw new Error("A background run-once requires both task and workspace ids.");
  }
  return taskId
    ? { mode: "run-once", profileId, taskId, workspaceId }
    : { mode: "tick", profileId, source: "os-wake" };
}

export function scheduledTasksBackgroundArgv(profileId) {
  const normalizedProfileId = normalizeScheduledTasksProfileId(profileId);
  return [BACKGROUND_FLAG, PROFILE_FLAG, normalizedProfileId];
}
