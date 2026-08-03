import { execFile } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
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

function calendarDate(nextDueAt) {
  const dueAt = new Date(Math.ceil(nextDueAt / MINIMUM_INTERVAL_MS) * MINIMUM_INTERVAL_MS);
  return {
    month: dueAt.getMonth() + 1,
    day: dueAt.getDate(),
    hour: dueAt.getHours(),
    minute: dueAt.getMinutes(),
  };
}

export function renderScheduledTasksLaunchdPlist(input) {
  const profileId = normalizeScheduledTasksProfileId(input.profileId);
  const executablePath = path.resolve(String(input.executablePath ?? ""));
  const appBundlePath = path.resolve(executablePath, "../../..");
  const wake = calendarDate(input.nextDueAt);
  // launchd owns only the short-lived, system-signed `open` process. Launch
  // Services starts a fresh app instance (`-n`) in the background (`-g`), so
  // Electron can either claim the profile or forward the wake to its owner.
  // Unloading the launchd job can therefore never terminate an active task.
  const args = [
    "/usr/bin/open",
    "-g",
    "-n",
    appBundlePath,
    "--args",
    ...scheduledTasksBackgroundArgv(profileId),
  ];
  const argumentXml = args.map((argument) => `      <string>${xml(argument)}</string>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${xml(input.label)}</string>
    <key>ProgramArguments</key>
    <array>
${argumentXml}
    </array>
    <key>ProcessType</key>
    <string>Background</string>
    <key>StartCalendarInterval</key>
    <dict>
      <key>Month</key><integer>${wake.month}</integer>
      <key>Day</key><integer>${wake.day}</integer>
      <key>Hour</key><integer>${wake.hour}</integer>
      <key>Minute</key><integer>${wake.minute}</integer>
    </dict>
    <key>ThrottleInterval</key>
    <integer>60</integer>
  </dict>
</plist>
`;
}

function defaultLaunchctl(args) {
  return new Promise((resolve) => {
    execFile("/bin/launchctl", args, { encoding: "utf8" }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? error?.message ?? ""),
      });
    });
  });
}

export function createLaunchdScheduledTaskWakeAdapter(options) {
  const platform = options.platform ?? process.platform;
  const profileId = normalizeScheduledTasksProfileId(options.profileId);
  const label = `com.differentai.openwork.scheduled-tasks.${profileId}`;
  const launchAgentsDir = options.launchAgentsDir
    ?? path.join(options.homeDir ?? os.homedir(), "Library", "LaunchAgents");
  const plistPath = path.join(launchAgentsDir, `${label}.plist`);
  const uid = options.uid ?? process.getuid?.();
  const domain = Number.isInteger(uid) ? `gui/${uid}` : "";
  const runLaunchctl = options.runLaunchctl ?? defaultLaunchctl;
  const supported = platform === "darwin" && options.enabled !== false && Boolean(domain);
  let queue = Promise.resolve();

  async function unload() {
    if (!supported) return;
    await runLaunchctl(["bootout", `${domain}/${label}`]);
  }

  function reconcile(input) {
    const pending = queue.then(async () => {
      if (!supported) return;
      await unload();
      if (input.nextDueAt === null) {
        await rm(plistPath, { force: true });
        return;
      }
      const now = (options.now ?? Date.now)();
      const plist = renderScheduledTasksLaunchdPlist({
        executablePath: options.executablePath,
        profileId,
        label,
        nextDueAt: Math.max(input.nextDueAt, now),
      });
      await mkdir(launchAgentsDir, { recursive: true });
      const temporaryPath = `${plistPath}.${process.pid}.tmp`;
      await writeFile(temporaryPath, plist, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, plistPath);
      const loaded = await runLaunchctl(["bootstrap", domain, plistPath]);
      if (!loaded.ok) {
        throw new Error(loaded.stderr.trim() || "launchctl bootstrap failed");
      }
      if (input.nextDueAt <= now) {
        const kicked = await runLaunchctl(["kickstart", `${domain}/${label}`]);
        if (!kicked.ok) {
          throw new Error(kicked.stderr.trim() || "launchctl kickstart failed");
        }
      }
    });
    queue = pending.catch(() => undefined);
    return pending;
  }

  return {
    plistPath,
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
