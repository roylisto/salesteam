"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, EditIcon, PlusIcon, SearchIcon, StoreIcon } from "lucide-react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { OutletRow, WarehouseOption } from "./types";

const PAGE_SIZE = 10;
const ALL_WAREHOUSES = "all";
const NO_WAREHOUSE = "none";
const STATUS_OPTIONS = ["all", "active", "inactive"] as const;
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak aktif" },
];

export function OutletsClient({
  outlets,
  warehouses,
  orgProvince,
  orgCity,
}: {
  outlets: OutletRow[];
  warehouses: WarehouseOption[];
  orgProvince: string | null;
  orgCity: string | null;
}) {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [warehouseFilter, setWarehouseFilter] = useQueryState(
    "warehouse",
    parseAsString.withDefault(ALL_WAREHOUSES).withOptions({ history: "replace" }),
  );
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(STATUS_OPTIONS).withDefault("all"),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return outlets.filter((outlet) => {
      if (warehouseFilter === NO_WAREHOUSE && outlet.warehouseId !== null) {
        return false;
      }
      if (
        warehouseFilter !== ALL_WAREHOUSES &&
        warehouseFilter !== NO_WAREHOUSE &&
        String(outlet.warehouseId) !== warehouseFilter
      ) {
        return false;
      }
      if (status !== "all" && outlet.status !== status) return false;
      if (needle.length === 0) return true;
      return [outlet.name ?? "", outlet.code ?? ""].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [outlets, query, warehouseFilter, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

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
  const statusOptions = STATUS_FILTER_OPTIONS;

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
            placeholder="Cari outlet berdasarkan nama atau kode"
            className="pl-8"
          />
        </div>

        <Combobox
          options={warehouseFilterOptions}
          value={warehouseFilter}
          onValueChange={(value) => {
            void setWarehouseFilter(value || ALL_WAREHOUSES);
            void setPage(1);
          }}
          placeholder="Semua gudang"
          emptyText="Gudang tidak ditemukan."
          className="w-44"
        />

        <Combobox
          options={statusOptions}
          value={status}
          onValueChange={(value) => {
            void setStatus((value || "all") as (typeof STATUS_OPTIONS)[number]);
            void setPage(1);
          }}
          placeholder="Semua status"
          emptyText="Status tidak ditemukan."
          className="w-36"
        />

        <Button
          render={
            <Link
              href={`/master-data/outlets/new?province=${encodeURIComponent(orgProvince ?? "")}&city=${encodeURIComponent(orgCity ?? "")}`}
            />
          }
          nativeButton={false}
        >
          <PlusIcon />
          Outlet baru
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outlet</TableHead>
                <TableHead className="hidden md:table-cell">Tipe</TableHead>
                <TableHead className="hidden lg:table-cell">Gudang</TableHead>
                <TableHead className="hidden lg:table-cell">Tenaga penjualan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Tidak ada outlet yang cocok dengan filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((outlet) => (
                  <TableRow key={outlet.id}>
                    <TableCell>
                      <Link
                        href={`/master-data/outlets/${outlet.id}`}
                        className="flex items-center gap-2 text-left"
                      >
                        <StoreIcon className="text-muted-foreground size-4 shrink-0" />
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
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {outlet.salesName ?? "Belum ditugaskan"}
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {filtered.length === 0
            ? "Tidak ada hasil"
            : `Menampilkan ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} dari ${filtered.length}`}
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
    </div>
  );
}
