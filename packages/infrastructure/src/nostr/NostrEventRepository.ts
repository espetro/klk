import { Event, User, NostrError, PublishError, RsvpError, IEventRepository } from '@klk/core';
import { Result, err } from 'neverthrow';

export class NostrEventRepository implements IEventRepository {
  findByCity(_city: string): Promise<Result<Event[], NostrError>> {
    return Promise.resolve(
      err(new NostrError('RELAY_ERROR', 'Not implemented: findByCity needs NDK integration'))
    );
  }

  publish(_event: Event): Promise<Result<void, PublishError>> {
    return Promise.resolve(
      err(new PublishError('RELAY_REJECTED', 'Not implemented: publish needs NDK integration'))
    );
  }

  rsvp(_eventId: string, _user: User): Promise<Result<void, RsvpError>> {
    return Promise.resolve(err(new RsvpError('Not implemented: rsvp needs NDK integration')));
  }

  findById(_id: string): Promise<Result<Event | null, NostrError>> {
    return Promise.resolve(
      err(new NostrError('RELAY_ERROR', 'Not implemented: findById needs NDK integration'))
    );
  }
}
