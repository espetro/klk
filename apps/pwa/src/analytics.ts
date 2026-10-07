// Telemetry: PostHog EU analytics + LogTape plumbing. The publishable
// project key lives in VITE_POSTHOG_KEY (an env, not a secret — posthog-js
// keys are public by design). Telemetry is off when the key is unset.
import { posthog } from "posthog-js";
import type { LogRecord, Sink } from "@logtape/logtape";
import { getLogger, initLogging } from "@klk/core";
import { POSTHOG_HOST, POSTHOG_KEY } from "./config.ts";

const log = getLogger(["klk", "telemetry"]);
let ready = false;
export const posthogClient = (): typeof posthog | null => (ready ? posthog : null);

// warn/error log records mirror into PostHog so bugs surface in one place.
const posthogSink: Sink = (record: LogRecord) => {
  if (!ready) return;
  const msg = record.message.map(String).join(" ");
  const props = { category: record.category.join("."), level: record.level };
  if (record.level === "error" || record.level === "fatal") {
    posthog.captureException(new Error(msg), props);
  } else if (record.level === "warning") {
    posthog.capture("log_warning", props);
  }
};

export function initTelemetry(): void {
  // logging works even without PostHog — the console sink is always on
  initLogging({ posthog: posthogSink });
  if (POSTHOG_KEY === undefined || typeof window === "undefined") return;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      autocapture: { capture_copied_text: false },
      mask_all_element_attributes: true,
      capture_exceptions: true,
      persistence: "localStorage",
    });
    ready = true;
  } catch (e) {
    log.warn(`posthog init failed: {msg}`, { msg: String(e) });
  }
}

/** In-app "report a bug" — lands as a `bug_report` event with page context. */
export function reportBug(message: string): void {
  log.info(`bug report: {msg}`, { msg: message });
  if (ready) {
    posthog.capture("bug_report", {
      message,
      url: typeof location === "undefined" ? "" : location.href,
    });
  }
}
