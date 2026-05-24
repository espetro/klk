# Core Package — Agent Guide

Pure domain layer. No React Native dependencies. Used by both `packages/infrastructure/` and `apps/events/`.

## Structure

```
src/
  domain/     Events, Users, Groups, Cities entities + domain errors
  ports/      Interfaces: IEventRepository, IStorageService, ICryptoService, IConfigService
  use-cases/  PublishEvent, RsvpEvent, CreateGroup, FindEventsByCity
```

## Error Handling

Uses `neverthrow` Result<T,E>. Never throw exceptions.

```ts
import { ok, err } from "neverthrow";
// ok(value) or err(new DomainError("..."))
```

## Validation

Uses `valibot` schemas. Define schemas in `domain/`, validate in use-cases.

## Ports

All external dependencies are abstracted as ports. Implementations live in `packages/infrastructure/`.

## Testing

```bash
bun run test
```
