"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRightIcon, EditIcon, SearchIcon, UserPlusIcon } from "lucide-react";
import {
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  SortableHead,
  type SortDirection,
} from "@/components/table-sort";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import type { TablePagination } from "@/lib/table-query";
import type { MemberListRow, MemberRow } from "./types";

const STATUS_OPTIONS = ["all", "active", "inactive"] as const;
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak aktif" },
];
const ALL_TAB = "all";
const HIERARCHY_TAB = "hierarchy";
const BACK_OFFICE_TAB = "back_office";
const SALES_TAB = "sales";

function StatusBadge({ member }: { member: MemberListRow }) {
  if (member.isOrganizationOwner) {
    return <Badge variant="secondary">Pemilik</Badge>;
  }
  if (member.isAdmin) {
    return <Badge variant="secondary">Admin</Badge>;
  }
  return member.isActive ? (
    <Badge variant="outline">Aktif</Badge>
  ) : (
    <Badge variant="destructive">Tidak aktif</Badge>
  );
}

function UserTypeBadge({ userType }: { userType: MemberRow["userType"] }) {
  if (userType === "sales") {
    return <Badge variant="outline">Sales</Badge>;
  }
  return <Badge variant="secondary">Back Office</Badge>;
}

function HierarchyBranch({
  member,
  childrenByParent,
  depth,
  expandedIds,
  onToggle,
}: {
  member: MemberRow;
  childrenByParent: Map<number | null, MemberRow[]>;
  depth: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const children = childrenByParent.get(member.id) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(member.id);

  return (
    <div className={depth > 0 ? "ml-4 border-l pl-4 sm:ml-6" : ""}>
      <div className="hover:border-foreground/20 flex w-full items-center gap-1 rounded-xl border bg-card p-1.5 shadow-xs transition-colors">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(member.id)}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? `Tutup bawahan ${member.name}`
                : `Buka bawahan ${member.name}`
            }
            className="text-muted-foreground hover:bg-accent flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <ChevronRightIcon
              className={cn("size-4 transition-transform", isExpanded && "rotate-90")}
            />
          </button>
        ) : (
          <span aria-hidden className="size-7 shrink-0" />
        )}
        <Link
          href={`/settings/team/${member.id}`}
          className="flex-1 rounded-lg px-2 py-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{member.name}</span>
            <Badge variant="secondary">{member.roleName ?? "Belum ditugaskan"}</Badge>
            {member.isOrganizationOwner ? <Badge variant="outline">Pemilik</Badge> : null}
          </span>
          <span className="text-muted-foreground mt-1 block text-xs">
            {member.areaNames.length > 0
              ? member.areaNames.join(" · ")
              : "Belum ada area yang ditugaskan"}
            {hasChildren ? ` · ${children.length} bawahan langsung` : ""}
          </span>
        </Link>
      </div>
      {hasChildren && isExpanded ? (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <HierarchyBranch
              key={child.id}
              member={child}
              childrenByParent={childrenByParent}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MemberTable({
  rows,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: MemberListRow[];
  sortKey: string | null;
  sortDir: SortDirection | null;
  onSort: (key: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
        Belum ada anggota tim di sini.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="overflow-x-auto">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Anggota"
                columnKey="name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="w-[26%] min-w-[220px]"
              />
              <SortableHead
                label="Kode pegawai"
                columnKey="code"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[10%] md:table-cell"
              />
              <SortableHead
                label="Tipe"
                columnKey="type"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[11%] md:table-cell"
              />
              <SortableHead
                label="Peran"
                columnKey="role"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[15%] lg:table-cell"
              />
              <SortableHead
                label="Atasan"
                columnKey="reportsTo"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[13%] xl:table-cell"
              />
              <SortableHead
                label="Area"
                columnKey="area"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[13%] 2xl:table-cell"
              />
              <SortableHead
                label="Status"
                columnKey="status"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="w-[12%] whitespace-nowrap"
              />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <Link
                    href={`/settings/team/${member.id}`}
                    className="block text-left"
                  >
                    <span className="block truncate text-sm font-medium">{member.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {member.email}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground hidden truncate text-xs md:table-cell">
                  {member.code ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <UserTypeBadge userType={member.userType} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="block truncate">
                    {member.roleName ?? (
                      <span className="text-muted-foreground">Belum ditugaskan</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <span className="block truncate">
                    {member.reportsToName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  {member.areaNames.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {member.areaNames.slice(0, 3).map((area) => (
                        <Badge key={area} variant="outline">
                          {area}
                        </Badge>
                      ))}
                      {member.areaNames.length > 3 ? (
                        <Badge variant="ghost">+{member.areaNames.length - 3}</Badge>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Tanpa area</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge member={member} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    render={<Link href={`/settings/team/${member.id}`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Ubah anggota"
                  >
                    <EditIcon className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function TeamClient({ members, hierarchyMembers, pagination, counts }: {
  members: MemberListRow[];
  hierarchyMembers?: MemberRow[];
  pagination: TablePagination;
  counts: { backOffice: number; sales: number };
}) {
  const { q, setQuery, setPage, setPageSize, sortKey, sortDir, toggleSort, pending, startTransition } = useServerTable();
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault(ALL_TAB).withOptions({ shallow: false, startTransition }));
  const [status, setStatus] = useQueryState("status", parseAsStringLiteral(STATUS_OPTIONS).withDefault("all").withOptions({ shallow: false, startTransition }));
  const totalMembers = counts.backOffice + counts.sales;
  const tabs = [
    { value: ALL_TAB, label: "Semua", count: totalMembers },
    { value: HIERARCHY_TAB, label: "Struktur Organisasi", count: totalMembers },
    { value: BACK_OFFICE_TAB, label: "Back Office", count: counts.backOffice },
    { value: SALES_TAB, label: "Sales", count: counts.sales },
  ];
  const activeTab = tabs.some((item) => item.value === tab) ? tab : ALL_TAB;

  const grouped = useMemo(() => {
    if (activeTab !== ALL_TAB) return null;
    const groups: { key: string; label: string; rows: MemberListRow[] }[] = [];
    const backOfficeRows = members.filter((m) => (m.userType ?? "back_office") === "back_office");
    if (backOfficeRows.length > 0) groups.push({ key: BACK_OFFICE_TAB, label: "Back Office", rows: backOfficeRows });
    const salesRows = members.filter((m) => m.userType === "sales");
    if (salesRows.length > 0) groups.push({ key: SALES_TAB, label: "Sales", rows: salesRows });
    return groups;
  }, [members, activeTab]);

  const childrenByParent = useMemo(() => {
    const ids = new Set(hierarchyMembers?.map((member) => member.id));
    const byParent = new Map<number | null, MemberRow[]>();
    for (const member of hierarchyMembers ?? []) {
      const parent = member.reportsTo !== null && ids.has(member.reportsTo) ? member.reportsTo : null;
      const children = byParent.get(parent) ?? [];
      children.push(member);
      byParent.set(parent, children);
    }
    return byParent;
  }, [hierarchyMembers]);
  const roots = childrenByParent.get(null) ?? [];

  // Root members start expanded so the top level of the structure is visible;
  // deeper levels stay collapsed to keep the page compact.
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set(roots.map((root) => root.id)),
  );

  function toggleNode(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3" aria-busy={pending}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          void setTab(value ?? ALL_TAB);
          void setPage(1);
        }}
      >
        <TabsList className="max-w-full flex-wrap">
          {tabs.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-sm"
            >
              {item.label}
              <span
                className="ml-1 text-xs tabular-nums"
                style={{ color: activeTab === item.value ? "#fff" : undefined }}
              >
                {item.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        {activeTab !== HIERARCHY_TAB && <>
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari berdasarkan nama, email, atau kode pegawai"
            className="pl-8"
          />
        </div>

        <Combobox
          options={STATUS_FILTER_OPTIONS}
          value={status}
          onValueChange={(value) => {
            void setStatus((value || "all") as (typeof STATUS_OPTIONS)[number]);
            void setPage(1);
          }}
          placeholder="Semua status"
          emptyText="Status tidak ditemukan."
          className="w-36"
        />

        </>}

        <Button
          render={<Link href="/settings/team/new" />}
          nativeButton={false}
        >
          <UserPlusIcon />
          Tambah anggota
        </Button>
      </div>

      {activeTab === HIERARCHY_TAB ? (
        <div className="space-y-2">
          {roots.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
              Belum ada garis atasan. Ubah anggota untuk menetapkan atasan mereka.
            </p>
          ) : (
            roots.map((root) => (
              <HierarchyBranch
                key={root.id}
                member={root}
                childrenByParent={childrenByParent}
                depth={0}
                expandedIds={expandedIds}
                onToggle={toggleNode}
              />
            ))
          )}
        </div>
      ) : activeTab === ALL_TAB && grouped ? (
        <div className="space-y-4">
          {grouped.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
              Tidak ada anggota tim yang cocok dengan filter ini.
            </p>
          ) : (
            grouped.map((group) => (
              <section key={group.key} className="space-y-2">
                <h2 className="text-sm font-semibold">
                  {group.label}
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    {group.rows.length} anggota
                  </span>
                </h2>
                <MemberTable
                  rows={group.rows}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
              </section>
            ))
          )}
        </div>
      ) : (
        <MemberTable
          rows={members}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
        />
      )}

      {activeTab !== HIERARCHY_TAB && (
        <ServerTablePagination pagination={pagination} pending={pending} onPage={setPage} onPageSize={setPageSize} />
      )}
    </div>
  );
}
