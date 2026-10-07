// Session bootstrap: restore persisted identity, connect the domain client.
import {
  $connected,
  $identity,
  connect,
  disconnect,
  persistIdentity,
  restoreIdentity,
} from "@klk/core";
import { generateKeypair } from "@klk/proto";
import { RELAY_URL } from "./config.ts";

// vite-plugin-pwa emits /sw.js at build; virtual:pwa-register doesn't resolve
// under One's unified build, so register the emitted file directly.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}

export type BootState = "idle" | "restoring" | "onboarding" | "connecting" | "ready" | "error";

let booted = false;

export const boot = async (onState: (s: BootState, err?: string) => void): Promise<void> => {
  if (booted) return;
  booted = true;
  onState("restoring");
  try {
    const kp = await restoreIdentity();
    if (kp === null) {
      onState("onboarding");
      return;
    }
    onState("connecting");
    await connect(kp, { relayUrl: RELAY_URL });
    onState("ready");
  } catch (e) {
    booted = false;
    onState("error", e instanceof Error ? e.message : String(e));
  }
};

// Onboarding: create a fresh keypair, persist it, connect.
export const createAndConnect = async (
  onState: (s: BootState, err?: string) => void,
): Promise<void> => {
  onState("connecting");
  try {
    const kp = generateKeypair();
    await persistIdentity(kp);
    await connect(kp, { relayUrl: RELAY_URL });
    $identity.set(kp);
    onState("ready");
  } catch (e) {
    onState("error", e instanceof Error ? e.message : String(e));
  }
};

export const signOut = async (): Promise<void> => {
  await disconnect();
  localStorage.clear();
  $identity.set(null);
  $connected.set(false);
  booted = false;
};
