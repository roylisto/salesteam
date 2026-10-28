"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon, EditIcon, PlusIcon, SearchIcon, WarehouseIcon } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import type { AreaOption, WarehouseRow } from "./types";

const PAGE_SIZE = 10;
const ALL_AREAS = "all";

export function WarehousesClient({
  warehouses,
  areas,
  orgProvince,
  orgCity,
}: {
  warehouses: WarehouseRow[];
  areas: AreaOption[];
  orgProvince: string | null;
  orgCity: string | null;
}) {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [areaFilter, setAreaFilter] = useQueryState(
    "area",
    parseAsString.withDefault(ALL_AREAS).withOptions({ history: "replace" }),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return warehouses.filter((warehouse) => {
      if (areaFilter !== ALL_AREAS && String(warehouse.areaOfficeId) !== areaFilter) {
        return false;
      }
      if (needle.length === 0) return true;
      return warehouse.name.toLowerCase().includes(needle);
    });
  }, [warehouses, query, areaFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const areaFilterName =
    areaFilter === ALL_AREAS
      ? undefined
      : (areas.find((area) => String(area.id) === areaFilter)?.name ?? undefined);

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
            placeholder="Cari gudang berdasarkan nama"
            className="pl-8"
          />
        </div>

        <Select
          value={areaFilter}
          onValueChange={(value) => {
            void setAreaFilter(value ?? ALL_AREAS);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua area">{areaFilterName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_AREAS}>Semua area</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area.id} value={String(area.id)}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Link href={`/master-data/warehouses/new?province=${encodeURIComponent(orgProvince ?? "")}&city=${encodeURIComponent(orgCity ?? "")}`}>
          <Button>
            <PlusIcon />
            Gudang baru
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gudang</TableHead>
                <TableHead>Area</TableHead>
                <TableHead className="hidden lg:table-cell">Tipe</TableHead>
                <TableHead>Status</TableHead>
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
                    Tidak ada gudang yang cocok dengan filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <Link
                        href={`/master-data/warehouses/${warehouse.id}`}
                        className="flex items-center gap-2 text-left hover:underline"
                      >
                        <WarehouseIcon className="text-muted-foreground size-4 shrink-0" />
                        <span className="block text-sm font-medium">
                          {warehouse.name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {warehouse.areaName ?? "Belum ditugaskan"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {warehouse.depotType ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.isActive ? "secondary" : "outline"}>
                        {warehouse.isActive ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/master-data/warehouses/${warehouse.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ubah gudang">
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