import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { getPrintSettings } from "@/lib/print-data";
import { PrinterForm } from "./printer-form";

export default async function PrinterSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("printer_settings");
  const params = await searchParams;
  if (params.tab === "audit") return <AuditHistoryPage user={user} module="printer_settings" path="/settings/printers" title="Printer & Template" params={params} />;
  const settings = await getPrintSettings(user.organization.id);
  return <div className="space-y-3"><PageHeader title="Printer & Template" description="Atur template nota dan ukuran kertas standar organisasi. Pilih printer atau PDF saat mencetak." />
    <AuditTabs path="/settings/printers" /><PrinterForm initial={settings} /></div>;
}
