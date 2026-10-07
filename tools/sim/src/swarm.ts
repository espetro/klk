import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Actor } from "./actor.ts";
import { actorName, spawnActor } from "./actor.ts";
import type { Check } from "./scenarios.ts";
import { scenarios } from "./scenarios.ts";

export interface SwarmOptions {
  users: number;
  scenario: string;
  relayUrl: string;
  runDir: string;
  timeoutMs: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(cond: () => boolean, what: string, timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const poll = async (): Promise<void> => {
    if (cond()) return;
    if (Date.now() > deadline) throw new Error(`timed out: ${what}`);
    await wait(50);
    return poll();
  };
  return poll();
}

/** Print the per-actor × check table; returns true when everything passed. */
export function printReport(checks: Check[], actors: Actor[]): boolean {
  const names = [...new Set(checks.map((c) => c.name))];
  const cols = names.map((n) =>
    Math.max(n.length, ...checks.filter((c) => c.name === n).map((c) => c.detail.length), 4),
  );
  const nameW = Math.max(5, ...actors.map((a) => a.name.length));
  const head = ["actor".padEnd(nameW), ...names.map((n, i) => n.padEnd(cols[i]!))].join(" │ ");
  const rule = "─".repeat(head.length);
  console.log(`\n${head}\n${rule}`);
  let allOk = true;
  for (const a of actors) {
    const cells = names.map((n, i) => {
      const c = checks.find((x) => x.actor === a.name && x.name === n);
      if (c === undefined) return "".padEnd(cols[i]!);
      allOk &&= c.ok;
      const mark = c.ok ? "✓" : "✗";
      return `${mark} ${c.detail}`.padEnd(cols[i]!);
    });
    console.log([a.name.padEnd(nameW), ...cells].join(" │ "));
  }
  const passed = checks.filter((c) => c.ok).length;
  console.log(`${rule}\n${allOk ? "PASS" : "FAIL"} — ${passed}/${checks.length} checks green\n`);
  return allOk;
}

/**
 * Headless multi-user run: N actors on N independent realms + WS
 * connections in this one process, driven through a scenario, with a
 * pass/fail consistency table at the end. Exit code signals CI use.
 */
export async function runSwarm(opts: SwarmOptions): Promise<number> {
  const scenario = scenarios[opts.scenario];
  if (scenario === undefined) {
    console.error(
      `unknown scenario "${opts.scenario}" — have: ${Object.keys(scenarios).join(", ")}`,
    );
    return 2;
  }
  const actors: Actor[] = [];
  const checks: Check[] = [];
  const check = (actor: Actor, name: string, ok: boolean, detail = ""): void => {
    checks.push({ actor: actor.name, name, ok, detail });
    if (!ok) actor.log(`CHECK FAILED ${name}: ${detail}`);
  };
  let abortReason: string | null = null;
  try {
    const spawned = await Promise.all(
      Array.from({ length: opts.users }, (_, i) =>
        spawnActor(actorName(i), opts.relayUrl, opts.runDir),
      ),
    );
    actors.push(...spawned);
    await scenario.run({
      actors,
      until: (cond, what, ms) => until(cond, what, ms ?? opts.timeoutMs),
      check,
    });
  } catch (err) {
    abortReason = err instanceof Error ? err.message : String(err);
    console.error(`\nswarm aborted: ${abortReason}`);
  } finally {
    await Promise.all(actors.map((a) => a.realm.disconnect()));
  }
  if (abortReason !== null) {
    checks.push({ actor: "—", name: "completed", ok: false, detail: abortReason });
  }

  const ok = printReport(checks, actors);
  writeFileSync(
    join(opts.runDir, "checks.json"),
    JSON.stringify({ scenario: opts.scenario, ok, checks }, null, 2),
  );
  console.log(`run dir: ${opts.runDir}`);
  return ok ? 0 : 1;
}
