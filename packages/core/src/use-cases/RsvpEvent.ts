import { Result, ok, err } from 'neverthrow';

import { RsvpError, ValidationError } from '../domain/errors';
import { User } from '../domain/users';
import { IEventRepository } from '../ports/IEventRepository';

export async function rsvpEvent(
  repo: IEventRepository,
  eventId: string,
  user: User,
  count: number
): Promise<Result<void, RsvpError | ValidationError>> {
  if (!eventId || eventId.trim().length === 0) {
    return err(new ValidationError('eventId is required'));
  }

  if (count <= 0) {
    return err(new ValidationError('count must be a positive number'));
  }

  const result = await repo.rsvp(eventId, user);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok();
}
