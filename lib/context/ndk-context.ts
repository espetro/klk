import { createContext } from "react";
import NDK, { NDKPrivateKeySigner, NDKUser } from "@nostr-dev-kit/ndk-mobile";

export interface NDKContextValue {
  ndk: NDK | null;
  signer: NDKPrivateKeySigner | null;
  currentUser: NDKUser | null;
  city: string;
  setCity: (city: string) => void;
}

export const NDKContext = createContext<NDKContextValue>({
  ndk: null,
  signer: null,
  currentUser: null,
  city: "barcelona",
  setCity: () => {},
});
