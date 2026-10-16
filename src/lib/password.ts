import "server-only";

import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

const ROUNDS = 12;

// Ambiguous characters (0/O, 1/l/I) are left out so the password is easy to
// read out of an email.
const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Generates the initial password issued when a member is added. Unlike the
 * forgot-password temporary password this one does not expire — it simply
 * becomes the member's password until they change it.
 */
export function generateTemporaryPassword(length = 12): string {
  return Array.from(
    { length },
    () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)],
  ).join("");
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
