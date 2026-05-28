import { StorageError } from '@klk/core/domain/errors';
import { IStorageService } from '@klk/core/ports/IStorageService';
import { Result, ok } from 'neverthrow';

export class ExpoStorageAdapter implements IStorageService {
  getItem<T>(key: string): Promise<Result<T | null, StorageError>> {
    console.warn(`[ExpoStorageAdapter] getItem("${key}") — STUB, returning null`);
    return Promise.resolve(ok(null));
  }

  setItem<T>(key: string, _value: T): Promise<Result<void, StorageError>> {
    console.warn(`[ExpoStorageAdapter] setItem("${key}", ...) — STUB, no-op`);
    return Promise.resolve(ok());
  }

  removeItem(key: string): Promise<Result<void, StorageError>> {
    console.warn(`[ExpoStorageAdapter] removeItem("${key}") — STUB, no-op`);
    return Promise.resolve(ok());
  }
}
