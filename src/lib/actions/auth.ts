"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { notDeleted, users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";

export type AuthFormState = { error?: string } | undefined;

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
    return { error: "Enter a valid email and password." };
  }

  const { email, password, next } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), notDeleted(users)))
    .limit(1);

  if (!user || !user.isActive) {
    return { error: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
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
