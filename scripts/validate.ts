#!/usr/bin/env bun
import { $ } from "bun";
import task from "tasuku";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";

interface CheckTask {
  name: string;
  cmd: string[];
  cwd?: string;
  timeoutMs?: number;
  expectTimeout?: boolean;
}

const KILL_GRACE_PERIOD_MS = 5000;
const BUNDLE_TIMEOUT_MS = 300_000;
const STARTUP_PROBE_MS = 15_000;

const checks: CheckTask[] = [
  {
    name: "TypeScript",
    cmd: ["bun", "tsc", "--noEmit"],
    cwd: "apps/events",
  },
  {
    name: "Lint (oxlint)",
    cmd: ["bun", "oxlint", "."],
    cwd: "apps/events",
  },
  {
    name: "Format (oxfmt)",
    cmd: ["bun", "oxfmt", "--check", "."],
    cwd: "apps/events",
  },
  {
    name: "Bundle Check (expo export)",
    cmd: ["bun", "expo", "export", "--platform", "ios", "--clear"],
    cwd: "apps/events",
    timeoutMs: BUNDLE_TIMEOUT_MS,
    expectTimeout: false,
  },
  {
    name: "Production Start (expo start --no-dev)",
    cmd: ["bun", "expo", "start", "--no-dev", "--port", "19000"],
    cwd: "apps/events",
    timeoutMs: STARTUP_PROBE_MS,
    expectTimeout: true,
  },
];

const runCheck = async (check: CheckTask, stream?: WritableStream): Promise<boolean> => {
  return new Promise((resolve) => {
    const proc = spawn(check.cmd[0], check.cmd.slice(1), {
      cwd: check.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let wasKilled = false;
    const timeoutId = check.timeoutMs
      ? setTimeout(() => {
          wasKilled = true;
          proc.kill("SIGTERM");
          setTimeout(() => proc.kill("SIGKILL"), KILL_GRACE_PERIOD_MS);
        }, check.timeoutMs)
      : null;

    if (stream && proc.stdout) {
      pipeline(proc.stdout, stream).catch(() => {});
    }
    if (stream && proc.stderr) {
      pipeline(proc.stderr, stream).catch(() => {});
    }

    proc.on("exit", (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (check.expectTimeout && wasKilled) {
        resolve(true);
      } else {
        resolve(code === 0);
      }
    });

    proc.on("error", () => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve(false);
    });
  });
};

const main = async () => {
  const results = await task.group((t) =>
    checks.map((check) =>
      t(check.name, async ({ streamPreview }) => {
        const passed = await runCheck(check, streamPreview);
        return { passed, name: check.name };
      }),
    ),
  );

  let allPassed = true;
  for (const result of results) {
    const status = result.result.passed ? "✅" : "❌";
    console.log(`${status} ${result.result.name}`);
    if (!result.result.passed) {
      allPassed = false;
    }
  }

  console.log("");
  if (allPassed) {
    console.log("All checks passed!");
    process.exit(0);
  } else {
    console.log("Some checks failed.");
    process.exit(1);
  }
};

await main();
