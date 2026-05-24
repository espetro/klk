import { Result } from 'neverthrow';

import { ConfigError } from '../domain/errors';

/**
 * Feature flag names supported by the app.
 */
export type FeatureFlag = 'useNewArchitecture' | 'enableEncryption' | 'darkMode';

/**
 * Port interface for reading and writing feature flags.
 */
export interface IConfigService {
  getFlag(name: FeatureFlag): Result<boolean, ConfigError>;
  setFlag(name: FeatureFlag, value: boolean): Result<void, ConfigError>;
}
