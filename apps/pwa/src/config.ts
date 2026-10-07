// Relay URL: same-origin WS when the relay serves this build (prod/compose);
// override for local dev where `one dev` and klk-relay run on separate ports.
export const RELAY_URL =
  (import.meta.env.VITE_RELAY_URL as string | undefined) ??
  (typeof location !== "undefined"
    ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
    : "ws://localhost:3334");
