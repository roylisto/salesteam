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

import { CreateMemberDialog, MemberDetailDialog } from "./member-dialog";
import type { MemberRow, RoleOption } from "./types";

const STATUS_OPTIONS = ["all", "active", "inactive"] as const;
const PAGE_SIZE = 10;
const ALL_ROLES = "all";

function StatusBadge({ member }: { member: MemberRow }) {
  if (member.isOrganizationOwner) {
    return <Badge variant="secondary">Owner</Badge>;
  }
  return member.isActive ? (
    <Badge variant="outline">Active</Badge>
  ) : (
    <Badge variant="destructive">Inactive</Badge>
  );
}

export function TeamClient({
  members,
  roles,
  currentUserId,
}: {
  members: MemberRow[];
  roles: RoleOption[];
  currentUserId: number;
}) {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [roleFilter, setRoleFilter] = useQueryState(
    "role",
    parseAsString.withDefault(ALL_ROLES),
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

  const selectedRoleName = useMemo(() => {
    if (roleFilter === ALL_ROLES) return "All roles";
    return roles.find((r) => String(r.id) === roleFilter)?.name;
  }, [roles, roleFilter]);

  const selectedStatusName = useMemo(() => {
    if (status === "all") return "All status";
    if (status === "active") return "Active";
    if (status === "inactive") return "Inactive";
    return status;
  }, [status]);

  const selected = useMemo(
    () => members.find((member) => member.id === memberId) ?? null,
    [members, memberId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return members.filter((member) => {
      if (roleFilter !== ALL_ROLES && String(member.roleId) !== roleFilter) {
        return false;
      }
      if (status === "active" && !member.isActive) return false;
      if (status === "inactive" && member.isActive) return false;
      if (needle.length === 0) return true;

      return [member.name, member.email, member.code ?? ""].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [members, query, roleFilter, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-3">
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
          value={roleFilter}
          onValueChange={(value) => {
            void setRoleFilter(value ?? ALL_ROLES);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles">
              {selectedRoleName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROLES}>All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={String(role.id)}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => {
            void setStatus((value as (typeof STATUS_OPTIONS)[number]) ?? "all");
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue>
              {selectedStatusName}
            </SelectValue>
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

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Last active
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No team members match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void setMemberId(member.id)}
                        className="text-left"
                      >
                        <span className="block text-sm font-medium">
                          {member.name}
                        </span>
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
                    <TableCell>
                      <StatusBadge member={member} />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {member.lastLoginAt
                        ? new Date(member.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="hover:bg-muted inline-flex size-7 items-center justify-center rounded-lg transition-colors">
                          <MoreHorizontalIcon className="size-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => void setMemberId(member.id)}
                          >
                            View & edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

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

      <CreateMemberDialog
        open={action === "create"}
        onOpenChange={(open) => void setAction(open ? "create" : null)}
        roles={roles}
      />

      {selected ? (
        <MemberDetailDialog
          key={selected.id}
          member={selected}
          roles={roles}
          currentUserId={currentUserId}
          open
          onOpenChange={(open) => {
            if (!open) void setMemberId(null);
          }}
        />
      ) : null}
    </div>
  );
}
