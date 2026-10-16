"use client";

import { useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

const PAGE_SIZE = 10;

export function AreasClient({ areas }: { areas: AreaRow[] }) {
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [areaId, setAreaId] = useQueryState("area", parseAsInteger);
  const [action, setAction] = useQueryState(
    "action",
    parseAsStringLiteral(["create"] as const),
  );

  const selected = useMemo(
    () => areas.find((area) => area.id === areaId) ?? null,
    [areas, areaId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return areas;
    return areas.filter((area) => area.name.toLowerCase().includes(needle));
  }, [areas, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

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
            placeholder="Search areas by name"
            className="pl-8"
          />
        </div>

        <Button onClick={() => void setAction("create")}>
          <PlusIcon />
          New area
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No areas match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((area) => (
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="hover:bg-muted inline-flex size-7 items-center justify-center rounded-lg transition-colors">
                          <MoreHorizontalIcon className="size-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => void setAreaId(area.id)}
                          >
                            View & edit
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
