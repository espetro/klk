import { Result, okAsync, errAsync } from 'neverthrow';

import { Circle } from '../domain/circles';
import { CryptoError, StorageError } from '../domain/errors';
import type { ICryptoService } from '../ports/ICryptoService';
import type { IStorageService } from '../ports/IStorageService';

export async function createCircle(
  crypto: ICryptoService,
  storage: IStorageService,
  name: string
): Promise<Result<Circle, CryptoError | StorageError>> {
  const symkey = crypto.generateKey();
  if (!symkey) {
    return errAsync(new CryptoError('Failed to generate symmetric key'));
  }

  const circle: Circle = {
    id: crypto.generateKey(),
    name,
    symkey,
    members: [],
  };

  const storedKey = await storage.setItem(`circle:${circle.id}:symkey`, symkey);
  if (storedKey.isErr()) {
    return errAsync(storedKey.error);
  }

  return okAsync(circle);
}
