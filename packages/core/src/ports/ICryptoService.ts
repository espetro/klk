import { Result } from "neverthrow";
import { CryptoError } from "../domain/errors";

export interface ICryptoService {
  generateKey(): string;
  encrypt(plaintext: string, key: string): Promise<Result<string, CryptoError>>;
  decrypt(ciphertext: string, key: string): Promise<Result<string, CryptoError>>;
}
