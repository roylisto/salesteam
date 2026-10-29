"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { notDeleted, organizations } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { deleteFromS3, uploadToS3 } from "@/lib/storage";
import { toFieldErrors } from "@/lib/validation";

export type OrganizationFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const SETTINGS_PATH = "/settings/organization";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const OrganizationSchema = z.object({
  name: z.string().trim().min(2).max(150),
  legalName: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  email: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  address: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  province: z
    .string()
    .trim()
    .min(1, "Provinsi wajib dipilih.")
    .max(120),
  city: z
    .string()
    .trim()
    .min(1, "Kabupaten/kota wajib dipilih.")
    .max(120),
  district: z
    .string()
    .trim()
    .min(1, "Kecamatan wajib dipilih.")
    .max(120),
  village: z
    .string()
    .trim()
    .min(1, "Kelurahan/desa wajib dipilih.")
    .max(120),
  latitude: z
    .string()
    .trim()
    .min(1, "Latitude wajib diisi.")
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value >= -90 && value <= 90, {
      message: "Latitude tidak valid.",
    }),
  longitude: z
    .string()
    .trim()
    .min(1, "Longitude wajib diisi.")
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value >= -180 && value <= 180, {
      message: "Longitude tidak valid.",
    }),
  currency: z
    .string()
    .trim()
    .length(3, "Mata uang harus berupa kode 3 huruf.")
    .transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(1).max(64),
});

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 100);
}

function resolveStoredKey(stored: string | null): string | null {
  if (!stored) return null;
  // Bare keys are stored for new uploads; full URLs are legacy.
  if (!stored.includes("://")) return stored;
  const endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/+$/, "");
  const bucket = process.env.S3_BUCKET ?? "";
  const prefix = `${endpoint}/${bucket}/`;
  if (stored.startsWith(prefix)) return stored.slice(prefix.length);
  const marker = "organizations/";
  const index = stored.indexOf(marker);
  if (index !== -1) return stored.slice(index);
  return null;
}

export async function updateOrganization(
  _state: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const user = await getCurrentUser();
  if (!user || !can(user, "organization")) {
    return { error: "Anda tidak memiliki izin untuk mengelola pengaturan organisasi." };
  }

  const parsed = OrganizationSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName") ?? undefined,
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    address: formData.get("address") ?? undefined,
    province: formData.get("province") ?? "",
    city: formData.get("city") ?? "",
    district: formData.get("district") ?? "",
    village: formData.get("village") ?? "",
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  if (parsed.data.email !== undefined && parsed.data.email !== null) {
    const emailCheck = z.email().safeParse(parsed.data.email);
    if (!emailCheck.success) {
      return { fieldErrors: { email: "Masukkan alamat email yang valid." } };
    }
  }

  const [existing] = await db
    .select({ logoUrl: organizations.logoUrl })
    .from(organizations)
    .where(and(eq(organizations.id, user.organization.id), notDeleted(organizations)))
    .limit(1);

  let logoUrl = existing?.logoUrl ?? null;

  const logo = formData.get("logo");
  const removeLogo = formData.get("removeLogo") === "true";

  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_LOGO_TYPES.includes(logo.type)) {
      return { fieldErrors: { logo: "Logo harus berformat PNG, JPG, WEBP, atau SVG." } };
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return { fieldErrors: { logo: "Ukuran logo maksimal 2 MB." } };
    }

    const bytes = Buffer.from(await logo.arrayBuffer());
    const key = `organizations/${user.organization.id}/logo/${Date.now()}-${sanitizeFilename(logo.name || "logo")}`;

    await uploadToS3(key, bytes, logo.type);

    const oldKey = resolveStoredKey(logoUrl);
    if (oldKey) {
      await deleteFromS3(oldKey).catch(() => undefined);
    }

    logoUrl = key;
  } else if (removeLogo && logoUrl) {
    const oldKey = resolveStoredKey(logoUrl);
    if (oldKey) {
      await deleteFromS3(oldKey).catch(() => undefined);
    }
    logoUrl = null;
  }

  await db
    .update(organizations)
    .set({
      name: parsed.data.name,
      legalName: parsed.data.legalName ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      province: parsed.data.province,
      city: parsed.data.city,
      district: parsed.data.district,
      village: parsed.data.village,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
      logoUrl,
    })
    .where(eq(organizations.id, user.organization.id));

  revalidatePath(SETTINGS_PATH);
  revalidatePath("/", "layout");
  return { ok: true };
}
