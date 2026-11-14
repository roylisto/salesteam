import { DocumentPrinter } from "@/components/document-printer";
import { requirePermission } from "@/lib/auth";
import { getPrintSettings } from "@/lib/print-data";
import { SAMPLE_DOCUMENT } from "@/lib/print-config";

export default async function TestPrintPage() {
  const actor = await requirePermission("printer_settings");
  const settings = await getPrintSettings(actor.organization.id);
  return <DocumentPrinter document={SAMPLE_DOCUMENT} settings={settings} organizationId={actor.organization.id} />;
}
