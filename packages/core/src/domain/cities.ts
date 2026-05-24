import * as v from "valibot";
import { Result, ok, err } from "neverthrow";
import { ValidationError } from "./errors";

export const CitySchema = v.object({
  slug: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
});

export type City = v.InferOutput<typeof CitySchema>;

export function parseCity(raw: unknown): Result<City, ValidationError> {
  const result = v.safeParse(CitySchema, raw);
  if (result.success) {
    return ok(result.output);
  }
  const issue = result.issues[0];
  return err(new ValidationError(issue?.message ?? "validation failed"));
}
