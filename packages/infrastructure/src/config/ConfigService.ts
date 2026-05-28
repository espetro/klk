import { IConfigService, FeatureFlag, ConfigError } from '@klk/core';
import { Result, ok, err } from 'neverthrow';

export class ConfigService implements IConfigService {
  private readonly flags = new Map<FeatureFlag, boolean>();

  getFlag(name: FeatureFlag): Result<boolean, ConfigError> {
    try {
      const value = this.flags.get(name);
      return ok(value ?? false);
    } catch {
      return err(new ConfigError(`Failed to get flag: ${name}`));
    }
  }

  setFlag(name: FeatureFlag, value: boolean): Result<void, ConfigError> {
    try {
      this.flags.set(name, value);
      return ok();
    } catch {
      return err(new ConfigError(`Failed to set flag: ${name}`));
    }
  }
}
