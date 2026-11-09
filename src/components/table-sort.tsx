"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "cn";

import { TableHead } from "@/components/ui/table";

export type SortDirection = "asc" | "desc";

/** Header cell that toggles sorting when clicked and shows the active state. */
export function SortableHead({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  columnKey: string;
  sortKey: string | null;
  sortDir: SortDirection | null;
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = sortKey === columnKey;
  const Icon = !active
    ? ChevronsUpDownIcon
    : sortDir === "desc"
      ? ArrowDownIcon
      : ArrowUpIcon;

  return (
    <TableHead
      className={className}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "group/sort hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded-md px-1 py-1 transition-colors",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            active ? "opacity-100" : "opacity-40 group-hover/sort:opacity-100",
          )}
        />
      </button>
    </TableHead>
  );
}
