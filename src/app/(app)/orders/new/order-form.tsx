"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { useActionProgress, useProgressTransition } from "@/components/action-progress";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServerTablePagination } from "@/components/server-table-pagination";
import { loadOrderProducts, saveOrder, searchOrderOutlets } from "@/lib/actions/orders";
import { cents, formatMoney, fromCents } from "@/lib/order";
import { quantityMicros, stockQuantity } from "@/lib/stock";
import { toFileSrc } from "@/lib/files";
import type { orderOptions } from "@/lib/order-data";
import type { PageSize } from "@/lib/table-query";

type Product = Awaited<ReturnType<typeof loadOrderProducts>>["rows"][number];
type Outlet = { id: number; name: string | null; code: string | null };

function OutletLookup({ selected, onChange, disabled }: { selected: Outlet | null; onChange: (value: Outlet) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false), [q, setQuery] = useState("");
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState<PageSize>(20);
  const [data, setData] = useState<Awaited<ReturnType<typeof searchOrderOutlets>> | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  useActionProgress(open && loading);
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      void searchOrderOutlets({ q, page, pageSize }).then((result) => { if (!disposed) setData(result); })
        .catch(() => { if (!disposed) setError("Outlet gagal dimuat. Buka ulang untuk mencoba lagi."); }).finally(() => { if (!disposed) setLoading(false); });
    }, 200);
    return () => { disposed = true; clearTimeout(timer); };
  }, [open, q, page, pageSize]);
  return <div className="space-y-1.5"><Label>Outlet (wajib)</Label><Button className="w-full justify-start" type="button" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>{selected?.name ?? "Pilih outlet"}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Pilih outlet</DialogTitle></DialogHeader>
      <Input aria-label="Cari outlet" placeholder="Cari nama atau kode outlet" value={q} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
      {loading && <p role="status" className="text-muted-foreground text-sm">Memuat outlet…</p>}{error && <p role="alert">{error}</p>}
      <div className="max-h-64 space-y-1 overflow-auto">{data?.rows.map((row) => <Button key={row.id} variant="ghost" className="w-full justify-start" onClick={() => { onChange(row); setOpen(false); }}>{row.name ?? "Outlet"} · {row.code ?? "—"}</Button>)}
        {data && !data.rows.length && <p className="p-3 text-sm">Tidak ada outlet yang cocok.</p>}</div>
      {data && <ServerTablePagination pagination={data.pagination} pending={loading} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />}
    </DialogContent></Dialog>
  </div>;
}

function subtotal(row: Product, value: string) {
  if (!row.price || !/^\d{1,14}(\.\d{1,6})?$/.test(value)) return BigInt(0);
  return (cents(row.price) * quantityMicros(value) + BigInt(500_000)) / BigInt(1_000_000);
}

