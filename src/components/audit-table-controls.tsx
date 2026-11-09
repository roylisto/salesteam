"use client";

import { useTransition } from "react";
import { debounce, useQueryStates } from "nuqs";

import { Input } from "@/components/ui/input";
import { auditTableParsers, type TablePagination } from "@/lib/table-query";
import { ServerTablePagination } from "./server-table-pagination";

function useAuditTable() {
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(auditTableParsers, { shallow: false, startTransition });
  return { params, setParams, pending };
}

export function AuditTableFilters({ actionLabels }: { actionLabels: Record<string, string> }) {
  const { params, setParams } = useAuditTable();
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Input aria-label="Cari aktivitas" placeholder="Cari pengguna atau nama data" className="max-w-sm"
        value={params.auditQ} onChange={(event) => void setParams({ auditQ: event.target.value, auditPage: 1 },
          { limitUrlUpdates: debounce(300) })} />
      <select aria-label="Filter aksi" value={params.auditAction}
        className="border-input bg-background h-8 rounded-md border px-2 text-sm"
        onChange={(event) => void setParams({ auditAction: event.target.value, auditPage: 1 })}>
        <option value="">Semua aksi</option>
        {Object.entries(actionLabels).map(([action, label]) => <option key={action} value={action}>{label}</option>)}
      </select>
    </div>
  );
}

export function AuditTablePagination({ pagination }: { pagination: TablePagination }) {
  const { setParams, pending } = useAuditTable();
  return <ServerTablePagination pagination={pagination} pending={pending}
    onPage={(auditPage) => void setParams({ auditPage })}
    onPageSize={(auditPageSize) => void setParams({ auditPageSize, auditPage: 1 })} />;
}
