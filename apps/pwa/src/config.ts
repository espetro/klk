// Relay URL: same-origin WS when the relay serves this build (prod/compose);
// override for local dev where `one dev` and klk-relay run on separate ports.
export const RELAY_URL =
  (import.meta.env.VITE_RELAY_URL as string | undefined) ??
  (typeof location !== "undefined"
    ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
    : "ws://localhost:3334");

// HTTP origin of the relay API — api.pinya.club in prod (VITE_API_ORIGIN);
// otherwise derived from RELAY_URL (ws→http), which covers same-origin.
export const API_ORIGIN =
  (import.meta.env.VITE_API_ORIGIN as string | undefined) ?? RELAY_URL.replace(/^ws/, "http");

// Canonical app origin for share/invite links. Prod serves the app at
// app.pinya.club; defaults to wherever this build is served.
export const APP_ORIGIN =
  (import.meta.env.VITE_APP_ORIGIN as string | undefined) ??
  (typeof location !== "undefined" ? location.origin : "http://localhost:3334");

// Cohort gate: collect an email before the app opens. Default on for the
// cohort launch; '0' disables (local dev).
export const COHORT_GATE = (import.meta.env.VITE_COHORT_GATE as string | undefined) !== "0";

// PostHog EU analytics — publishable client key; unset = telemetry off.
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
export const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";

export const APP_NAME = "Pinya";

// Discovery range-select cap (days). Single day or a span up to this many.
export const MAX_RANGE_DAYS = Number(import.meta.env.VITE_MAX_RANGE_DAYS ?? 21);
