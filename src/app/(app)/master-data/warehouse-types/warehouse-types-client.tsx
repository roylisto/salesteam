"use client";

import { useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortableHead, useTableSort, type SortColumn } from "@/components/table-sort";
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

const PAGE_SIZE = 10;

const SORT_COLUMNS: SortColumn<WarehouseTypeRow>[] = [
  { key: "name", getValue: (warehouseType) => warehouseType.name },
  { key: "status", getValue: (warehouseType) => (warehouseType.isActive ? 1 : 0) },
  { key: "createdAt", getValue: (warehouseType) => warehouseType.createdAt },
];

export function WarehouseTypesClient({
  warehouseTypes,
}: {
  warehouseTypes: WarehouseTypeRow[];
}) {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [warehouseTypeId, setWarehouseTypeId] = useQueryState(
    "warehouseType",
    parseAsInteger,
  );
  const [action, setAction] = useQueryState(
    "action",
    parseAsStringLiteral(["create"] as const),
  );

  const selected = useMemo(
    () => warehouseTypes.find((item) => item.id === warehouseTypeId) ?? null,
    [warehouseTypes, warehouseTypeId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return warehouseTypes;
    return warehouseTypes.filter((item) => item.name.toLowerCase().includes(needle));
  }, [warehouseTypes, query]);

  const { sortedRows, sortKey, sortDir, toggleSort } = useTableSort(filtered, SORT_COLUMNS);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = sortedRows.slice(start, start + PAGE_SIZE);

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
        <div className="overflow-x-auto">
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
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Tidak ada tipe gudang yang cocok dengan filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((warehouseType) => (
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {sortedRows.length === 0
            ? "Tidak ada hasil"
            : `Menampilkan ${start + 1}–${Math.min(start + PAGE_SIZE, sortedRows.length)} dari ${sortedRows.length}`}
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
