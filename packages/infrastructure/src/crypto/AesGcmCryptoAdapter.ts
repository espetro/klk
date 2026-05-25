import { CryptoError } from '@klk/core';
import type { ICryptoService } from '@klk/core';
import { Result, err } from 'neverthrow';

export class AesGcmCryptoAdapter implements ICryptoService {
  generateKey(): string {
    return 'mock-aes-256-gcm-key-base64';
  }

  encrypt(_plaintext: string, _key: string): Promise<Result<string, CryptoError>> {
    return Promise.resolve(err(new CryptoError('encrypt: not implemented')));
  }

  decrypt(_ciphertext: string, _key: string): Promise<Result<string, CryptoError>> {
    return Promise.resolve(err(new CryptoError('decrypt: not implemented')));
  }
}
