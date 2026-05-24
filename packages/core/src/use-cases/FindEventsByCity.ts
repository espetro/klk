import { Result, ok, err } from 'neverthrow';

import { NostrError, ValidationError } from '../domain/errors';
import { Event } from '../domain/events';
import { IEventRepository } from '../ports/IEventRepository';

export async function findEventsByCity(
  repo: IEventRepository,
  city: string
): Promise<Result<Event[], NostrError | ValidationError>> {
  if (!city || city.trim().length === 0) {
    return err(new ValidationError('city is required'));
  }

  const result = await repo.findByCity(city);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value);
}
