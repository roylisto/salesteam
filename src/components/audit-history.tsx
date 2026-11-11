import { and, count, desc, eq, inArray, or } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { auditLogs, notDeleted } from "@/db/schema";
import type { AuditModule } from "@/lib/audit";
import { can, isAdmin, type CurrentUser } from "@/lib/auth";
import { loadAuditTableQuery, paginateTable } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";
import { AuditTableFilters, AuditTablePagination } from "./audit-table-controls";
import { AuditTabs } from "./audit-tabs";

export type AuditSearchParams = Record<string, string | string[] | undefined>;

const actionLabels: Record<string, string> = {
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
  login: "Masuk",
  logout: "Keluar",
  change_password: "Ubah kata sandi",
  reset_password: "Reset kata sandi",
  reverse: "Pembalikan",
};

export async function AuditHistoryPage({ user, module, path, title, params, label, map, mapLabel, memberIds = [], tabs }: {
  user: CurrentUser;
  module: AuditModule;
  path: string;
  title: string;
  params: AuditSearchParams;
  label?: string;
  map?: boolean;
  mapLabel?: string;
  memberIds?: number[];
  tabs?: React.ReactNode;
}) {
  if (module !== "profile" && !can(user, module)) return null;

  const { auditQ, auditPage, auditPageSize, auditAction } = loadAuditTableQuery(params);
  const filter = and(
    tableSearch(auditQ, auditLogs.actorName, auditLogs.entityName),
    Object.hasOwn(actionLabels, auditAction) ? eq(auditLogs.action, auditAction) : undefined,
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
  const pagination = paginateTable(totals.total, auditPage, auditPageSize);
  const rows = await db.select({
    id: auditLogs.id,
    actorName: auditLogs.actorName,
    action: auditLogs.action,
    entityId: auditLogs.entityId,
    entityName: auditLogs.entityName,
    createdAt: auditLogs.createdAt,
  }).from(auditLogs).where(filter).orderBy(desc(auditLogs.id))
    .limit(auditPageSize).offset(pagination.offset);

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
      {tabs ?? <AuditTabs path={path} label={label} map={map} mapLabel={mapLabel} />}
      <AuditTableFilters actionLabels={actionLabels} />
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
      <div className="mt-3"><AuditTablePagination pagination={pagination} /></div>
    </div>
  );
}
