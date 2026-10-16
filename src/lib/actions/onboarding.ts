"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { notDeleted, organizations, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { toFieldErrors } from "@/lib/validation";

export type OnboardingFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const OnboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(150),
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8, "Use at least 8 characters."),
});

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug.length > 0 ? slug : "organization";
}

async function resolveUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.slug, candidate), notDeleted(organizations)))
      .limit(1);

    if (!existing) return candidate;

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/**
 * Creates a brand-new tenant: the organization and the owner account
 * (system Admin, no role row), then signs the owner in.
 */
export async function createOrganization(
  _state: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const parsed = OnboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { organizationName, name, email, password } = parsed.data;

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), notDeleted(users)))
    .limit(1);

  if (taken) {
    return { fieldErrors: { email: "This email is already registered." } };
  }

  const slug = await resolveUniqueSlug(slugify(organizationName));
  const passwordHash = await hashPassword(password);

  const created = await db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({ name: organizationName, slug, email })
      .returning();

    const [owner] = await tx
      .insert(users)
      .values({
        organizationId: organization.id,
        roleId: null,
        name,
        email,
        passwordHash,
        isOrganizationOwner: true,
      })
      .returning();

    return { organization, owner };
  });

  const headerList = await headers();
  await createSession(created.owner.id, {
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  });

  redirect("/dashboard");
}
