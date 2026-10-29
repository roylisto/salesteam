"use client";

import { useMemo } from "react";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { cn } from "cn";

import { TableHead } from "@/components/ui/table";

export type SortDirection = "asc" | "desc";

export type SortColumn<T> = {
  key: string;
  getValue: (row: T) => string | number | null | undefined;
};

const SORT_DIRECTIONS = ["asc", "desc"] as const;

/**
 * Client-side column sorting for list tables. The active column and direction
 * live in the URL (`sort`, `dir`) so a sorted view is shareable, mirroring the
 * other list filters. Numbers compare numerically, everything else uses an
 * Indonesian, number-aware `localeCompare`; empty values always sort last.
 */
export function useTableSort<T>(rows: T[], columns: SortColumn<T>[]) {
  const [sortKey, setSortKey] = useQueryState(
    "sort",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [sortDir, setSortDir] = useQueryState(
    "dir",
    parseAsStringLiteral(SORT_DIRECTIONS)
      .withDefault("asc")
      .withOptions({ history: "replace" }),
  );

  const activeColumn = columns.find((column) => column.key === sortKey) ?? null;

  const sortedRows = useMemo(() => {
    if (!activeColumn) return rows;
    const factor = sortDir === "desc" ? -1 : 1;
    return [...rows].sort((left, right) => {
      const a = activeColumn.getValue(left);
      const b = activeColumn.getValue(right);
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * factor;
      }
      return (
        String(a).localeCompare(String(b), "id", {
          sensitivity: "base",
          numeric: true,
        }) * factor
      );
    });
  }, [rows, activeColumn, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      void setSortDir(sortDir === "asc" ? "desc" : "asc");
      return;
    }
    void setSortKey(key);
    void setSortDir("asc");
  }

  return {
    sortedRows,
    sortKey: activeColumn ? sortKey : null,
    sortDir,
    toggleSort,
  };
}

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
