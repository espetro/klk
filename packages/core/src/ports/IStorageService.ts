import { Result } from 'neverthrow';

import { StorageError } from '../domain/errors';

/**
 * Port interface for typed key-value storage.
 * Implementations: AsyncStorage, expo-secure-store, etc.
 */
export interface IStorageService {
  getItem<T>(key: string): Promise<Result<T | null, StorageError>>;
  setItem<T>(key: string, value: T): Promise<Result<void, StorageError>>;
  removeItem(key: string): Promise<Result<void, StorageError>>;
}
