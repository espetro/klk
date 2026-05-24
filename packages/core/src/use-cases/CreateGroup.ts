import { Result, okAsync, errAsync } from "neverthrow";
import { Group } from "../domain/groups";
import { CryptoError, StorageError } from "../domain/errors";
import type { ICryptoService } from "../ports/ICryptoService";
import type { IStorageService } from "../ports/IStorageService";

export async function createGroup(
  crypto: ICryptoService,
  storage: IStorageService,
  name: string,
): Promise<Result<Group, CryptoError | StorageError>> {
  const symkey = crypto.generateKey();
  if (!symkey) {
    return errAsync(new CryptoError("Failed to generate symmetric key"));
  }

  const group: Group = {
    id: crypto.generateKey(),
    name,
    symkey,
    members: [],
  };

  const storedKey = await storage.setItem(`group:${group.id}:symkey`, symkey);
  if (storedKey.isErr()) {
    return errAsync(storedKey.error);
  }

  return okAsync(group);
}
