import { NDKContext } from '@/lib/context/ndk-context';
import { useContext } from 'react';

export function useIdentity() {
  return useContext(NDKContext);
}
