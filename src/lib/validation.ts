import { z } from "zod";

const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

/**
 * Optional login handle. Blank input becomes `null`; otherwise it is trimmed,
 * lowercased and validated. Used by the member, onboarding and profile forms.
 */
export const optionalUsername = z
  .string()
  .trim()
  .toLowerCase()
  .max(50, "Maksimal 50 karakter.")
  .transform((value) => (value.length > 0 ? value : null))
  .refine(
    (value) => value === null || value.length >= 3,
    "Gunakan minimal 3 karakter.",
  )
  .refine(
    (value) => value === null || USERNAME_PATTERN.test(value),
    "Gunakan hanya huruf kecil, angka, titik, garis bawah, atau tanda hubung.",
  );

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
