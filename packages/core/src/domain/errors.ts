// oxlint-disable max-classes-per-file

export type NostrErrorCode = 'TIMEOUT' | 'RELAY_ERROR' | 'PARSE_ERROR';

export class NostrError extends Error {
  readonly code: NostrErrorCode;
  constructor(code: NostrErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'NostrError';
  }
}

export type PublishErrorCode = 'INVALID_EVENT' | 'RELAY_REJECTED';

export class PublishError extends Error {
  readonly code: PublishErrorCode;
  constructor(code: PublishErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'PublishError';
  }
}

export class RsvpError extends Error {
  readonly code: 'RSVP_FAILED';
  constructor(message: string) {
    super(message);
    this.code = 'RSVP_FAILED';
    this.name = 'RsvpError';
  }
}

export class ValidationError extends Error {
  readonly code: 'VALIDATION_FAILED';
  constructor(message: string) {
    super(message);
    this.code = 'VALIDATION_FAILED';
    this.name = 'ValidationError';
  }
}

export class StorageError extends Error {
  readonly code: 'STORAGE_ERROR';
  constructor(message: string) {
    super(message);
    this.code = 'STORAGE_ERROR';
    this.name = 'StorageError';
  }
}

export class CryptoError extends Error {
  readonly code: 'CRYPTO_ERROR';
  constructor(message: string) {
    super(message);
    this.code = 'CRYPTO_ERROR';
    this.name = 'CryptoError';
  }
}

export class ConfigError extends Error {
  readonly code: 'CONFIG_ERROR';
  constructor(message: string) {
    super(message);
    this.code = 'CONFIG_ERROR';
    this.name = 'ConfigError';
  }
}
