import { z } from "zod";

/**
 * Flattens a Zod error into the first message per field, ready to hand back to
 * a form as `fieldErrors`.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const entries = Object.entries(z.flattenError(error).fieldErrors) as [
    string,
    string[] | undefined,
  ][];

  return Object.fromEntries(
    entries.map(([key, messages]) => [key, messages?.[0] ?? "Nilai tidak valid"]),
  );
}
