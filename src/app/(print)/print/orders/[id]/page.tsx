import { notFound } from "next/navigation";
import { DocumentPrinter } from "@/components/document-printer";
import { requirePermission } from "@/lib/auth";
import { getPrintDocument, getPrintSettings } from "@/lib/print-data";

export default async function PrintOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  const actor = await requirePermission("orders");
  const id = Number((await params).id);
  const kind = (await searchParams).kind ?? "order";
  const [document, settings] = await Promise.all([getPrintDocument(actor, id, kind), getPrintSettings(actor.organization.id)]);
  if (!document) notFound();
  return <DocumentPrinter document={document} settings={settings} organizationId={actor.organization.id} />;
}
