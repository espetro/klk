import * as v from 'valibot';
import { Result, ok, err } from 'neverthrow';
import { ValidationError } from './errors';
import type { User } from './users';

export const GroupSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.minLength(1)),
  symkey: v.string(),
  members: v.array(v.any()),
});

export type Group = v.InferOutput<typeof GroupSchema>;

export function parseGroup(raw: unknown): Result<Group, ValidationError> {
  const result = v.safeParse(GroupSchema, raw);
  if (result.success) {
    return ok(result.output);
  }
  const issue = result.issues[0];
  return err(new ValidationError(issue?.message ?? 'validation failed'));
}
