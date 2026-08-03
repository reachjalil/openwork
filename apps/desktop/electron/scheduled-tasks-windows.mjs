import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  normalizeScheduledTasksProfileId,
  scheduledTasksBackgroundArgv,
} from "./scheduled-tasks-background.mjs";

const MINIMUM_INTERVAL_MS = 60_000;

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function startBoundary(nextDueAt) {
  const dueAt = new Date(Math.ceil(nextDueAt / MINIMUM_INTERVAL_MS) * MINIMUM_INTERVAL_MS);
  return [
    `${dueAt.getFullYear()}-${pad(dueAt.getMonth() + 1)}-${pad(dueAt.getDate())}`,
    `${pad(dueAt.getHours())}:${pad(dueAt.getMinutes())}:00`,
  ].join("T");
}

export function renderWindowsScheduledTaskXml(input) {
  const profileId = normalizeScheduledTasksProfileId(input.profileId);
  const executablePath = path.win32.normalize(String(input.executablePath ?? "").trim());
  if (!path.win32.isAbsolute(executablePath) || !executablePath.toLowerCase().endsWith(".exe")) {
    throw new Error("A packaged OpenWork Windows executable is required.");
  }
  const argumentsText = scheduledTasksBackgroundArgv(profileId).join(" ");
  // No UserId or password is serialized. InteractiveToken registration binds
  // the task to the user running schtasks.exe and requires that user to remain
  // signed in when the wake is delivered.
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Author>OpenWork</Author>
    <Description>Wake OpenWork to run reviewed local Scheduled Tasks.</Description>
  </RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <StartBoundary>${startBoundary(input.nextDueAt)}</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id="OpenWorkUser">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>false</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <WakeToRun>true</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="OpenWorkUser">
    <Exec>
      <Command>${xml(executablePath)}</Command>
      <Arguments>${xml(argumentsText)}</Arguments>
      <WorkingDirectory>${xml(path.win32.dirname(executablePath))}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;
}

function defaultSchtasks(args) {
  return new Promise((resolve) => {
    execFile("schtasks.exe", args, {
      encoding: "utf8",
      timeout: 15_000,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? error?.message ?? ""),
      });
    });
  });
}

export function createWindowsScheduledTaskWakeAdapter(options) {
  const platform = options.platform ?? process.platform;
  const profileId = normalizeScheduledTasksProfileId(options.profileId);
  const executablePath = String(options.executablePath ?? "").trim();
  const taskName = `OpenWork Scheduled Tasks - ${profileId}`;
  const temporaryDirectory = options.temporaryDirectory ?? os.tmpdir();
  const taskFilePath = path.join(
    temporaryDirectory,
    `openwork-scheduled-tasks-${profileId}-${process.pid}.xml`,
  );
  const runSchtasks = options.runSchtasks ?? defaultSchtasks;
  const supported = platform === "win32"
    && options.enabled !== false
    && path.win32.isAbsolute(executablePath)
    && executablePath.toLowerCase().endsWith(".exe");
  let queue = Promise.resolve();

  function reconcile(input) {
    const pending = queue.then(async () => {
      if (!supported) return;
      if (input.nextDueAt === null) {
        const deleted = await runSchtasks(["/Delete", "/TN", taskName, "/F"]);
        if (!deleted.ok) {
          const remaining = await runSchtasks(["/Query", "/TN", taskName]);
          if (remaining.ok) {
            throw new Error(deleted.stderr.trim() || "schtasks delete failed");
          }
        }
        return;
      }
      const now = (options.now ?? Date.now)();
      const taskXml = renderWindowsScheduledTaskXml({
        executablePath,
        profileId,
        nextDueAt: Math.max(input.nextDueAt, now),
      });
      await mkdir(temporaryDirectory, { recursive: true });
      await writeFile(taskFilePath, `\ufeff${taskXml}`, { encoding: "utf16le", mode: 0o600 });
      try {
        const created = await runSchtasks([
          "/Create",
          "/TN",
          taskName,
          "/XML",
          taskFilePath,
          "/F",
        ]);
        if (!created.ok) {
          throw new Error(created.stderr.trim() || "schtasks create failed");
        }
      } finally {
        await rm(taskFilePath, { force: true });
      }
      if (input.nextDueAt <= now) {
        const started = await runSchtasks(["/Run", "/TN", taskName]);
        if (!started.ok) {
          throw new Error(started.stderr.trim() || "schtasks run failed");
        }
      }
    });
    queue = pending.catch(() => undefined);
    return pending;
  }

  return {
    taskName,
    async capabilities() {
      return {
        supported,
        strategy: "dynamic-next-wake",
        minimumIntervalMs: MINIMUM_INTERVAL_MS,
      };
    },
    reconcile,
    async stop() {
      await queue;
    },
  };
}
