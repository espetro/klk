import { Result } from 'neverthrow';

import { NostrError, PublishError, RsvpError } from '../domain/errors';
import { Event } from '../domain/events';
import { User } from '../domain/users';

/**
 * Port interface for event repository operations.
 * Implementations may use NDK, raw relay connections, or any Nostr client.
 */
export interface IEventRepository {
  findByCity(city: string): Promise<Result<Event[], NostrError>>;
  publish(event: Event): Promise<Result<void, PublishError>>;
  rsvp(eventId: string, user: User): Promise<Result<void, RsvpError>>;
  findById(id: string): Promise<Result<Event | null, NostrError>>;
}
