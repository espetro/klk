import { FeatureFlag } from '@klk/core';
import { ConfigService } from '@klk/infrastructure';
import { useCallback, useMemo } from 'react';

// Singleton ConfigService instance for the app.
// In production, this should be persisted to AsyncStorage.
const configService = new ConfigService();

export function useFeatureFlag() {
  const getFlag = useCallback((name: FeatureFlag): boolean => {
    const result = configService.getFlag(name);
    if (result.isErr()) {
      console.warn(`[useFeatureFlag] Failed to get flag ${name}:`, result.error);
      return false;
    }
    return result.value;
  }, []);

  const setFlag = useCallback((name: FeatureFlag, value: boolean): void => {
    const result = configService.setFlag(name, value);
    if (result.isErr()) {
      console.warn(`[useFeatureFlag] Failed to set flag ${name}:`, result.error);
    }
  }, []);

  return useMemo(() => ({ getFlag, setFlag }), [getFlag, setFlag]);
}
