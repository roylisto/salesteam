import { notFound } from "next/navigation";
import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { CATALOG_SECTIONS, catalogPath, isCatalogSection } from "@/lib/catalog";

import { CatalogClient } from "./catalog-client";
import { loadCatalogEditor, loadCatalogList } from "./data";

export default async function CatalogPage({ params, searchParams }: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  if (!isCatalogSection(section)) notFound();
  const { title, permission } = CATALOG_SECTIONS[section];
  const user = await requirePermission(permission);
  const query = await searchParams;
  const path = catalogPath(section);
  if (query.tab === "audit") return <AuditHistoryPage user={user} module={permission} path={path} title={title} params={query} label={title} />;

  const editorKey = typeof query.edit === "string" ? query.edit : undefined;
  const id = Number(editorKey);
  const editableId = Number.isSafeInteger(id) && id > 0 ? id : undefined;
  const loadEditor = editorKey === "new" || editableId !== undefined;
  const [{ rows, pagination }, editor] = await Promise.all([
    loadCatalogList(section, user.organization.id, query),
    loadEditor ? loadCatalogEditor(section, user.organization.id, editableId) : null,
  ]);

  return <div className="w-full">
    <PageHeader title={title} description={section === "prices" ? "Kelola harga per satuan jual, tipe outlet, dan cakupan wilayah." : "Kelola katalog produk organisasi Anda."} />
    <AuditTabs path={path} label={title} />
    <CatalogClient section={section} rows={rows} pagination={pagination} editor={editor}
      editorKey={editorKey} missing={loadEditor && !editor} currency={user.organization.currency} />
  </div>;
}
