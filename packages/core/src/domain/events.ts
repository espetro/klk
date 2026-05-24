import { Result, ok, err } from 'neverthrow';
import * as v from 'valibot';

import { ValidationError } from './errors';

export const EventSchema = v.object({
  id: v.string(),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  city: v.string(),
  startTime: v.date(),
  location: v.optional(v.string()),
  isPrivate: v.boolean(),
});

export type Event = v.InferOutput<typeof EventSchema>;

export function parseEvent(raw: unknown): Result<Event, ValidationError> {
  const result = v.safeParse(EventSchema, raw) as v.SafeParseResult<typeof EventSchema>;
  if (result.success) {
    return ok(result.output);
  }
  const issue = result.issues[0];
  return err(new ValidationError(issue?.message ?? 'validation failed'));
}
