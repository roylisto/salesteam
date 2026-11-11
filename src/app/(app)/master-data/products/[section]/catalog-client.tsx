"use client";

import Image from "next/image";
import { useState } from "react";
import { BoxesIcon, EditIcon, PlusIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";

import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import { SortableHead } from "@/components/table-sort";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CatalogSection } from "@/lib/catalog";
import { formatCatalogPrice } from "@/lib/catalog-format";
import type { TablePagination } from "@/lib/table-query";

import { CatalogEditor } from "./catalog-editor";
import type { CatalogEditorData, CatalogListRow } from "./data";

function Thumbnail({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <Image src={src} alt="" width={40} height={40} unoptimized loading="lazy"
    className="size-10 shrink-0 rounded-md object-cover" onError={() => setFailed(true)} /> :
    <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md"><BoxesIcon className="size-4" /></span>;
}

export function CatalogClient({ section, rows, pagination, editor, editorKey, missing, currency }: {
  section: CatalogSection;
  rows: CatalogListRow[];
  pagination: TablePagination;
  editor: CatalogEditorData | null;
  editorKey?: string;
  missing: boolean;
  currency: string;
}) {
  const { q, setQuery, setPage, setPageSize, sortKey, sortDir, toggleSort, pending, startTransition } = useServerTable();
  const [modal, setModal] = useQueryState("edit", parseAsString.withOptions({ shallow: false, startTransition }));
  const isPrice = section === "prices";
  const hasDetail = section === "list" || section === "units" || isPrice;
  const hasImage = section === "brands" || section === "list";
  const [filter, setFilter] = useQueryState(isPrice ? "scope" : "status", parseAsString.withDefault("").withOptions({ shallow: false, startTransition }));
  const sortProps = { sortKey, sortDir, onSort: toggleSort };
  const close = () => { void setModal(null); };

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Input aria-label="Cari data" placeholder={section === "list" ? "Cari nama, SKU, brand, atau tipe" : "Cari data"} className="max-w-sm" value={q}
        onChange={(event) => setQuery(event.target.value)} />
      <select aria-label={isPrice ? "Filter cakupan" : "Filter status"} className="border-input bg-background h-8 rounded-md border px-2 text-sm"
        value={filter} onChange={(event) => { void setFilter(event.target.value); setPage(1); }}>
        {isPrice ? <><option value="">Semua cakupan</option><option value="global">Global</option><option value="area">Area</option><option value="warehouse">Gudang</option></>
          : <><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Tidak aktif</option></>}
      </select>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => void setModal("new")}><PlusIcon /> Tambah</Button>
      </div>
    </div>
    {missing && <p role="alert" className="text-destructive text-sm">Data yang dipilih tidak ditemukan.</p>}
    <div className="overflow-hidden rounded-xl border" aria-busy={pending}>
      <Table>
        <TableHeader><TableRow>
          <SortableHead label={isPrice ? "Produk" : "Nama"} columnKey="name" {...sortProps} />
          {hasDetail && <SortableHead label={isPrice ? "Satuan · Tipe outlet · Cakupan" : "Keterangan"} columnKey="detail" {...sortProps} />}
          {isPrice ? <SortableHead label="Harga jual" columnKey="amount" {...sortProps} /> : <SortableHead label="Status" columnKey="status" {...sortProps} />}
          <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={hasDetail ? 4 : 3} className="text-muted-foreground py-8 text-center">Tidak ada data yang cocok.</TableCell></TableRow>}
          {rows.map((row) => <TableRow key={row.id}>
            <TableCell><button type="button" className="flex items-center gap-2 text-left font-medium hover:underline" onClick={() => void setModal(String(row.id))}>
              {hasImage && <Thumbnail key={row.image} src={row.image} />}{row.name}
            </button></TableCell>
            {hasDetail && <TableCell className="text-muted-foreground">{row.detail || "—"}</TableCell>}
            <TableCell>{isPrice && row.amount !== null ? formatCatalogPrice(row.amount, currency) : <Badge variant={row.active ? "secondary" : "outline"}>{row.active ? "Aktif" : "Tidak aktif"}</Badge>}</TableCell>
            <TableCell><Button variant="ghost" size="icon" aria-label={`Ubah ${row.name}`} onClick={() => void setModal(String(row.id))}><EditIcon /></Button></TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>
    <ServerTablePagination pagination={pagination} pending={pending} onPage={setPage} onPageSize={setPageSize} />
    {editor && modal === editorKey && <CatalogEditor key={editorKey} data={editor} onClose={close} />}
  </div>;
}
