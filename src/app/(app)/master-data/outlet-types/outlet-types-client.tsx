"use client";

import { useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
  TagsIcon,
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

import { OutletTypeDialog } from "./outlet-type-dialog";
import type { OutletTypeRow } from "./types";

const PAGE_SIZE = 10;

const SORT_COLUMNS: SortColumn<OutletTypeRow>[] = [
  { key: "name", getValue: (outletType) => outletType.name },
  { key: "status", getValue: (outletType) => (outletType.isActive ? 1 : 0) },
  { key: "createdAt", getValue: (outletType) => outletType.createdAt },
];

export function OutletTypesClient({
  outletTypes,
}: {
  outletTypes: OutletTypeRow[];
}) {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [outletTypeId, setOutletTypeId] = useQueryState(
    "outletType",
    parseAsInteger,
  );
  const [action, setAction] = useQueryState(
    "action",
    parseAsStringLiteral(["create"] as const),
  );

  const selected = useMemo(
    () => outletTypes.find((outletType) => outletType.id === outletTypeId) ?? null,
    [outletTypes, outletTypeId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return outletTypes;
    return outletTypes.filter((outletType) =>
      outletType.name.toLowerCase().includes(needle),
    );
  }, [outletTypes, query]);

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
        <div className="overflow-x-auto">
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
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Tidak ada tipe outlet yang cocok dengan filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((outletType) => (
                  <TableRow key={outletType.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void setOutletTypeId(outletType.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <TagsIcon className="text-muted-foreground size-4 shrink-0" />
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
