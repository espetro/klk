import { NDKMock as NDK, NDKPrivateKeySigner, NDKUser } from '@klk/infrastructure';
import { createContext } from 'react';

export interface NDKContextValue {
  ndk: NDK | null;
  signer: NDKPrivateKeySigner | null;
  currentUser: NDKUser | null;
  attachIdentity: () => Promise<void>;
}

export const NDKContext = createContext<NDKContextValue>({
  ndk: null,
  signer: null,
  currentUser: null,
  attachIdentity: async () => {},
});
