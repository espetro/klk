#!/usr/bin/env node
// klk-sim — runs the TypeScript CLI on Node's built-in TS transform, so
// workspace deps resolve straight to source with no build step.
// Requires Node >= 22.18 (repo pins Node 24 via mise).
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.ts");
const run = spawnSync(
  process.execPath,
  [
    "--experimental-transform-types",
    "--disable-warning=ExperimentalWarning",
    cli,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
if (run.error) {
  console.error(`klk-sim: ${run.error.message}`);
  process.exit(1);
}
process.exit(run.status ?? 1);
