"use client";

import { useMemo, useState } from "react";
import { useProgressTransition } from "@/components/action-progress";
import Link from "next/link";
import Image from "next/image";
import { OutletTypeSymbol } from "@/components/outlet-type-symbol";
import { DEFAULT_OUTLET_ICON, DEFAULT_OUTLET_COLOR } from "@/lib/outlet-appearance";
import { EditIcon, PlusIcon, SearchIcon } from "lucide-react";
import { debounce, useQueryStates } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ServerTablePagination } from "@/components/server-table-pagination";
import type { PageSize, TablePagination } from "@/lib/table-query";
import { SortableHead } from "@/components/table-sort";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ALL_WAREHOUSES, NO_WAREHOUSE, outletListParsers } from "./list-query";
import type { OutletListRow, WarehouseOption } from "./types";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak aktif" },
];

function OutletThumbnail({ outlet }: { outlet: OutletListRow }) {
  const [failed, setFailed] = useState(false);
  if (outlet.thumbnailSrc && !failed) {
    return (
      <Image
        src={outlet.thumbnailSrc}
        alt=""
        width={40}
        height={40}
        unoptimized
        loading="lazy"
        className="size-10 shrink-0 rounded-lg object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <OutletTypeSymbol
      icon={outlet.outletTypeIcon ?? DEFAULT_OUTLET_ICON}
      color={outlet.outletTypeColor ?? DEFAULT_OUTLET_COLOR}
      className="size-10"
    />
  );
}

export function OutletsClient({
  outlets,
  warehouses,
  pagination,
}: {
  outlets: OutletListRow[];
  warehouses: WarehouseOption[];
  pagination: TablePagination;
}) {
  const [pending, startTransition] = useProgressTransition();
  const [{ q, warehouse, status, sort, dir }, setQuery] = useQueryStates(outletListParsers, {
    shallow: false,
    startTransition,
  });
  const setPage = (page: number) => void setQuery({ page });
  const setPageSize = (pageSize: PageSize) => void setQuery({ pageSize, page: 1 });

  function toggleSort(key: string) {
    if (key !== "name" && key !== "type" && key !== "warehouse" && key !== "status") return;
    void setQuery({ sort: key, dir: sort === key && dir === "asc" ? "desc" : "asc", page: 1 });
  }

  const warehouseFilterOptions = useMemo(
    () => [
      { value: ALL_WAREHOUSES, label: "Semua gudang" },
      { value: NO_WAREHOUSE, label: "Tanpa gudang" },
      ...warehouses.map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name,
      })),
    ],
    [warehouses],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(event) => {
              void setQuery({ q: event.target.value, page: 1 }, { limitUrlUpdates: debounce(300) });
            }}
            placeholder="Cari outlet berdasarkan nama atau kode"
            className="pl-8"
          />
        </div>

        <Combobox
          options={warehouseFilterOptions}
          value={warehouse}
          onValueChange={(value) => {
            void setQuery({ warehouse: value || ALL_WAREHOUSES, page: 1 });
          }}
          placeholder="Semua gudang"
          emptyText="Gudang tidak ditemukan."
          className="w-44"
        />

        <Combobox
          options={STATUS_FILTER_OPTIONS}
          value={status}
          onValueChange={(value) => {
            void setQuery({ status: value === "active" || value === "inactive" ? value : "all", page: 1 });
          }}
          placeholder="Semua status"
          emptyText="Status tidak ditemukan."
          className="w-36"
        />

        <Button
          render={
            <Link
              href="/master-data/outlets/new"
            />
          }
          nativeButton={false}
        >
          <PlusIcon />
          Outlet baru
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto" aria-busy={pending}>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Outlet"
                  columnKey="name"
                  sortKey={sort}
                  sortDir={dir}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Tipe"
                  columnKey="type"
                  sortKey={sort}
                  sortDir={dir}
                  onSort={toggleSort}
                  className="hidden md:table-cell"
                />
                <SortableHead
                  label="Gudang"
                  columnKey="warehouse"
                  sortKey={sort}
                  sortDir={dir}
                  onSort={toggleSort}
                  className="hidden lg:table-cell"
                />
                <SortableHead
                  label="Status"
                  columnKey="status"
                  sortKey={sort}
                  sortDir={dir}
                  onSort={toggleSort}
                />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {outlets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Tidak ada outlet yang cocok dengan filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                outlets.map((outlet) => (
                  <TableRow key={outlet.id}>
                    <TableCell>
                      <Link
                        href={`/master-data/outlets/${outlet.id}`}
                        className="flex items-center gap-2 text-left"
                      >
                        <OutletThumbnail key={outlet.thumbnailSrc} outlet={outlet} />
                        <span className="block">
                          <span className="block text-sm font-medium">
                            {outlet.name ?? "Outlet tanpa nama"}
                          </span>
                          {outlet.code ? (
                            <span className="text-muted-foreground block text-xs">
                              {outlet.code}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                      {outlet.outletTypeName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {outlet.warehouseName ?? "Belum ditugaskan"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={outlet.status === "active" ? "secondary" : "outline"}
                      >
                        {outlet.status === "active" ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/master-data/outlets/${outlet.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ubah outlet">
                          <EditIcon className="size-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ServerTablePagination pagination={pagination} pending={pending} onPage={setPage} onPageSize={setPageSize} />
    </div>
  );
}
