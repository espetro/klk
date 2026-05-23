import * as v from "valibot";
import { Result, ok, err } from "neverthrow";
import { ValidationError } from "./errors";

export const UserSchema = v.object({
  npub: v.pipe(v.string(), v.minLength(1, "npub is required")),
  name: v.optional(v.string()),
  avatar: v.optional(v.string()),
});

export type User = v.InferOutput<typeof UserSchema>;

export function parseUser(raw: unknown): Result<User, ValidationError> {
  const result = v.safeParse(UserSchema, raw);
  if (result.success) {
    return ok(result.output);
  }
  const issue = result.issues[0];
  return err(new ValidationError(issue?.message ?? "validation failed"));
}
