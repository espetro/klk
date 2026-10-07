import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RELAY_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "apps", "relay");
const RELAY_BIN = join(RELAY_DIR, "bin", "klk-relay");

export interface SpawnedRelay {
  url: string;
  port: number;
  stop(): void;
}

/** Build apps/relay (incremental — cheap on warm GOCACHE). Returns the binary path. */
export function buildRelay(): string {
  const res = spawnSync("go", ["build", "-o", RELAY_BIN, "./cmd/klk-relay"], {
    cwd: RELAY_DIR,
    stdio: "inherit",
  });
  if (res.error !== undefined) {
    throw new Error(
      `go toolchain not found (${res.error.message}) — install Go 1.25 or pass --relay`,
    );
  }
  if (res.status !== 0) throw new Error("go build ./cmd/klk-relay failed");
  return RELAY_BIN;
}

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      srv.close(() => resolve(typeof addr === "object" && addr !== null ? addr.port : 0));
    });
  });
}

async function waitForRelay(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const attempt = async (): Promise<void> => {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) {
      throw new Error(`relay on :${port} didn't answer /healthz within ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 150));
    return attempt();
  };
  return attempt();
}

/**
 * Build + launch the khatru relay on a free port, data under `dataDir`.
 * The child is killed when this process exits (swarm) — for tmux runs
 * prefer `relayCommand()` and run it in its own pane instead.
 */
export async function spawnRelay(dataDir: string): Promise<SpawnedRelay> {
  const bin = buildRelay();
  const port = await freePort();
  mkdirSync(join(dataDir, "relay"), { recursive: true });
  const child = spawn(bin, [], {
    env: {
      ...process.env,
      ADDR: `:${port}`,
      DATA_DIR: join(dataDir, "relay"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (d: Buffer) => process.stderr.write(`[relay] ${d}`));
  child.stdout.on("data", (d: Buffer) => process.stderr.write(`[relay] ${d}`));
  const stop = () => {
    child.kill();
  };
  process.on("exit", stop);
  process.on("SIGINT", () => {
    stop();
    process.exit(130);
  });
  await waitForRelay(port, 15000);
  return { url: `ws://127.0.0.1:${port}`, port, stop };
}

/** Shell command that runs the relay binary directly — used for the tmux
 * relay pane, where the process must outlive the klk-sim driver. */
export function relayCommand(dataDir: string, port: number): string {
  const bin = buildRelay();
  const dir = join(dataDir, "relay");
  mkdirSync(dir, { recursive: true });
  return `ADDR=:${port} DATA_DIR=${JSON.stringify(dir)} ${JSON.stringify(bin)}`;
}
