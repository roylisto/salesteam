"use server";

import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  notDeleted,
  passwordResetRequests,
  sessions,
  users,
} from "@/db/schema";
import { sendTemporaryPasswordEmail } from "@/lib/mailer";
import { hashPassword, verifyPassword } from "@/lib/password";
import { toFieldErrors } from "@/lib/validation";

/**
 * Maximum password resets a single member may trigger per calendar month.
 * Configurable so it can be raised while developing / testing.
 */
const MONTHLY_LIMIT = Number(process.env.PASSWORD_RESET_MONTHLY_LIMIT ?? 2);

/** How long an issued temporary password stays valid. */
const TEMPORARY_PASSWORD_TTL_MINUTES = 60;

const TEMPORARY_PASSWORD_LENGTH = 10;

/** Unambiguous alphabet (no 0/O/1/l) so temporary passwords are easy to type. */
const TEMPORARY_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export type PasswordResetState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function generateTemporaryPassword(): string {
  const bytes = new Uint8Array(TEMPORARY_PASSWORD_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => TEMPORARY_PASSWORD_ALPHABET[byte % TEMPORARY_PASSWORD_ALPHABET.length],
  ).join("");
}

const RequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

/**
 * Step 1: issue a temporary password for the given email and send it by email.
 */
export async function requestPasswordReset(
  _state: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = RequestSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { email } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), notDeleted(users)))
    .limit(1);

  if (!user) {
    return { fieldErrors: { email: "No account found with this email." } };
  }

  if (!user.isActive) {
    return {
      error: "This account is inactive. Please contact your administrator.",
    };
  }

  const [used] = await db
    .select({ value: count() })
    .from(passwordResetRequests)
    .where(
      and(
        eq(passwordResetRequests.userId, user.id),
        gte(passwordResetRequests.createdAt, startOfMonth()),
        notDeleted(passwordResetRequests),
      ),
    );

  if ((used?.value ?? 0) >= MONTHLY_LIMIT) {
    return {
      error: `You have reached the limit of ${MONTHLY_LIMIT} password resets this month.`,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const tokenHash = await hashPassword(temporaryPassword);
  const expiresAt = new Date(
    Date.now() + TEMPORARY_PASSWORD_TTL_MINUTES * 60 * 1000,
  );

  const [created] = await db
    .insert(passwordResetRequests)
    .values({
      userId: user.id,
      tokenHash,
      expiresAt,
    })
    .returning({ id: passwordResetRequests.id });

  try {
    await sendTemporaryPasswordEmail({
      to: user.email,
      name: user.name,
      temporaryPassword,
      expiresMinutes: TEMPORARY_PASSWORD_TTL_MINUTES,
    });
  } catch (error) {
    console.error("[password-reset] failed to send email:", error);

    // Roll the request back so a failed send does not burn a monthly reset.
    await db
      .update(passwordResetRequests)
      .set({ deletedAt: new Date() })
      .where(eq(passwordResetRequests.id, created.id));

    return {
      error: "We couldn't send the email right now. Please try again later.",
    };
  }

  return { ok: true };
}

const ResetSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  temporaryPassword: z.string().min(1, "Enter the temporary password."),
  password: z.string().min(8, "Use at least 8 characters."),
});

/**
 * Step 2: verify the emailed temporary password and set a new one. The reset
 * request is consumed and all existing sessions are invalidated.
 */
export async function completePasswordReset(
  _state: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = ResetSchema.safeParse({
    email: formData.get("email"),
    temporaryPassword: formData.get("temporaryPassword"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { email, temporaryPassword, password } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), notDeleted(users)))
    .limit(1);

  if (!user) {
    return { error: "Invalid email or temporary password." };
  }

  const [request] = await db
    .select()
    .from(passwordResetRequests)
    .where(
      and(
        eq(passwordResetRequests.userId, user.id),
        isNull(passwordResetRequests.usedAt),
        notDeleted(passwordResetRequests),
      ),
    )
    .orderBy(desc(passwordResetRequests.createdAt))
    .limit(1);

  if (!request) {
    return {
      error: "No active reset request. Request a new temporary password.",
    };
  }

  if (request.expiresAt.getTime() < Date.now()) {
    return {
      error: "This temporary password has expired. Request a new one.",
    };
  }

  const valid = await verifyPassword(temporaryPassword, request.tokenHash);
  if (!valid) {
    return { error: "Invalid email or temporary password." };
  }

  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    await tx
      .update(passwordResetRequests)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetRequests.id, request.id));

    // Invalidate existing sessions so the old password can no longer be used.
    await tx
      .update(sessions)
      .set({ deletedAt: new Date() })
      .where(and(eq(sessions.userId, user.id), isNull(sessions.deletedAt)));
  });

  return { ok: true };
}
