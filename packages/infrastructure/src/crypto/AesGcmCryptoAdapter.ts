import { CryptoError } from '@klk/core';
import type { ICryptoService } from '@klk/core';
import { Result, ok, err } from 'neverthrow';

export class AesGcmCryptoAdapter implements ICryptoService {
  generateKey(): string {
    // TODO(@noble/ciphers): Implement AES-256-GCM key generation using @noble/ciphers
    // Use crypto.getRandomValues() to generate a 256-bit key
    return 'mock-aes-256-gcm-key-base64';
  }

  async encrypt(plaintext: string, key: string): Promise<Result<string, CryptoError>> {
    // TODO(@noble/ciphers): Implement AES-256-GCM encryption using @noble/ciphers
    // 1. Import the symmetric key using await crypto.subtle.importKey()
    // 2. Generate a random 12-byte IV
    // 3. Encrypt using AES-GCM mode
    // 4. Return base64-encoded ciphertext (IV + ciphertext)
    return err(new CryptoError('encrypt: not implemented'));
  }

  async decrypt(ciphertext: string, key: string): Promise<Result<string, CryptoError>> {
    // TODO(@noble/ciphers): Implement AES-256-GCM decryption using @noble/ciphers
    // 1. Decode base64 to extract IV (first 12 bytes) and ciphertext
    // 2. Import the symmetric key
    // 3. Decrypt using AES-GCM mode
    // 4. Return the plaintext string
    return err(new CryptoError('decrypt: not implemented'));
  }
}
