"use client";

import { PencilIcon, PlusIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import {
  parseAsInteger,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";

import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import { Input } from "@/components/ui/input";
import type { TablePagination } from "@/lib/table-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { permissionLabel } from "@/lib/permissions";

import { RoleDialog } from "./role-dialog";
import type { RoleDetail } from "./types";

export function RolesClient({ roles, pagination, selectedRow }: {
  roles: RoleDetail[];
  pagination: TablePagination;
  selectedRow: RoleDetail | null;
}) {
  const { q, setQuery, setPage, setPageSize, pending, startTransition } = useServerTable();
  const [roleId, setRoleId] = useQueryState("role", parseAsInteger.withOptions({ shallow: false, startTransition }));
  const [action, setAction] = useQueryState(
    "action",
    parseAsStringLiteral(["create"] as const),
  );

  const selected = selectedRow?.id === roleId ? selectedRow : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input aria-label="Cari peran" placeholder="Cari peran berdasarkan nama atau deskripsi" className="max-w-sm"
          value={q} onChange={(event) => setQuery(event.target.value)} />
        <Button onClick={() => void setAction("create")}>
          <PlusIcon />
          Peran baru
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} size="sm" className="transition-shadow hover:shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="text-muted-foreground size-4" />
                {role.name}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {role.description ?? "Tanpa deskripsi"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1">
                  <UsersIcon className="size-3.5" />
                  {role.memberCount} anggota
                </span>
                <span>
                  {role.permissions.length} modul
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 4).map((key) => (
                  <Badge key={key} variant="secondary">
                    {permissionLabel(key)}
                  </Badge>
                ))}
                {role.permissions.length > 4 ? (
                  <Badge variant="ghost">
                    +{role.permissions.length - 4}
                  </Badge>
                ) : null}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void setRoleId(role.id)}
              >
                <PencilIcon />
                Ubah peran
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ServerTablePagination pagination={pagination} pending={pending} onPage={setPage} onPageSize={setPageSize} />

      <RoleDialog
        open={action === "create"}
        role={null}
        onOpenChange={(open) => void setAction(open ? "create" : null)}
      />

      {selected ? (
        <RoleDialog
          key={selected.id}
          role={selected}
          open
          onOpenChange={(open) => {
            if (!open) void setRoleId(null);
          }}
        />
      ) : null}
    </div>
  );
}
