import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { actorName, loadOrCreateKeypair } from "./actor.ts";
import { freePort, relayCommand } from "./relay.ts";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "klk-sim.mjs");

export interface TmuxOptions {
  users: number;
  relayUrl: string | null; // null → spawn a relay pane (--spawn-relay)
  runDir: string;
  attach: boolean;
}

const sh = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

function t(...args: string[]): void {
  const res = spawnSync("tmux", args, { stdio: "inherit" });
  if (res.status !== 0) throw new Error(`tmux ${args.join(" ")} failed`);
}

function paneCmd(name: string, runDir: string, relayUrl: string): string {
  // bin/klk-sim.mjs re-execs node with the TS transform flags itself
  return `${process.execPath} ${sh(BIN)} repl --run-dir ${sh(runDir)} --actor ${sh(name)} --relay ${sh(relayUrl)}`;
}

/**
 * Watch/drive mode: one tmux session, one pane per actor, each pane an
 * interactive REPL bound to that actor's persisted keypair. With
 * --spawn-relay the relay itself runs in a dedicated window so it lives
 * (and logs) inside the session.
 */
export async function runTmux(opts: TmuxOptions): Promise<number> {
  const names = Array.from({ length: opts.users }, (_, i) => actorName(i));
  mkdirSync(opts.runDir, { recursive: true });
  // pre-mint keys so every pane has a stable identity from its first boot
  for (const n of names) loadOrCreateKeypair(opts.runDir, n);

  let relayUrl = opts.relayUrl;
  let relayPaneCmd: string | null = null;
  if (relayUrl === null) {
    const port = await freePort();
    relayPaneCmd = relayCommand(opts.runDir, port);
    relayUrl = `ws://127.0.0.1:${port}`;
  }

  const tmux = spawnSync("tmux", ["-V"], { stdio: "ignore" });
  if (tmux.error !== undefined || tmux.status !== 0) {
    // fallback: print the manual recipe
    console.log("tmux not found — run one terminal per actor instead:\n");
    if (relayPaneCmd !== null) {
      console.log(`  # relay\n  ${relayPaneCmd}\n`);
    }
    for (const n of names) {
      console.log(`  # ${n}\n  ${paneCmd(n, opts.runDir, relayUrl)}\n`);
    }
    console.log(`keys + logs persist under ${opts.runDir}`);
    return 0;
  }

  const session = `klk-sim-${Math.floor(Date.now() / 1000)}`;

  t("new-session", "-d", "-s", session, "-n", "actors", paneCmd(names[0]!, opts.runDir, relayUrl));
  for (const n of names.slice(1)) {
    t("split-window", "-t", `${session}:actors`, paneCmd(n, opts.runDir, relayUrl));
  }
  t("select-layout", "-t", `${session}:actors`, "tiled");
  if (relayPaneCmd !== null) {
    t("new-window", "-t", session, "-n", "relay", relayPaneCmd);
    t("select-window", "-t", `${session}:actors`);
  }

  console.log(`tmux session "${session}" — ${names.length} actor panes`);
  console.log(`  attach:  tmux attach -t ${session}`);
  console.log(`  kill:    tmux kill-session -t ${session}`);
  console.log(`  run dir: ${opts.runDir}`);

  if (opts.attach && process.stdout.isTTY) {
    spawnSync("tmux", ["attach", "-t", session], { stdio: "inherit" });
  }
  return 0;
}
