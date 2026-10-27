"use client";

import { useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  SearchIcon,
  UserPlusIcon,
} from "lucide-react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
const PAGE_SIZE = 10;

type TabValue = string;
const ALL_TAB = "all";
const HIERARCHY_TAB = "hierarchy";
const ADMIN_TAB = "admin";
const UNASSIGNED_TAB = "unassigned";

function StatusBadge({ member }: { member: MemberRow }) {
  if (member.isOrganizationOwner) {
    return <Badge variant="secondary">Owner</Badge>;
  }
  if (member.isAdmin) {
    return <Badge variant="secondary">Admin</Badge>;
  }
  return member.isActive ? (
    <Badge variant="outline">Active</Badge>
  ) : (
    <Badge variant="destructive">Inactive</Badge>
  );
}

function roleTabOf(member: MemberRow): string {
  if (member.isOrganizationOwner || member.isAdmin) return ADMIN_TAB;
  if (member.roleId === null) return UNASSIGNED_TAB;
  return `role-${member.roleId}`;
}

function HierarchyNode({
  member,
  children,
  depth,
  onSelect,
}: {
  member: MemberRow;
  children: MemberRow[];
  depth: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className={depth > 0 ? "ml-4 border-l pl-4 sm:ml-6" : ""}>
      <button
        type="button"
        onClick={() => onSelect(member.id)}
        className="hover:border-foreground/20 w-full rounded-xl border bg-card p-3 text-left shadow-xs transition-colors"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{member.name}</span>
          <Badge variant="secondary">{member.roleName ?? "Unassigned"}</Badge>
          {member.isOrganizationOwner ? <Badge variant="outline">Owner</Badge> : null}
        </span>
        <span className="text-muted-foreground mt-1 block text-xs">
          {member.areaNames.length > 0
            ? member.areaNames.join(" · ")
            : "No areas assigned"}
          {children.length > 0
            ? ` · ${children.length} direct report${children.length === 1 ? "" : "s"}`
            : ""}
        </span>
      </button>
      {children.length > 0 ? (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <HierarchyBranch
              key={child.id}
              memberId={child.id}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Indirection via module-level map keeps the recursive tree simple.
let childrenByParent: Map<number | null, MemberRow[]> = new Map();
let memberById: Map<number, MemberRow> = new Map();

function HierarchyBranch({
  memberId,
  depth,
  onSelect,
}: {
  memberId: number;
  depth: number;
  onSelect: (id: number) => void;
}) {
  const member = memberById.get(memberId);
  if (!member) return null;
  return (
    <HierarchyNode
      member={member}
      children={childrenByParent.get(memberId) ?? []}
      depth={depth}
      onSelect={onSelect}
    />
  );
}

function MemberTable({
  rows,
  onSelect,
}: {
  rows: MemberRow[];
  onSelect: (id: number) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
        No team members here yet.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="hidden md:table-cell">Role</TableHead>
              <TableHead className="hidden lg:table-cell">Reports to</TableHead>
              <TableHead className="hidden xl:table-cell">Areas</TableHead>
              <TableHead>Status</TableHead>
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
                    <span className="block text-sm font-medium">{member.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      {member.email}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {member.roleName ?? (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {member.reportsToName ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden max-w-56 xl:table-cell">
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
                    <span className="text-muted-foreground text-xs">No areas</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge member={member} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="hover:bg-muted inline-flex size-7 items-center justify-center rounded-lg transition-colors">
                      <MoreHorizontalIcon className="size-4" />
                      <span className="sr-only">Actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelect(member.id)}>
                        View & edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
      { value: ALL_TAB, label: "All", count: members.length },
      { value: HIERARCHY_TAB, label: "Hierarchy", count: members.length },
      {
        value: ADMIN_TAB,
        label: "Admin",
        count: members.filter((m) => roleTabOf(m) === ADMIN_TAB).length,
      },
      ...roles.map((role) => ({
        value: `role-${role.id}`,
        label: role.name,
        count: members.filter((m) => m.roleId === role.id && !m.isAdmin && !m.isOrganizationOwner)
          .length,
      })),
    ];
    if (members.some((m) => roleTabOf(m) === UNASSIGNED_TAB)) {
      list.push({
        value: UNASSIGNED_TAB,
        label: "Unassigned",
        count: members.filter((m) => roleTabOf(m) === UNASSIGNED_TAB).length,
      });
    }
    return list;
  }, [members, roles]);

  const activeTab: TabValue = tabs.some((t) => t.value === tab) ? tab : ALL_TAB;

  const selected = useMemo(
    () => members.find((member) => member.id === memberId) ?? null,
    [members, memberId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (activeTab !== ALL_TAB && activeTab !== HIERARCHY_TAB && roleTabOf(member) !== activeTab) {
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const grouped = useMemo(() => {
    if (activeTab !== ALL_TAB) return null;
    const groups: { key: string; label: string; rows: MemberRow[] }[] = [];
    const adminRows = visible.filter((m) => roleTabOf(m) === ADMIN_TAB);
    if (adminRows.length > 0) groups.push({ key: ADMIN_TAB, label: "Admin", rows: adminRows });
    for (const role of roles) {
      const rows = visible.filter(
        (m) => m.roleId === role.id && !m.isAdmin && !m.isOrganizationOwner,
      );
      if (rows.length > 0) groups.push({ key: `role-${role.id}`, label: role.name, rows });
    }
    const unassigned = visible.filter((m) => roleTabOf(m) === UNASSIGNED_TAB);
    if (unassigned.length > 0) {
      groups.push({ key: UNASSIGNED_TAB, label: "Unassigned", rows: unassigned });
    }
    return groups;
  }, [visible, roles, activeTab]);

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

  const selectedStatusName =
    status === "all" ? "All status" : status === "active" ? "Active" : "Inactive";

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
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
              <span className="text-muted-foreground text-xs tabular-nums">
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
            placeholder="Search by name, email or staff code"
            className="pl-8"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            void setStatus((value as (typeof STATUS_OPTIONS)[number]) ?? "all");
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue>{selectedStatusName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => void setAction("create")}>
          <UserPlusIcon />
          Add member
        </Button>
      </div>

      {activeTab === HIERARCHY_TAB ? (
        <div className="space-y-2">
          {roots.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
              No reporting lines yet. Edit a member to assign who they report to.
            </p>
          ) : (
            roots.map((root) => (
              <HierarchyNode
                key={root.id}
                member={root}
                children={childrenByParent.get(root.id) ?? []}
                depth={0}
                onSelect={(id) => void setMemberId(id)}
              />
            ))
          )}
        </div>
      ) : activeTab === ALL_TAB && grouped ? (
        <div className="space-y-4">
          {grouped.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
              No team members match these filters.
            </p>
          ) : (
            grouped.map((group) => (
              <section key={group.key} className="space-y-2">
                <h2 className="text-sm font-semibold">
                  {group.label}
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    {group.rows.length} member{group.rows.length === 1 ? "" : "s"}
                  </span>
                </h2>
                <MemberTable rows={group.rows} onSelect={(id) => void setMemberId(id)} />
              </section>
            ))
          )}
        </div>
      ) : (
        <MemberTable rows={visible} onSelect={(id) => void setMemberId(id)} />
      )}

      {activeTab !== HIERARCHY_TAB && !(activeTab === ALL_TAB && grouped) ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            {filtered.length === 0
              ? "No results"
              : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => void setPage(currentPage - 1)}
            >
              <ChevronLeftIcon />
              Previous
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
              Next
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
