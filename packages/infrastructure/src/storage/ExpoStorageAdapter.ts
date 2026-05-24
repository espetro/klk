import { Result, ok, err } from "neverthrow";
import { IStorageService } from "@klk/core/ports/IStorageService";
import { StorageError } from "@klk/core/domain/errors";

/**
 * Expo storage adapter implementing IStorageService.
 *
 * STUB - AsyncStorage/expo-secure-store integration pending.
 * TODO: Replace with actual AsyncStorage calls once Expo SDK dependencies are resolved.
 * TODO: Consider expo-secure-store for sensitive data (keys, secrets).
 */
export class ExpoStorageAdapter implements IStorageService {
  async getItem<T>(key: string): Promise<Result<T | null, StorageError>> {
    console.warn(`[ExpoStorageAdapter] getItem("${key}") — STUB, returning null`);
    // TODO: Replace with:
    // const value = await AsyncStorage.getItem(key);
    // return value !== null ? ok(JSON.parse(value) as T) : ok(null);
    return ok(null);
  }

  async setItem<T>(key: string, value: T): Promise<Result<void, StorageError>> {
    console.warn(`[ExpoStorageAdapter] setItem("${key}", ...) — STUB, no-op`);
    // TODO: Replace with:
    // await AsyncStorage.setItem(key, JSON.stringify(value));
    // return ok(undefined);
    return ok(undefined);
  }

  async removeItem(key: string): Promise<Result<void, StorageError>> {
    console.warn(`[ExpoStorageAdapter] removeItem("${key}") — STUB, no-op`);
    // TODO: Replace with:
    // await AsyncStorage.removeItem(key);
    // return ok(undefined);
    return ok(undefined);
  }
}
