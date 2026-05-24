# Infrastructure Package — Agent Guide

Adapter layer implementing `packages/core/src/ports/`. All external dependencies (NDK, Expo, crypto) live here.

## Structure

```
src/
  nostr/      NDK singleton, identity, events, rsvp, groups, tags, NostrEventRepository
  storage/    ExpoStorageAdapter, SecureStoreAdapter, CityStore, GroupsStore
  crypto/     AesGcmCryptoAdapter
  config/     ConfigService
```

## NDK Initialization

Singleton in `nostr/ndk.ts`. Creates `NDKCacheAdapterSqlite`, sets relay URL, connects WebSocket.

## Storage

- `expo-secure-store` — private keys, group symmetric keys (iOS Keychain / Android Keystore)
- `expo-sqlite` — NDK cache, event metadata

## Crypto

AES-256-GCM via `@noble/ciphers/aes`. Hermes doesn't expose `crypto.subtle` so pure-JS implementation is used.

## Key Dependencies

- `@nostr-dev-kit/ndk-mobile` — Nostr protocol client
- `expo-secure-store`, `expo-sqlite` — device storage
- `@noble/ciphers` — encryption
