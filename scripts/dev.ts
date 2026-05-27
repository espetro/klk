#!/usr/bin/env bun

process.title = 'klk-dev';

import { resolve } from 'node:path';

import { spawn as bunSpawn } from 'bun';

const repoRoot = resolve(import.meta.dir, '..');

const SESSION_NAME = 'klk-dev';
const RELAY_PORT = 10547;

function spawn(
  cmd: string[],
  opts: { cwd: string; stdout?: 'pipe' | 'inherit'; stderr?: 'pipe' | 'inherit' }
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolveResult) => {
    const proc = bunSpawn(cmd, {
      cwd: opts.cwd,
      stdout: opts.stdout ?? 'pipe',
      stderr: opts.stderr ?? 'pipe',
    });

    let stdout = '';
    let stderr = '';

    const decoder = new TextDecoder();
    if (proc.stdout) {
      (async () => {
        for await (const chunk of proc.stdout) {
          stdout += decoder.decode(chunk, { stream: true });
        }
      })().catch(() => {});
    }
    if (proc.stderr) {
      (async () => {
        for await (const chunk of proc.stderr) {
          stderr += decoder.decode(chunk, { stream: true });
        }
      })().catch(() => {});
    }

    proc.exited.then((exitCode) => {
      resolveResult({ exitCode, stdout, stderr });
    });
  });
}

async function checkPort(port: number): Promise<boolean> {
  const result = await spawn(['lsof', '-i', `:${port}`], { cwd: repoRoot });
  return result.stdout.includes(`:${port}`);
}

function tmux(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return spawn(['tmux', ...args], { cwd: repoRoot });
}

async function checkTmuxInstalled(): Promise<boolean> {
  const result = await spawn(['tmux', '-V'], { cwd: repoRoot });
  if (result.exitCode !== 0) {
    console.error('tmux not found. Install with: brew install tmux');
    return false;
  }
  return true;
}

async function sessionExists(): Promise<boolean> {
  const result = await tmux(['has-session', '-t', SESSION_NAME]);
  return result.exitCode === 0;
}

async function killSession(): Promise<void> {
  await tmux(['kill-session', '-t', SESSION_NAME]);
}

function printHelp(): void {
  console.log(`klk-dev — Tmux Session Manager for Klk

Usage: bun scripts/dev.ts [options]

Options:
  --all       Start all processes (relay + metro + ios + android) [default]
  --ios       Start relay + metro + ios only
  --android   Start relay + metro + android only
  --stop      Kill the klk-dev tmux session
  --status    Show session state and running panes
  --help      Show this help message

Commands:
  bun run dev        Start all (same as --all)
  bun run dev:ios    Start ios only
  bun run dev:android Start android only
  bun run dev:stop   Kill session
  bun run dev:status Show status

Tmux Controls (when attached):
  Ctrl+b, d     Detach from session
  Ctrl+b, arrow Switch panes
  Ctrl+b, [     Scroll mode (exit with q)
`);
}

async function printStatus(): Promise<void> {
  const exists = await sessionExists();
  if (!exists) {
    console.log('No klk-dev session running');
    return;
  }

  console.log('klk-dev session is running');

  const panesResult = await tmux(['list-panes', '-t', SESSION_NAME, '-F', '#{pane_title}']);
  const panes = panesResult.stdout.trim().split('\n').filter(Boolean);

  for (const pane of panes) {
    console.log(`  - ${pane || '(unnamed)'}`);
  }
}

async function stopSession(): Promise<void> {
  const exists = await sessionExists();
  if (!exists) {
    console.log('No klk-dev session to kill');
    return;
  }
  await killSession();
  console.log('klk-dev session killed');
}

async function startRelay(): Promise<boolean> {
  const portInUse = await checkPort(RELAY_PORT);
  if (portInUse) {
    console.log(`Relay already running on port ${RELAY_PORT}, skipping`);
    return false;
  }

  const relayProc = bunSpawn(['nak', 'serve'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
    detached: true,
  });

  relayProc.unref();
  console.log(`Relay started on port ${RELAY_PORT}`);
  return true;
}

