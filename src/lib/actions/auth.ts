"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { notDeleted, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { toFieldErrors } from "@/lib/validation";

export type AuthFormState = {
  error?: string;
  ok?: boolean;
  fieldErrors?: Record<string, string>;
} | undefined;

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
  next: z.string().optional(),
});

function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Masukkan email dan kata sandi yang valid." };
  }

  const { email, password, next } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), notDeleted(users)))
    .limit(1);

  if (!user || !user.isActive) {
    return { error: "Email atau kata sandi salah." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Email atau kata sandi salah." };
  }

  const headerList = await headers();
  await createSession(user.id, {
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  });

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  redirect(safeNext(next));
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Masukkan kata sandi Anda saat ini."),
  password: z.string().min(8, "Gunakan minimal 8 karakter."),
  confirmPassword: z.string().min(1, "Konfirmasi kata sandi baru Anda."),
});

/**
 * Self-service password change used by the forced first-login flow. Verifies
 * the current (temporary) password, stores the new one and clears the
 * `mustChangePassword` flag so the member lands on the dashboard.
 */
export async function changePassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "Sesi Anda telah berakhir. Silakan masuk kembali." };
  }

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const { currentPassword, password, confirmPassword } = parsed.data;
  if (password !== confirmPassword) {
    return {
      fieldErrors: { confirmPassword: "Konfirmasi kata sandi tidak cocok." },
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, currentUser.id), notDeleted(users)))
    .limit(1);
  if (!user) return { error: "Sesi Anda telah berakhir. Silakan masuk kembali." };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { fieldErrors: { currentPassword: "Kata sandi saat ini salah." } };
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
    })
    .where(eq(users.id, user.id));

  return { ok: true };
}