export function OrderForm({ options, date }: { options: Awaited<ReturnType<typeof orderOptions>>; date: string }) {
  const router = useRouter();
  const [salesId, setSalesId] = useState(options.sales.length === 1 ? String(options.sales[0].id) : "");
  const [warehouseId, setWarehouseId] = useState("");
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [kind, setKind] = useState("confirmed"), [mode, setMode] = useState("all");
  const [scope, setScope] = useState("all"), [scopeId, setScopeId] = useState("");
  const [show, setShow] = useState(false), [q, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState<PageSize>(20);
  const [data, setData] = useState<{ key: string; result: Awaited<ReturnType<typeof loadOrderProducts>> } | null>(null);
  const [picked, setPicked] = useState<Record<number, { row: Product; quantity: string }>>({});
  const [loading, setLoading] = useState(false), [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useProgressTransition();
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const queryKey = JSON.stringify({ salesId, warehouseId, outletId: outlet?.id, q, page, pageSize, scope, scopeId });
  useActionProgress(show && loading);
  useEffect(() => {
    if (!show || !outlet || !salesId || !warehouseId) return;
    let disposed = false;
    const timer = setTimeout(() => {
      setLoading(true); setLoadError("");
      void loadOrderProducts({ salesId: Number(salesId), warehouseId: Number(warehouseId), outletId: outlet.id, q, page, pageSize, scope, scopeId: scopeId ? Number(scopeId) : undefined })
        .then((result) => { if (!disposed) setData({ key: queryKey, result }); })
        .catch(() => { if (!disposed) setLoadError("SKU gagal dimuat. Periksa pilihan Sales, outlet dan gudang, lalu klik Tampilkan SKU kembali."); })
        .finally(() => { if (!disposed) setLoading(false); });
    }, 200);
    return () => { disposed = true; clearTimeout(timer); };
  }, [show, outlet, salesId, warehouseId, q, page, pageSize, scope, scopeId, queryKey, reload]);
  const chosen = Object.values(picked).filter((entry) => entry.quantity.trim() !== "" && Number(entry.quantity) !== 0);
  const total = chosen.reduce((sum, entry) => sum + subtotal(entry.row, entry.quantity), BigInt(0));
  function reset() { setShow(false); setPicked({}); setData(null); setPage(1); setLoading(false); }
  function changeQuantity(row: Product, quantity: string) { setPicked((values) => ({ ...values, [row.id]: { row, quantity } })); }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen.length) { setError("Tambahkan minimal satu SKU dengan qty positif."); return; }
    const form = new FormData(event.currentTarget);
    const input = { salesId: Number(salesId), warehouseId: Number(warehouseId), outletId: outlet?.id, kind,
      date: String(form.get("date")), dueDate: String(form.get("dueDate") ?? ""), reference: String(form.get("reference") ?? ""), notes: String(form.get("notes") ?? ""),
      items: chosen.map((entry) => ({ sellUnitId: entry.row.id, quantity: entry.quantity })) };
    const signature = JSON.stringify(input);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    const requestKey = attempt.current.key; setError("");
    startTransition(async () => {
      try { const result = await saveOrder({ ...input, requestKey });
        if (!result.id) { setError(result.error ?? "Order gagal disimpan."); return; }
        toast.success("Order tersimpan."); router.push(`/orders/${result.id}`);
      } catch { setError("Belum ada konfirmasi penyimpanan. Coba ulang dengan data yang sama."); }
    });
  }
  return <form onSubmit={submit} className="space-y-4"><fieldset disabled={pending} className="space-y-4">
    <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5"><Label htmlFor="order-sales">Sales (wajib)</Label><Combobox id="order-sales" disabled={pending} placeholder="Pilih Sales" value={salesId} options={options.sales.map((row) => ({ value: String(row.id), label: row.name }))} onValueChange={(value) => { setSalesId(value); reset(); }} /></div>
      <OutletLookup selected={outlet} disabled={pending} onChange={(value) => { setOutlet(value); reset(); }} />
      <div className="space-y-1.5"><Label htmlFor="order-warehouse">Gudang asal stok Sales (wajib)</Label><Combobox id="order-warehouse" value={warehouseId} disabled={pending} placeholder="Pilih gudang asal" options={options.warehouses.map((row) => ({ value: String(row.id), label: row.name }))} onValueChange={(value) => { setWarehouseId(value); reset(); }} /></div>
      <div className="space-y-1.5"><Label htmlFor="order-kind">Jenis dokumen</Label><select id="order-kind" className="bg-background h-8 w-full rounded-md border px-2 text-sm" value={kind} onChange={(event) => setKind(event.target.value)}><option value="confirmed">Sales Order · pesan stok</option><option value="quotation">Penawaran Harga · belum pesan stok</option></select></div>
      <div className="space-y-1.5"><Label htmlFor="order-date">Tanggal order</Label><Input id="order-date" name="date" type="date" defaultValue={date} required /></div>
      <div className="space-y-1.5"><Label htmlFor="order-due">Jatuh tempo (opsional)</Label><Input id="order-due" name="dueDate" type="date" /></div>
      <div className="space-y-1.5"><Label htmlFor="order-reference">Nomor referensi</Label><Input id="order-reference" name="reference" maxLength={60} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="order-notes">Catatan</Label><Textarea id="order-notes" name="notes" maxLength={2000} /></div>
    </div>
    <p className="bg-muted rounded-lg p-3 text-sm">{kind === "quotation" ? "Penawaran menyimpan gambaran harga tanpa memesan stok." : "Sales Order memesan stok tersedia. Stok fisik berkurang setelah Barang Diserahkan dikonfirmasi."} Harga dihitung ulang oleh server saat disimpan.</p>
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-end gap-2"><div className="space-y-1.5"><Label htmlFor="sku-mode">Cara menambah SKU</Label><select id="sku-mode" value={mode} onChange={(event) => setMode(event.target.value)} className="bg-background h-8 rounded-md border px-2 text-sm"><option value="all">Tampilkan SKU dan isi qty</option><option value="single">Tambah SKU satu per satu</option></select></div>
        <div className="space-y-1.5"><Label htmlFor="sku-scope">Cakupan</Label><select id="sku-scope" value={scope} onChange={(event) => { setScope(event.target.value); setScopeId(""); setShow(false); setPage(1); }} className="bg-background h-8 rounded-md border px-2 text-sm"><option value="all">Semua SKU</option><option value="brand">Per Brand</option><option value="type">Per Tipe</option></select></div>
        {scope !== "all" && <Combobox className="w-52" value={scopeId} disabled={pending} placeholder={`Pilih ${scope === "brand" ? "brand" : "tipe"}`} options={(scope === "brand" ? options.brands : options.types).map((row) => ({ value: String(row.id), label: row.name }))} onValueChange={(value) => { setScopeId(value); setShow(false); setPage(1); }} />}
        <Button type="button" variant="outline" disabled={pending || !salesId || !outlet || !warehouseId || scope !== "all" && !scopeId} onClick={() => { setShow(true); setPage(1); setReload((value) => value + 1); setLoadError(""); }}>{mode === "all" ? "Tampilkan SKU" : "Cari / Tambah SKU"}</Button>
        {chosen.length > 0 && <Button type="button" variant="ghost" onClick={() => setPicked({})}>Kosongkan pilihan</Button>}
      </div>
      {show && <><Input aria-label="Cari SKU order" placeholder="Cari kode SKU atau nama produk" value={q} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        {loading && <p role="status" className="text-muted-foreground text-sm">Memuat SKU…</p>}{loadError && <p role="alert" className="text-destructive text-sm">{loadError}</p>}
        {data?.key === queryKey && <><Table><TableHeader><TableRow><TableHead>SKU / Produk</TableHead><TableHead>Satuan jual / Harga</TableHead><TableHead>Stok Sales (satuan dasar)</TableHead><TableHead>{mode === "all" ? "Qty" : "Pilih"}</TableHead></TableRow></TableHeader><TableBody>
          {!data.result.rows.length && <TableRow><TableCell colSpan={4}>Tidak ada SKU yang cocok.</TableCell></TableRow>}
          {data.result.rows.map((row) => <TableRow key={row.id}><TableCell><div className="flex items-center gap-2">{toFileSrc(row.image) && <Image src={`${toFileSrc(row.image)}?thumbnail=catalog`} alt="" width={36} height={36} unoptimized className="size-9 rounded object-cover" />}<div><p>{row.name}</p><p className="text-muted-foreground text-xs">{row.code ?? "—"}</p></div></div></TableCell>
            <TableCell>{row.unit}<p className="text-xs">{row.price === null ? "Harga belum diatur" : formatMoney(row.price)}</p><p className="text-muted-foreground text-xs">1 {row.unit} = {stockQuantity(row.factor)} {row.baseUnit}</p></TableCell>
            <TableCell><p className="font-medium">Tersedia {stockQuantity(row.available)} {row.baseUnit}</p><p className="text-muted-foreground text-xs">Fisik {stockQuantity(row.physical)} · Dipesan {stockQuantity(row.reserved)}</p></TableCell>
            <TableCell>{mode === "all" ? <Input className="w-28" aria-label={`Qty ${row.name} ${row.unit}`} type="number" min="0" step={row.allowFraction ? "0.000001" : "1"} disabled={pending || row.price === null} value={picked[row.id]?.quantity ?? ""} onChange={(event) => changeQuantity(row, event.target.value)} /> : <Button type="button" variant="outline" disabled={pending || row.price === null || Number(picked[row.id]?.quantity ?? 0) > 0} onClick={() => changeQuantity(row, "1")}>Tambah</Button>}</TableCell>
          </TableRow>)}
        </TableBody></Table><ServerTablePagination pagination={data.result.pagination} pending={loading || pending} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} /></>}
      </>}
    </div>
    {mode === "single" && chosen.length > 0 && <div className="space-y-2 rounded-xl border p-4"><p className="font-medium">SKU dipilih</p>{chosen.map(({ row, quantity }) => <div key={row.id} className="flex flex-wrap items-center gap-3 border-b py-2"><span className="min-w-40 flex-1 text-sm">{row.name} · {row.unit} · {formatMoney(row.price ?? "0")}</span><Input className="w-28" aria-label={`Qty dipilih ${row.name} ${row.unit}`} type="number" min="0" step={row.allowFraction ? "0.000001" : "1"} value={quantity} onChange={(event) => changeQuantity(row, event.target.value)} /><Button type="button" variant="ghost" onClick={() => setPicked((values) => { const next = { ...values }; delete next[row.id]; return next; })}>Hapus</Button></div>)}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><p className="text-muted-foreground text-sm">{chosen.length} baris SKU dipilih</p><p className="text-xl font-semibold">{formatMoney(fromCents(total))}</p></div>
      <Button type="submit" disabled={pending || !salesId || !warehouseId || !outlet || !chosen.length}>{pending ? "Menyimpan…" : kind === "quotation" ? "Simpan Penawaran" : "Simpan Sales Order"}</Button></div>
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
  </fieldset></form>;
}