async function startAll(): Promise<void> {
  const exists = await sessionExists();
  if (exists) {
    console.log('Existing klk-dev session found, killing it first');
    await killSession();
  }

  await startRelay();

  await tmux(['new-session', '-d', '-s', SESSION_NAME, '-n', 'main']);

  await tmux([
    'send-keys',
    '-t',
    `${SESSION_NAME}:0.0`,
    'bun run --cwd apps/events start',
    'Enter',
  ]);
  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.0`, '-T', 'metro']);

  await tmux(['split-window', '-v', '-t', `${SESSION_NAME}:0.0`, '-p', '40']);

  await tmux(['split-window', '-h', '-t', `${SESSION_NAME}:0.1`]);

  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.1`, '-T', 'ios']);
  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.2`, '-T', 'android']);

  await tmux(['send-keys', '-t', `${SESSION_NAME}:0.1`, 'bun run --cwd apps/events ios', 'Enter']);
  await tmux([
    'send-keys',
    '-t',
    `${SESSION_NAME}:0.2`,
    'bun run --cwd apps/events android',
    'Enter',
  ]);

  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.0`]);

  console.log(`klk-dev session started.

Pane layout:
  Top:     Metro bundler
  Bottom-L: iOS (expo run:ios)
  Bottom-R: Android (expo run:android)

Commands:
  Attach:   tmux attach -t klk-dev
  Stop:     bun run dev:stop
  Status:   bun run dev:status

tmux controls:
  Detach:   Ctrl+b, d
  Switch:   Ctrl+b, arrow
  Scroll:   Ctrl+b, [
`);
}

async function startIosOnly(): Promise<void> {
  const exists = await sessionExists();
  if (exists) {
    console.log('Existing klk-dev session found, killing it first');
    await killSession();
  }

  await startRelay();

  await tmux(['new-session', '-d', '-s', SESSION_NAME, '-n', 'main']);

  await tmux([
    'send-keys',
    '-t',
    `${SESSION_NAME}:0.0`,
    'bun run --cwd apps/events start',
    'Enter',
  ]);
  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.0`, '-T', 'metro']);

  await tmux(['split-window', '-v', '-t', `${SESSION_NAME}:0.0`, '-p', '40']);

  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.1`, '-T', 'ios']);

  await tmux(['send-keys', '-t', `${SESSION_NAME}:0.1`, 'bun run --cwd apps/events ios', 'Enter']);

  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.0`]);

  console.log(`klk-dev session started (iOS mode).

Pane layout:
  Top:    Metro bundler
  Bottom: iOS (expo run:ios)

Commands:
  Attach:   tmux attach -t klk-dev
  Stop:     bun run dev:stop
`);
}

async function startAndroidOnly(): Promise<void> {
  const exists = await sessionExists();
  if (exists) {
    console.log('Existing klk-dev session found, killing it first');
    await killSession();
  }

  await startRelay();

  await tmux(['new-session', '-d', '-s', SESSION_NAME, '-n', 'main']);

  await tmux([
    'send-keys',
    '-t',
    `${SESSION_NAME}:0.0`,
    'bun run --cwd apps/events start',
    'Enter',
  ]);
  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.0`, '-T', 'metro']);

  await tmux(['split-window', '-v', '-t', `${SESSION_NAME}:0.0`, '-p', '40']);

  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.1`, '-T', 'android']);

  await tmux([
    'send-keys',
    '-t',
    `${SESSION_NAME}:0.1`,
    'bun run --cwd apps/events android',
    'Enter',
  ]);

  await tmux(['select-pane', '-t', `${SESSION_NAME}:0.0`]);

  console.log(`klk-dev session started (Android mode).

Pane layout:
  Top:    Metro bundler
  Bottom: Android (expo run:android)

Commands:
  Attach:   tmux attach -t klk-dev
  Stop:     bun run dev:stop
`);
}

async function main(): Promise<void> {
  const argSet = new Set(process.argv.slice(2));

  if (argSet.has('--help') || argSet.has('-h')) {
    printHelp();
    return;
  }

  const tmuxInstalled = await checkTmuxInstalled();
  if (!tmuxInstalled) {
    process.exit(1);
  }

  if (argSet.has('--stop')) {
    await stopSession();
    return;
  }

  if (argSet.has('--status')) {
    await printStatus();
    return;
  }

  const isIos = argSet.has('--ios');
  const isAndroid = argSet.has('--android');

  if (isIos) {
    await startIosOnly();
  } else if (isAndroid) {
    await startAndroidOnly();
  } else {
    await startAll();
  }
}

function setupSignalHandlers(): void {
  let cleanupDone = false;

  async function cleanup(): Promise<void> {
    if (cleanupDone) {
      return;
    }
    cleanupDone = true;

    const exists = await sessionExists();
    if (exists) {
      await killSession();
    }
    process.exit(0);
  }

  process.on('SIGINT', () => {
    cleanup().catch(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    cleanup().catch(() => process.exit(1));
  });
}

setupSignalHandlers();
await main();
