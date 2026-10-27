"use client";

import { useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TagsIcon,
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
            placeholder="Search outlet types by name"
            className="pl-8"
          />
        </div>

        <Button onClick={() => void setAction("create")}>
          <PlusIcon />
          New outlet type
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outlet type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
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
                    No outlet types match these filters.
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
                        {outletType.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {new Date(outletType.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="hover:bg-muted inline-flex size-7 items-center justify-center rounded-lg transition-colors">
                          <MoreHorizontalIcon className="size-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => void setOutletTypeId(outletType.id)}
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
