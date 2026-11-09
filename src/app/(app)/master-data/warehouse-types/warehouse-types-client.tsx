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

import { WarehouseTypeDialog } from "./warehouse-type-dialog";
import { WarehouseTypeSymbol } from "@/components/warehouse-type-symbol";
import type { WarehouseTypeRow } from "./types";

export function WarehouseTypesClient({ warehouseTypes, pagination, selectedRow }: {
  warehouseTypes: WarehouseTypeRow[];
  pagination: TablePagination;
  selectedRow: WarehouseTypeRow | null;
}) {
  const { q, setQuery, setPage, setPageSize, sortKey, sortDir, toggleSort, pending, startTransition } = useServerTable();
  const [warehouseTypeId, setWarehouseTypeId] = useQueryState(
    "warehouseType",
    parseAsInteger.withOptions({ shallow: false, startTransition }));
  const [action, setAction] = useQueryState(
    "action",
    parseAsStringLiteral(["create"] as const),
  );

  const selected = selectedRow?.id === warehouseTypeId ? selectedRow : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari tipe gudang berdasarkan nama"
            className="pl-8"
          />
        </div>

        <Button onClick={() => void setAction("create")}>
          <PlusIcon />
          Tipe gudang baru
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto" aria-busy={pending}>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Tipe gudang"
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
              {warehouseTypes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Tidak ada tipe gudang yang cocok dengan filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                warehouseTypes.map((warehouseType) => (
                  <TableRow key={warehouseType.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void setWarehouseTypeId(warehouseType.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <WarehouseTypeSymbol icon={warehouseType.icon} color={warehouseType.color} />
                        <span className="block text-sm font-medium">
                          {warehouseType.name}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouseType.isActive ? "secondary" : "outline"}>
                        {warehouseType.isActive ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {new Date(warehouseType.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => void setWarehouseTypeId(warehouseType.id)}
                        aria-label="Ubah tipe gudang"
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

      <WarehouseTypeDialog
        warehouseType={null}
        open={action === "create"}
        onOpenChange={(open) => void setAction(open ? "create" : null)}
      />

      {selected ? (
        <WarehouseTypeDialog
          key={selected.id}
          warehouseType={selected}
          open
          onOpenChange={(open) => {
            if (!open) void setWarehouseTypeId(null);
          }}
        />
      ) : null}
    </div>
  );
}
