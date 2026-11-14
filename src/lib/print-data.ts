import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notDeleted, orderItems, printerSettings } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { getOrder } from "@/lib/order-data";
import { orderStatusLabel } from "@/lib/order";
import { DEFAULT_PRINT_SETTINGS, PRINT_TITLES, printSettingsSchema, type PrintDocument } from "@/lib/print-config";

export async function getPrintSettings(orgId: number) {
  const [settings] = await db.select().from(printerSettings).where(and(eq(printerSettings.organizationId, orgId), notDeleted(printerSettings)));
  return printSettingsSchema.parse(settings ?? DEFAULT_PRINT_SETTINGS);
}

export async function getPrintDocument(user: CurrentUser, id: number, kind: string): Promise<PrintDocument | null> {
  if (!Object.hasOwn(PRINT_TITLES, kind)) return null;
  const record = await getOrder(user, id);
  if (!record?.order.snapshot) return null;
  const { order, invoice } = record;
  if ((kind === "invoice" || kind === "receipt") && !invoice) return null;
  if (kind === "receipt" && (invoice?.status !== "paid" || Number(invoice.outstandingAmount) !== 0 || order.status !== "fulfilled")) return null;
  if (kind === "order" && order.status !== "confirmed" && order.status !== "fulfilled") return null;
  if (kind === "proforma" && order.status === "cancelled") return null;
  const snapshot = order.snapshot!;
  const items = await db.select().from(orderItems).where(and(eq(orderItems.orderId, id), eq(orderItems.organizationId, user.organization.id), notDeleted(orderItems))).orderBy(asc(orderItems.id));
  return {
    kind, title: PRINT_TITLES[kind], number: kind === "quotation" ? order.quotationNumber ?? order.transactionNumber ?? `#${id}`
      : kind === "invoice" || kind === "receipt" ? invoice!.transactionNumber : order.transactionNumber ?? `#${id}`,
    orderNumber: order.transactionNumber ?? `#${id}`,
    date: new Intl.DateTimeFormat("id-ID", { timeZone: user.organization.timezone, dateStyle: "long" }).format((kind === "invoice" || kind === "receipt") && invoice ? invoice.orderedAt : order.orderedAt ?? order.createdAt),
    dueDate: order.dueDate, ...snapshot,
    notes: order.notes, status: order.status === "cancelled" ? "DIBATALKAN" : kind === "receipt" ? "LUNAS" : kind === "invoice" ? invoice?.status === "paid" ? "LUNAS" : "BELUM LUNAS" : orderStatusLabel(order.status),
    items: items.map((item) => ({ name: item.productName ?? "Produk", code: item.productCode, quantity: item.quantity, unit: item.unitName ?? "", price: item.unitPrice, subtotal: item.subtotal })),
    total: order.total, paid: invoice?.paidAmount ?? "0.00", outstanding: invoice?.outstandingAmount ?? order.total,
  };
}
