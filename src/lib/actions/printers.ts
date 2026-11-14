"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notDeleted, printerSettings } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { printSettingsSchema } from "@/lib/print-config";

export async function savePrinterSettings(input: unknown): Promise<{ ok?: boolean; error?: string }> {
  const actor = await getCurrentUser();
  if (!actor || !can(actor, "printer_settings")) return { error: "Anda tidak memiliki izin pengaturan printer." };
  const parsed = printSettingsSchema.safeParse(input);
  if (!parsed.success) return { error: "Periksa ukuran kertas, margin, ukuran huruf dan panjang teks template." };
  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(printerSettings).where(and(eq(printerSettings.organizationId, actor.organization.id), notDeleted(printerSettings)));
      const [saved] = await tx.insert(printerSettings).values({ ...parsed.data, organizationId: actor.organization.id })
        .onConflictDoUpdate({ target: printerSettings.organizationId, set: { ...parsed.data, deletedAt: null } }).returning({ id: printerSettings.id });
      await recordAudit(tx, actor, "printer_settings", existing ? "update" : "create", { id: saved.id, name: `${parsed.data.paper} · ${parsed.data.width} mm · ${parsed.data.template}` });
    });
    revalidatePath("/settings/printers"); revalidatePath("/print", "layout");
    return { ok: true };
  } catch { return { error: "Pengaturan printer gagal disimpan." }; }
}
