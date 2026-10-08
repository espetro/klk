// posthog-js is a DOM SDK — native telemetry is LogTape console-only for
// v0. Same surface so callers don't branch.
import { getLogger, initLogging } from "@klk/core";

const log = getLogger(["klk", "telemetry"]);

export const posthogClient = (): null => null;

export function initTelemetry(): void {
  initLogging();
}

export function reportBug(message: string): void {
  log.info(`bug report: {msg}`, { msg: message });
}
