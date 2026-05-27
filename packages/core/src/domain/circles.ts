import { Result, ok, err } from 'neverthrow';
import * as v from 'valibot';

import { ValidationError } from './errors';

export const CircleSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.minLength(1)),
  symkey: v.string(),
  members: v.array(v.any()),
});

export type Circle = v.InferOutput<typeof CircleSchema>;

export function parseCircle(raw: unknown): Result<Circle, ValidationError> {
  const result = v.safeParse(CircleSchema, raw);
  if (result.success) {
    return ok(result.output);
  }
  const issue = result.issues[0];
  return err(new ValidationError(issue?.message ?? 'validation failed'));
}
