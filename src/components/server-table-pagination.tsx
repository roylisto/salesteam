"use client";

import { useTransition } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { debounce, useQueryStates } from "nuqs";

import { Button } from "@/components/ui/button";
import { PAGE_SIZES, tableParsers, type PageSize, type TablePagination } from "@/lib/table-query";

export function useServerTable() {
  const [pending, startTransition] = useTransition();
  const [{ q, sort, dir }, setParams] = useQueryStates(tableParsers, { shallow: false, startTransition });

  return {
    q,
    sortKey: sort || null,
    sortDir: dir,
    pending,
    startTransition,
    setQuery: (q: string) => void setParams({ q, page: 1 }, { limitUrlUpdates: debounce(300) }),
    setPage: (page: number) => void setParams({ page }),
    setPageSize: (pageSize: PageSize) => void setParams({ pageSize, page: 1 }),
    toggleSort: (key: string) => void setParams({ sort: key, dir: sort === key && dir === "asc" ? "desc" : "asc", page: 1 }),
  };
}

export function ServerTablePagination({ pagination, pending = false, onPage, onPageSize }: {
  pagination: TablePagination;
  pending?: boolean;
  onPage: (page: number) => void;
  onPageSize: (pageSize: PageSize) => void;
}) {
  const { page, pageSize, total, totalPages, offset } = pagination;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {total === 0 ? "Tidak ada hasil" : `Menampilkan ${offset + 1}–${Math.min(offset + pageSize, total)} dari ${total}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          Baris per halaman
          <select className="border-input bg-background text-foreground h-8 rounded-md border px-2" value={pageSize}
            disabled={pending} onChange={(event) => {
              const size = PAGE_SIZES.find((option) => String(option) === event.target.value);
              if (size) onPageSize(size);
            }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button variant="outline" size="sm" disabled={pending || page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeftIcon /> Sebelumnya
        </Button>
        <span className="text-muted-foreground text-xs tabular-nums">{page} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={pending || page >= totalPages} onClick={() => onPage(page + 1)}>
          Berikutnya <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
