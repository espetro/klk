import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { actorName } from "./actor.ts";
import { spawnRelay } from "./relay.ts";
import { runRepl } from "./repl.ts";
import { runSwarm } from "./swarm.ts";
import { runTmux } from "./tmux.ts";
import { scenarios } from "./scenarios.ts";

const USAGE = `klk-sim — multi-user simulation harness for klk

usage:
  klk-sim swarm --users 8 [--scenario social] [--relay ws://… | --spawn-relay]
                [--run-dir DIR] [--timeout MS]
  klk-sim tmux --users 3 [--relay ws://… | --spawn-relay] [--run-dir DIR]
                [--no-attach]
  klk-sim repl --actor NAME [--relay ws://…] [--run-dir DIR]
  klk-sim scenarios                    list scenarios

defaults: --relay ws://localhost:3334 · run dir = $TMPDIR/klk-sim-<ts>
`;

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);

  if (command === undefined || command === "help" || command === "--help") {
    console.log(USAGE);
    return 0;
  }
  if (command === "scenarios") {
    for (const [name, s] of Object.entries(scenarios)) console.log(`${name}\t${s.description}`);
    return 0;
  }

  const { values: flags } = parseArgs({
    args: rest,
    options: {
      users: { type: "string", default: "4" },
      scenario: { type: "string", default: "social" },
      relay: { type: "string" },
      "spawn-relay": { type: "boolean", default: false },
      "run-dir": { type: "string" },
      timeout: { type: "string" },
      actor: { type: "string" },
      attach: { type: "boolean", default: true },
      "no-attach": { type: "boolean", default: false },
    },
    strict: true,
  });

  const users = Math.max(1, Math.floor(Number(flags.users ?? 4)));
  const runDir = flags["run-dir"] ?? mkdtempSync(join(tmpdir(), "klk-sim-"));
  const timeoutMs = flags.timeout !== undefined ? Number(flags.timeout) : 10000;

  switch (command) {
    case "swarm": {
      const relayUrl =
        flags.relay ??
        (flags["spawn-relay"] ? (await spawnRelay(runDir)).url : "ws://localhost:3334");
      if (flags["spawn-relay"]) console.log(`spawned relay at ${relayUrl}`);
      return runSwarm({
        users,
        scenario: flags.scenario ?? "social",
        relayUrl,
        runDir,
        timeoutMs,
      });
    }
    case "tmux": {
      return runTmux({
        users,
        relayUrl: flags.relay ?? (flags["spawn-relay"] ? null : "ws://localhost:3334"),
        runDir,
        attach: flags["no-attach"] !== true,
      });
    }
    case "repl": {
      const name = flags.actor ?? actorName(0);
      const relayUrl = flags.relay ?? "ws://localhost:3334";
      return runRepl({ actor: name, runDir, relayUrl });
    }
    default:
      console.error(`unknown command "${command}"\n`);
      console.log(USAGE);
      return 2;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
