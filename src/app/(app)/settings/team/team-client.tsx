"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, EditIcon, SearchIcon, UserPlusIcon } from "lucide-react";
import {
  parseAsInteger,
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
  useTableSort,
  type SortColumn,
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

import { CreateMemberDialog, MemberDetailDialog } from "./member-dialog";
import type {
  AreaOption,
  MemberRow,
  RoleOption,
  WarehouseOption,
} from "./types";

const STATUS_OPTIONS = ["all", "active", "inactive"] as const;
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak aktif" },
];
const PAGE_SIZE = 10;

const SORT_COLUMNS: SortColumn<MemberRow>[] = [
  { key: "name", getValue: (member) => member.name },
  { key: "type", getValue: (member) => (member.userType === "sales" ? "Sales" : "Back Office") },
  { key: "role", getValue: (member) => member.roleName ?? null },
  { key: "reportsTo", getValue: (member) => member.reportsToName ?? null },
  {
    key: "area",
    getValue: (member) =>
      member.areaNames.length > 0 ? member.areaNames.join(", ") : null,
  },
  { key: "status", getValue: (member) => (member.isActive ? 1 : 0) },
];

type TabValue = string;
const ALL_TAB = "all";
const HIERARCHY_TAB = "hierarchy";
const BACK_OFFICE_TAB = "back_office";
const SALES_TAB = "sales";

