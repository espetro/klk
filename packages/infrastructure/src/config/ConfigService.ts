import { IConfigService, FeatureFlag } from '@klk/core';
import { ConfigError } from '@klk/core';
import { Result, ok, err } from 'neverthrow';

export class ConfigService implements IConfigService {
  private readonly flags = new Map<FeatureFlag, boolean>();

  getFlag(name: FeatureFlag): Result<boolean, ConfigError> {
    try {
      const value = this.flags.get(name);
      // Default to false if flag not set
      return ok(value ?? false);
    } catch (e) {
      return err(new ConfigError(`Failed to get flag: ${name}`));
    }
  }

  setFlag(name: FeatureFlag, value: boolean): Result<void, ConfigError> {
    try {
      this.flags.set(name, value);
      return ok(undefined);
    } catch (e) {
      return err(new ConfigError(`Failed to set flag: ${name}`));
    }
  }

  // TODO: Persist flags to AsyncStorage for app restarts
  // TODO: Load flags from AsyncStorage on initialization
}
