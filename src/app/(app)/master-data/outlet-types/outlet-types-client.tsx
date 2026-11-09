"use client";

import {
  EditIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import type { TablePagination } from "@/lib/table-query";
import { SortableHead } from "@/components/table-sort";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { OutletTypeSymbol } from "@/components/outlet-type-symbol";
import { OutletTypeDialog } from "./outlet-type-dialog";
import type { OutletTypeRow } from "./types";

export function OutletTypesClient({ outletTypes, pagination, selectedRow }: {
  outletTypes: OutletTypeRow[];
  pagination: TablePagination;
  selectedRow: OutletTypeRow | null;
}) {
  const { q, setQuery, setPage, setPageSize, sortKey, sortDir, toggleSort, pending, startTransition } = useServerTable();
  const [outletTypeId, setOutletTypeId] = useQueryState(
    "outletType",
    parseAsInteger.withOptions({ shallow: false, startTransition }));
  const [action, setAction] = useQueryState(
    "action",
    parseAsStringLiteral(["create"] as const),
  );

  const selected = selectedRow?.id === outletTypeId ? selectedRow : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari tipe outlet berdasarkan nama"
            className="pl-8"
          />
        </div>

        <Button onClick={() => void setAction("create")}>
          <PlusIcon />
          Tipe outlet baru
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto" aria-busy={pending}>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Tipe outlet"
                  columnKey="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Status"
                  columnKey="status"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Dibuat"
                  columnKey="createdAt"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="hidden lg:table-cell"
                />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {outletTypes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Tidak ada tipe outlet yang cocok dengan filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                outletTypes.map((outletType) => (
                  <TableRow key={outletType.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void setOutletTypeId(outletType.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <OutletTypeSymbol icon={outletType.icon} color={outletType.color} />
                        <span className="block text-sm font-medium">
                          {outletType.name}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={outletType.isActive ? "secondary" : "outline"}>
                        {outletType.isActive ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {new Date(outletType.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => void setOutletTypeId(outletType.id)}
                        aria-label="Ubah tipe outlet"
                      >
                        <EditIcon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ServerTablePagination pagination={pagination} pending={pending} onPage={setPage} onPageSize={setPageSize} />

      <OutletTypeDialog
        outletType={null}
        open={action === "create"}
        onOpenChange={(open) => void setAction(open ? "create" : null)}
      />

      {selected ? (
        <OutletTypeDialog
          key={selected.id}
          outletType={selected}
          open
          onOpenChange={(open) => {
            if (!open) void setOutletTypeId(null);
          }}
        />
      ) : null}
    </div>
  );
}
