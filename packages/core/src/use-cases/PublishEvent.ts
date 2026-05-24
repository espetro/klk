import { okAsync, errAsync, Result } from "neverthrow";
import { Event, parseEvent } from "../domain/events";
import { ValidationError, PublishError, CryptoError } from "../domain/errors";
import { IEventRepository } from "../ports/IEventRepository";
import { ICryptoService } from "../ports/ICryptoService";

export type PublishedEvent = Event & { publishedAt: Date };

export async function publishEvent(
  repo: IEventRepository,
  crypto: ICryptoService,
  draft: unknown,
  groupKey?: string,
): Promise<Result<PublishedEvent, PublishError | ValidationError | CryptoError>> {
  const parsed = parseEvent(draft);

  if (parsed.isErr()) {
    return errAsync(parsed.error);
  }

  const event = parsed.value;

  if (event.isPrivate && groupKey) {
    const encrypted = await crypto.encrypt(JSON.stringify(event), groupKey);
    if (encrypted.isErr()) {
      return errAsync(encrypted.error);
    }
    const published = await repo.publish(event);
    if (published.isErr()) {
      return errAsync(published.error);
    }
    return okAsync({ ...event, publishedAt: new Date() } as PublishedEvent);
  }

  const published = await repo.publish(event);
  if (published.isErr()) {
    return errAsync(published.error);
  }

  return okAsync({ ...event, publishedAt: new Date() } as PublishedEvent);
}
