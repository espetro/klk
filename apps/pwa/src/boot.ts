// Session bootstrap: restore persisted identity, connect the domain client.
import { atom } from "nanostores";
import {
  $identity,
  PasskeyRequired,
  connect,
  disconnect,
  discoverCircles,
  persistIdentity,
  publishProfile,
  restoreIdentity,
  unlockWithPasskey,
} from "@klk/core";
import type { UnlockMode } from "@klk/core";
import { generateKeypair } from "@klk/proto";
import { RELAY_URL } from "./config.ts";

// vite-plugin-pwa emits /sw.js at build; virtual:pwa-register doesn't resolve
// under One's unified build, so register the emitted file directly.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}

export type BootState =
  | "idle"
  | "restoring"
  | "locked"
  | "connecting"
  | "ready" // guest or signed in — $identity distinguishes
  | "error";

export const $bootState = atom<BootState>("idle");
export const $bootError = atom<string | undefined>(undefined);
// how this device unlocks the identity — drives post-create copy
export const $unlockMode = atom<UnlockMode>("device");

let booted = false;

const setState = (s: BootState, err?: string): void => {
  $bootState.set(s);
  if (err !== undefined) $bootError.set(err);
};

/**
 * Runs once per document realm — every route needs this, so the AppShell
 * (mounted on every page) calls it, not the index route.
 */
export const boot = async (): Promise<void> => {
  if (booted) return;
  booted = true;
  setState("restoring");
  try {
    const kp = await restoreIdentity();
    setState("connecting");
    // no stored identity → guest mode: connect anonymously, browse for
    // free, create an identity only when the first write needs one
    await connect(kp, { relayUrl: RELAY_URL });
    if (kp !== null) await discoverCircles();
    setState("ready");
  } catch (e) {
    if (e instanceof PasskeyRequired) {
      setState("locked");
      return;
    }
    booted = false;
    setState("error", e instanceof Error ? e.message : String(e));
  }
};

// Passkey-gated restore — needs the user gesture this is called under.
export const unlock = async (): Promise<void> => {
  setState("connecting");
  try {
    const kp = await unlockWithPasskey();
    if (kp === null) {
      setState("ready");
      return;
    }
    await connect(kp, { relayUrl: RELAY_URL });
    await discoverCircles();
    setState("ready");
  } catch (e) {
    setState("locked", e instanceof Error ? e.message : String(e));
  }
};

// Create a fresh keypair, persist it, connect — run on the first action
// that needs identity (join/create/post), not on first open.
export const createAndConnect = async (): Promise<void> => {
  setState("connecting");
  try {
    await disconnect();
    const kp = generateKeypair();
    $unlockMode.set(await persistIdentity(kp));
    await connect(kp, { relayUrl: RELAY_URL });
    $identity.set(kp);
    void publishProfile({}).catch(() => {}); // seed the autogen username
    setState("ready");
  } catch (e) {
    setState("error", e instanceof Error ? e.message : String(e));
  }
};

export const signOut = async (): Promise<void> => {
  await disconnect();
  localStorage.clear();
  booted = false;
  // fall back to guest browsing rather than a dead end
  await connect(null, { relayUrl: RELAY_URL });
  setState("ready");
};
