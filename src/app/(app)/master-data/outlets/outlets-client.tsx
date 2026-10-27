"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  StoreIcon,
} from "lucide-react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import type { OutletRow, WarehouseOption } from "./types";

const PAGE_SIZE = 10;
const ALL_WAREHOUSES = "all";
const NO_WAREHOUSE = "none";
const STATUS_OPTIONS = ["all", "active", "inactive"] as const;

export function OutletsClient({
  outlets,
  warehouses,
}: {
  outlets: OutletRow[];
  warehouses: WarehouseOption[];
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

  const warehouseFilterName =
    warehouseFilter === ALL_WAREHOUSES
      ? undefined
      : warehouseFilter === NO_WAREHOUSE
        ? "No warehouse"
        : (warehouses.find((w) => String(w.id) === warehouseFilter)?.name ??
          undefined);
  const statusName =
    status === "all" ? "All status" : status === "active" ? "Active" : "Inactive";

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
            placeholder="Search outlets by name or code"
            className="pl-8"
          />
        </div>

        <Select
          value={warehouseFilter}
          onValueChange={(value) => {
            void setWarehouseFilter(value ?? ALL_WAREHOUSES);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All warehouses">
              {warehouseFilterName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_WAREHOUSES}>All warehouses</SelectItem>
            <SelectItem value={NO_WAREHOUSE}>No warehouse</SelectItem>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => {
            void setStatus((value as (typeof STATUS_OPTIONS)[number]) ?? "all");
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue>{statusName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button
          render={<Link href="/master-data/outlets/new" />}
          nativeButton={false}
        >
          <PlusIcon />
          New outlet
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outlet</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Warehouse</TableHead>
                <TableHead className="hidden lg:table-cell">Sales rep</TableHead>
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
                    No outlets match these filters.
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
                            {outlet.name ?? "Untitled outlet"}
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
                      {outlet.warehouseName ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {outlet.salesName ?? "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={outlet.status === "active" ? "secondary" : "outline"}
                      >
                        {outlet.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="hover:bg-muted inline-flex size-7 items-center justify-center rounded-lg transition-colors">
                          <MoreHorizontalIcon className="size-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            render={<Link href={`/master-data/outlets/${outlet.id}`} />}
                            nativeButton={false}
                          >
                            View &amp; edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            ? "No results"
            : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => void setPage(currentPage - 1)}
          >
            <ChevronLeftIcon />
            Previous
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
            Next
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
