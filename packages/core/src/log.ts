import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import type { Sink } from "@logtape/logtape";

export { getLogger };

let configured = false;

/** Wire logging for the process — call once at boot. The console sink
 * always runs (bugs should surface in dev early); `extraSinks` adds
 * destinations like the app's PostHog sink for warn/error records.
 * Idempotent so hot reloads don't double-configure. */
export function initLogging(extraSinks: Record<string, Sink> = {}): void {
  if (configured) return;
  configured = true;
  const sinks = { console: getConsoleSink(), ...extraSinks };
  void configure({
    sinks,
    loggers: [{ category: ["klk"], sinks: Object.keys(sinks), lowestLevel: "debug" }],
  });
}
