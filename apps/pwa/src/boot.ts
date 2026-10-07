// Session bootstrap: restore persisted identity, connect the domain client.
import { atom } from "nanostores";
import {
  $connected,
  $identity,
  connect,
  disconnect,
  discoverCircles,
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

export const $bootState = atom<BootState>("idle");
export const $bootError = atom<string | undefined>(undefined);

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
    if (kp === null) {
      setState("onboarding");
      return;
    }
    setState("connecting");
    await connect(kp, { relayUrl: RELAY_URL });
    await discoverCircles();
    setState("ready");
  } catch (e) {
    booted = false;
    setState("error", e instanceof Error ? e.message : String(e));
  }
};

// Onboarding: create a fresh keypair, persist it, connect.
export const createAndConnect = async (): Promise<void> => {
  setState("connecting");
  try {
    const kp = generateKeypair();
    await persistIdentity(kp);
    await connect(kp, { relayUrl: RELAY_URL });
    $identity.set(kp);
    setState("ready");
  } catch (e) {
    setState("error", e instanceof Error ? e.message : String(e));
  }
};

export const signOut = async (): Promise<void> => {
  await disconnect();
  localStorage.clear();
  $identity.set(null);
  $connected.set(false);
  booted = false;
  setState("onboarding");
};
