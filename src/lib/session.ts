import "server-only";

import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { organizations, roles, sessions, users } from "@/db/schema";

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "salesteam_session";

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);

/** Opaque 64-char hex token. Fits `sessions.id` (varchar(64)). */
function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function expiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export type SessionMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Inserts a DB session row and writes the httpOnly cookie. */
export async function createSession(
  userId: number,
  meta: SessionMeta = {},
): Promise<string> {
  const id = generateSessionId();
  const expiresAt = expiryDate();

  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return id;
}

export type SessionContext = Awaited<ReturnType<typeof loadSessionContext>>;

/**
 * Resolves the current session from the cookie and joins the member, role and
 * organization. Returns `null` when the cookie is missing, expired or the
 * member is deactivated.
 */
export async function loadSessionContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      user: users,
      role: roles,
      organization: organizations,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(roles, eq(users.roleId, roles.id))
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || !row.user.isActive) return null;

  return row;
}

/** Deletes the DB session row and clears the cookie. */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.id, token));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Removes expired rows. Safe to call opportunistically on login. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