function StatusBadge({ member }: { member: MemberRow }) {
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

function typeTabOf(member: MemberRow): string {
  return member.userType === "sales" ? SALES_TAB : BACK_OFFICE_TAB;
}

// Indirection via module-level map keeps the recursive tree simple.
let childrenByParent: Map<number | null, MemberRow[]> = new Map();
let memberById: Map<number, MemberRow> = new Map();

function HierarchyBranch({
  memberId,
  depth,
  expandedIds,
  onToggle,
  onSelect,
}: {
  memberId: number;
  depth: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelect: (id: number) => void;
}) {
  const member = memberById.get(memberId);
  if (!member) return null;

  const children = childrenByParent.get(memberId) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(memberId);

  return (
    <div className={depth > 0 ? "ml-4 border-l pl-4 sm:ml-6" : ""}>
      <div className="hover:border-foreground/20 flex w-full items-center gap-1 rounded-xl border bg-card p-1.5 shadow-xs transition-colors">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(memberId)}
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
        <button
          type="button"
          onClick={() => onSelect(member.id)}
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
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <HierarchyBranch
              key={child.id}
              memberId={child.id}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MemberTable({
  rows,
  onSelect,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: MemberRow[];
  onSelect: (id: number) => void;
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
                className="w-[28%] min-w-[220px]"
              />
              <SortableHead
                label="Tipe"
                columnKey="type"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[12%] md:table-cell"
              />
              <SortableHead
                label="Peran"
                columnKey="role"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[16%] lg:table-cell"
              />
              <SortableHead
                label="Atasan"
                columnKey="reportsTo"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[14%] xl:table-cell"
              />
              <SortableHead
                label="Area"
                columnKey="area"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                className="hidden w-[18%] 2xl:table-cell"
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
                  <button
                    type="button"
                    onClick={() => onSelect(member.id)}
                    className="text-left"
                  >
                    <span className="block truncate text-sm font-medium">{member.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {member.email}
                    </span>
                  </button>
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
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onSelect(member.id)}
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

export function TeamClient({
  members,
  roles,
  areas,
  warehouses,
  assignableAreas,
  currentUserId,
  isAdmin,
}: {
  members: MemberRow[];
  roles: RoleOption[];
  areas: AreaOption[];
  warehouses: WarehouseOption[];
  assignableAreas: AreaOption[];
  currentUserId: number;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault(ALL_TAB));
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(STATUS_OPTIONS).withDefault("all"),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [memberId, setMemberId] = useQueryState("user", parseAsInteger);
  const [action, setAction] = useQueryState(
    "action",
    parseAsStringLiteral(["create"] as const),
  );

  const tabs = useMemo(() => {
    const list: { value: string; label: string; count: number }[] = [
      { value: ALL_TAB, label: "Semua", count: members.length },
      { value: HIERARCHY_TAB, label: "Struktur Organisasi", count: members.length },
      {
        value: BACK_OFFICE_TAB,
        label: "Back Office",
        count: members.filter((m) => (m.userType ?? "back_office") === "back_office").length,
      },
      {
        value: SALES_TAB,
        label: "Sales",
        count: members.filter((m) => m.userType === "sales").length,
      },
    ];
    return list;
  }, [members]);

  const activeTab: TabValue = tabs.some((t) => t.value === tab) ? tab : ALL_TAB;

  const selected = useMemo(
    () => members.find((member) => member.id === memberId) ?? null,
    [members, memberId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (activeTab !== ALL_TAB && activeTab !== HIERARCHY_TAB && typeTabOf(member) !== activeTab) {
        return false;
      }
      if (status === "active" && !member.isActive) return false;
      if (status === "inactive" && member.isActive) return false;
      if (needle.length === 0) return true;
      return [member.name, member.email, member.code ?? ""].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [members, query, status, activeTab]);

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filtered, SORT_COLUMNS);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = sortedRows.slice(start, start + PAGE_SIZE);

  const grouped = useMemo(() => {
    if (activeTab !== ALL_TAB) return null;
    const groups: { key: string; label: string; rows: MemberRow[] }[] = [];
    const backOfficeRows = visible.filter((m) => (m.userType ?? "back_office") === "back_office");
    if (backOfficeRows.length > 0) groups.push({ key: BACK_OFFICE_TAB, label: "Back Office", rows: backOfficeRows });
    const salesRows = visible.filter((m) => m.userType === "sales");
    if (salesRows.length > 0) groups.push({ key: SALES_TAB, label: "Sales", rows: salesRows });
    return groups;
  }, [visible, activeTab]);

  const roots = useMemo(() => {
    const ids = new Set(members.map((m) => m.id));
    const byParent = new Map<number | null, MemberRow[]>();
    const byId = new Map<number, MemberRow>();
    for (const member of members) {
      byId.set(member.id, member);
      const parent = member.reportsTo !== null && ids.has(member.reportsTo) ? member.reportsTo : null;
      const list = byParent.get(parent) ?? [];
      list.push(member);
      byParent.set(parent, list);
    }
    childrenByParent = byParent;
    memberById = byId;
    return byParent.get(null) ?? [];
  }, [members]);

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
    <div className="space-y-3">
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
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => {
              void setQuery(event.target.value);
              void setPage(1);
            }}
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

        <Button onClick={() => void setAction("create")}>
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
                memberId={root.id}
                depth={0}
                expandedIds={expandedIds}
                onToggle={toggleNode}
                onSelect={(id) => void setMemberId(id)}
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
                  onSelect={(id) => void setMemberId(id)}
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
          rows={visible}
          onSelect={(id) => void setMemberId(id)}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
        />
      )}

      {activeTab !== HIERARCHY_TAB && !(activeTab === ALL_TAB && grouped) ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            {filtered.length === 0
              ? "Tidak ada hasil"
              : `Menampilkan ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} dari ${filtered.length}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => void setPage(currentPage - 1)}
            >
              <ChevronLeftIcon />
              Sebelumnya
            </Button>
            <span className="text-muted-foreground text-xs tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => void setPage(currentPage + 1)}
            >
              Berikutnya
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      ) : null}

      <CreateMemberDialog
        open={action === "create"}
        onOpenChange={(open) => void setAction(open ? "create" : null)}
        roles={roles}
        areas={areas}
        warehouses={warehouses}
        assignableAreas={assignableAreas}
        members={members}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />

      {selected ? (
        <MemberDetailDialog
          key={selected.id}
          member={selected}
          roles={roles}
          areas={areas}
          warehouses={warehouses}
          assignableAreas={assignableAreas}
          members={members}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          open
          onOpenChange={(open) => {
            if (!open) void setMemberId(null);
          }}
        />
      ) : null}
    </div>
  );
}
