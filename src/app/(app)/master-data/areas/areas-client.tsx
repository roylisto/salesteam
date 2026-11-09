"use client";

import {
  EditIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";

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

import { AreaDialog } from "./area-dialog";
import type { AreaRow } from "./types";

export function AreasClient({ areas, pagination, selectedRow }: {
  areas: AreaRow[];
  pagination: TablePagination;
  selectedRow: AreaRow | null;
}) {
  const { q, setQuery, setPage, setPageSize, sortKey, sortDir, toggleSort, pending, startTransition } = useServerTable();
  const [areaId, setAreaId] = useQueryState("area", parseAsInteger.withOptions({ shallow: false, startTransition }));
  const [action, setAction] = useQueryState(
    "action",
    parseAsStringLiteral(["create"] as const),
  );

  const selected = selectedRow?.id === areaId ? selectedRow : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari area berdasarkan nama"
            className="pl-8"
          />
        </div>

        <Button onClick={() => void setAction("create")}>
          <PlusIcon />
          Area baru
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto" aria-busy={pending}>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Area"
                  columnKey="name"
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
              {areas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Tidak ada area yang cocok dengan filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void setAreaId(area.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <MapPinIcon className="text-muted-foreground size-4 shrink-0" />
                        <span className="block text-sm font-medium">
                          {area.name}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {new Date(area.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => void setAreaId(area.id)}
                        aria-label="Ubah area"
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

      <AreaDialog
        area={null}
        open={action === "create"}
        onOpenChange={(open) => void setAction(open ? "create" : null)}
      />

      {selected ? (
        <AreaDialog
          key={selected.id}
          area={selected}
          open
          onOpenChange={(open) => {
            if (!open) void setAreaId(null);
          }}
        />
      ) : null}
    </div>
  );
}
