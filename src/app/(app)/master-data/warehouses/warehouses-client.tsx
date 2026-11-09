"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { EditIcon, PlusIcon, SearchIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { WarehouseTypeSymbol } from "@/components/warehouse-type-symbol";
import { DEFAULT_WAREHOUSE_COLOR, DEFAULT_WAREHOUSE_ICON } from "@/lib/warehouse-appearance";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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

import type { AreaOption, WarehouseRow, HeadOfficeLocation } from "./types";

const ALL_AREAS = "all";
const WarehousesMap = dynamic(() => import("./warehouses-map").then((module) => module.WarehousesMap), {
  ssr: false,
  loading: () => <p className="text-muted-foreground py-8 text-sm">Memuat peta…</p>,
});

export function WarehousesClient({
  tab,
  pagination,
  warehouses,
  areas,
  orgProvince,
  orgCity,
  headOffice,
}: {
  tab: "list" | "map";
  pagination: TablePagination;
  warehouses: WarehouseRow[];
  areas: AreaOption[];
  orgProvince: string | null;
  orgCity: string | null;
  headOffice: HeadOfficeLocation;
}) {
  const { q, setQuery, setPage, setPageSize, sortKey, sortDir, toggleSort, pending, startTransition } = useServerTable();
  const [areaFilter, setAreaFilter] = useQueryState("area", parseAsString.withDefault(ALL_AREAS).withOptions({
    shallow: false, startTransition,
  }));

  const areaOptions = useMemo(
    () => [
      { value: ALL_AREAS, label: "Semua area" },
      ...areas.map((area) => ({ value: String(area.id), label: area.name })),
    ],
    [areas],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari gudang berdasarkan nama"
            className="pl-8"
          />
        </div>

        <Combobox
          options={areaOptions}
          value={areaFilter}
          onValueChange={(value) => {
            void setAreaFilter(value || ALL_AREAS);
            void setPage(1);
          }}
          placeholder="Semua area"
          emptyText="Area tidak ditemukan."
          className="w-44"
        />

          <Button nativeButton={false} render={<Link href={`/master-data/warehouses/new?province=${encodeURIComponent(orgProvince ?? "")}&city=${encodeURIComponent(orgCity ?? "")}`} />}>
            <PlusIcon />
            Gudang baru
          </Button>
      </div>

      {tab === "map" ? (
        <WarehousesMap warehouses={warehouses} headOffice={headOffice} />
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <div className="overflow-x-auto" aria-busy={pending}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Gudang"
                      columnKey="name"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Area"
                      columnKey="area"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Tipe"
                      columnKey="type"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      className="hidden lg:table-cell"
                    />
                    <SortableHead
                      label="Status"
                      columnKey="status"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground h-24 text-center"
                      >
                        Tidak ada gudang yang cocok dengan filter ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouses.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell>
                          <Link
                            href={`/master-data/warehouses/${warehouse.id}`}
                            className="flex items-center gap-2 text-left hover:underline"
                          >
                            <WarehouseTypeSymbol icon={warehouse.warehouseTypeIcon ?? DEFAULT_WAREHOUSE_ICON} color={warehouse.warehouseTypeColor ?? DEFAULT_WAREHOUSE_COLOR} />
                            <span className="block text-sm font-medium">
                              {warehouse.name}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {warehouse.areaName ?? "Belum ditugaskan"}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                          {warehouse.warehouseTypeName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={warehouse.isActive ? "secondary" : "outline"}>
                            {warehouse.isActive ? "Aktif" : "Tidak aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button nativeButton={false} render={<Link href={`/master-data/warehouses/${warehouse.id}`} />} variant="ghost" size="icon" className="h-7 w-7" aria-label="Ubah gudang">
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
        </div>
      )}
    </div>
  );
}
