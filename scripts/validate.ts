import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';
import { parseArgs } from 'node:util';

import { $ } from 'bun';
import task from 'tasuku';

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

const buildChecks = async (cwd: string): Promise<CheckTask[]> => {
  const pkg = JSON.parse(await readFile(`${cwd}/package.json`, 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hasTsconfig = await Bun.file(`${cwd}/tsconfig.json`).exists();
  const hasExpo = 'expo' in allDeps;

  const checks: CheckTask[] = [];
  if (hasTsconfig) checks.push({ name: 'TypeScript', cmd: ['bun', 'tsc', '--noEmit'], cwd });
  checks.push({ name: 'Lint (oxlint)', cmd: ['bun', 'oxlint', '.'], cwd });
  checks.push({ name: 'Format (oxfmt)', cmd: ['bun', 'oxfmt', '--check', '.'], cwd });
  if (hasExpo) {
    checks.push({
      name: 'Bundle Check (expo export)',
      cmd: ['bun', 'expo', 'export', '--platform', 'ios', '--clear'],
      cwd,
      timeoutMs: BUNDLE_TIMEOUT_MS,
      expectTimeout: false,
    });
    checks.push({
      name: 'Production Start (expo start --no-dev)',
      cmd: ['bun', 'expo', 'start', '--no-dev', '--port', '19000'],
      cwd,
      timeoutMs: STARTUP_PROBE_MS,
      expectTimeout: true,
    });
  }
  return checks;
};

const runCheck = async (check: CheckTask, stream?: Writable): Promise<boolean> => {
  const [bin, ...args] = check.cmd;
  const cwd = check.cwd ?? process.cwd();

  // Path 1: Simple checks without timeout — use $ template literal
  if (!check.timeoutMs) {
    const result = await $`${bin} ${args}`.cwd(cwd).quiet().nothrow();
    if (stream) {
      stream.write(result.stdout);
      stream.write(result.stderr);
    }
    return result.exitCode === 0;
  }

  // Path 2: Timeout-controlled checks — use Bun.spawn for process control
  const proc = Bun.spawn([bin, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (stream) {
    (async () => {
      for await (const chunk of proc.stdout) {
        stream.write(chunk);
      }
    })().catch(() => {});
    (async () => {
      for await (const chunk of proc.stderr) {
        stream.write(chunk);
      }
    })().catch(() => {});
  }

  let wasKilled = false;
  const timeoutId = setTimeout(() => {
    wasKilled = true;
    proc.kill();
    setTimeout(() => proc.kill(9), KILL_GRACE_PERIOD_MS);
  }, check.timeoutMs);

  const exitCode = await proc.exited;
  clearTimeout(timeoutId);

  return check.expectTimeout ? wasKilled : exitCode === 0;
};

const getInput = () => {
  const {
    values: { cwd },
  } = parseArgs({
    args: process.argv.slice(2),
    options: {
      cwd: { type: 'string' },
    },
  });

  return { cwd: cwd ? resolve(cwd) : process.cwd() };
};

const main = async () => {
  const { cwd } = getInput();
  const checks = await buildChecks(cwd);

  const results = await task.group((t) =>
    checks.map((check) =>
      t(check.name, async ({ streamPreview }) => {
        const passed = await runCheck(check, streamPreview);
        return { passed, name: check.name };
      })
    )
  );

  let allPassed = true;
  for (const result of results) {
    const status = result.result.passed ? '✅' : '❌';
    console.log(`${status} ${result.result.name}`);
    if (!result.result.passed) {
      allPassed = false;
    }
  }

  console.log('');
  if (allPassed) {
    console.log('All checks passed!');
    process.exit(0);
  } else {
    console.log('Some checks failed.');
    process.exit(1);
  }
};

await main();
