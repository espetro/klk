import { useStore } from "@nanostores/react";
import type NDK from "@nostr-dev-kit/ndk-mobile";
import type { NDKPrivateKeySigner, NDKUser } from "@nostr-dev-kit/ndk-mobile";
/**
 * NDK lifecycle wrapper (atom-based)
 *
 * NOTE: NDKContext is kept in place until full lifecycle port (per plan T43).
 * This module provides an atom-based alternative that mirrors NDKContext shape.
 *
 * The $ndk atom is non-persistent since NDK state is runtime-only
 * (keys come from secure storage, not localStorage).
 */
import { atom } from "nanostores";

export interface NDKStoreValue {
  ndk: NDK | null;
  signer: NDKPrivateKeySigner | null;
  currentUser: NDKUser | null;
}

export const $ndk = atom<NDKStoreValue>({
  ndk: null,
  signer: null,
  currentUser: null,
});

export function useNDK(): NDKStoreValue {
  return useStore($ndk);
}
