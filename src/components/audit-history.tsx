import Link from "next/link";
import { and, count, desc, eq, inArray, or } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { auditLogs, notDeleted } from "@/db/schema";
import type { AuditModule } from "@/lib/audit";
import { can, isAdmin, type CurrentUser } from "@/lib/auth";
import { AuditTabs } from "./audit-tabs";

export type AuditSearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 20;
const actionLabels: Record<string, string> = {
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
  login: "Masuk",
  logout: "Keluar",
  change_password: "Ubah kata sandi",
  reset_password: "Reset kata sandi",
};

function tabHref(path: string, params: AuditSearchParams, tab?: string, page = 1) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "tab" || key === "auditPage" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  if (tab) query.set("tab", tab);
  if (page > 1) query.set("auditPage", String(page));
  return query.size ? `${path}?${query}` : path;
}

export async function AuditHistoryPage({ user, module, path, title, params, label, map, memberIds = [] }: {
  user: CurrentUser;
  module: AuditModule;
  path: string;
  title: string;
  params: AuditSearchParams;
  label?: string;
  map?: boolean;
  memberIds?: number[];
}) {
  if (module !== "profile" && !can(user, module)) return null;

  const filter = and(
    eq(auditLogs.organizationId, user.organization.id),
    eq(auditLogs.module, module),
    notDeleted(auditLogs),
    module === "profile" ? eq(auditLogs.actorId, user.id) : undefined,
    module === "team" && !isAdmin(user) ? or(
      eq(auditLogs.actorId, user.id),
      inArray(auditLogs.entityId, memberIds),
    ) : undefined,
  );
  const [totals] = await db.select({ total: count() }).from(auditLogs).where(filter);
  const totalPages = Math.max(1, Math.ceil(totals.total / PAGE_SIZE));
  const requested = typeof params.auditPage === "string" ? Number(params.auditPage) : 1;
  const page = Number.isSafeInteger(requested) ? Math.min(totalPages, Math.max(1, requested)) : 1;
  const rows = await db.select({
    id: auditLogs.id,
    actorName: auditLogs.actorName,
    action: auditLogs.action,
    entityId: auditLogs.entityId,
    entityName: auditLogs.entityName,
    createdAt: auditLogs.createdAt,
  }).from(auditLogs).where(filter).orderBy(desc(auditLogs.id))
    .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);

  const dateOptions = { dateStyle: "medium", timeStyle: "short" } as const;
  let date: Intl.DateTimeFormat;
  try {
    date = new Intl.DateTimeFormat("id-ID", { ...dateOptions, timeZone: user.organization.timezone });
  } catch {
    date = new Intl.DateTimeFormat("id-ID", { ...dateOptions, timeZone: "Asia/Jakarta" });
  }
  return (
    <div className="w-full">
      <PageHeader title={title} description="Riwayat tindakan pengguna pada halaman ini." />
      <AuditTabs path={path} label={label} map={map} />
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Waktu</TableHead>
            <TableHead>Pengguna</TableHead>
            <TableHead>Aksi</TableHead>
            {module !== "profile" && <TableHead>Data</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow>
              <TableCell colSpan={module === "profile" ? 3 : 4} className="text-muted-foreground h-24 text-center">
                Belum ada aktivitas yang tercatat.
              </TableCell>
            </TableRow>}
            {rows.map((row) => <TableRow key={row.id}>
              <TableCell><time dateTime={row.createdAt.toISOString()}>{date.format(row.createdAt)}</time></TableCell>
              <TableCell>{row.actorName}</TableCell>
              <TableCell>{actionLabels[row.action] ?? row.action}</TableCell>
              {module !== "profile" && <TableCell>{row.entityName ?? `#${row.entityId}`}</TableCell>}
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {page > 1 && <Button variant="outline" size="sm" nativeButton={false}
          render={<Link href={tabHref(path, params, "audit", page - 1)} />}>Sebelumnya</Button>}
        <span className="text-muted-foreground text-xs">{page} / {totalPages}</span>
        {page < totalPages && <Button variant="outline" size="sm" nativeButton={false}
          render={<Link href={tabHref(path, params, "audit", page + 1)} />}>Berikutnya</Button>}
      </div>}
    </div>
  );
}
