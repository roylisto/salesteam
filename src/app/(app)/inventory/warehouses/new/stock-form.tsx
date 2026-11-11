"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import Link from "next/link";
import { toast } from "sonner";
import { useActionProgress, useProgressTransition } from "@/components/action-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServerTablePagination } from "@/components/server-table-pagination";
import { loadStockProducts, saveWarehouseStock } from "@/lib/actions/warehouse-stock";
import { STOCK_PATH, stockQuantity, type StockReplacement } from "@/lib/stock";
import type { PageSize } from "@/lib/table-query";
import type { stockOptions } from "../data";

type Scope = "all" | "type" | "brand";
type ProductQuery = { scope: Scope; scopeId?: number; warehouseId: number; productIds?: number[] };
type ProductPage = Awaited<ReturnType<typeof loadStockProducts>>;

export function StockForm({ type, options, defaultDate, replacement }: {
  type: "in" | "out";
  options: Awaited<ReturnType<typeof stockOptions>>;
  defaultDate: string;
  replacement?: StockReplacement;
}) {
  const router = useRouter();
  const initialWarehouse = options.warehouses.find((row) => row.id === replacement?.warehouseId);
  const [warehouse, setWarehouse] = useState(initialWarehouse ? String(initialWarehouse.id) : "");
  const [destination, setDestination] = useState(
    options.warehouses.some((row) => row.id === replacement?.destinationId) ? String(replacement!.destinationId) : "",
  );
  const [scope, setScope] = useState<Scope>("all");
  const [scopeId, setScopeId] = useState("");
  const [applied, setApplied] = useState<ProductQuery | null>(
    replacement && initialWarehouse && Object.keys(replacement.quantities).length > 0
      ? { scope: "all", warehouseId: initialWarehouse.id, productIds: Object.keys(replacement.quantities).map(Number) }
      : null,
  );
  const [q, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [products, setProducts] = useState<{ key: string; data: ProductPage } | null>(null);
  const [quantities, setQuantities] = useState<Record<number, string>>(replacement?.quantities ?? {});
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useProgressTransition();
  const [error, setError] = useState("");
  const [productError, setProductError] = useState("");
  const lastAttempt = useRef<{ signature: string; key: string } | null>(null);
  const queryKey = JSON.stringify({ applied, q, page, pageSize });
  useActionProgress(loading);

  useEffect(() => {
    if (!applied) return;
    let disposed = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setProductError("");
      void loadStockProducts({ ...applied, q, page, pageSize }).then((data) => {
        if (!disposed) setProducts({ key: queryKey, data });
      }).catch(() => {
        if (!disposed) setProductError("Daftar SKU gagal dimuat. Klik Tampilkan SKU untuk mencoba lagi.");
      }).finally(() => { if (!disposed) setLoading(false); });
    }, 250);
    return () => { disposed = true; clearTimeout(timer); };
  }, [applied, q, page, pageSize, queryKey]);

  const ready = products?.key === queryKey;
  const chosen = Object.entries(quantities).filter(([, value]) => value.trim() !== "" && Number(value) !== 0);
  const warehouseOptions = options.warehouses.map((row) => ({ value: String(row.id), label: row.name }));
  const scopeOptions = (scope === "type" ? options.types : options.brands).map((row) => ({ value: String(row.id), label: row.name }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (chosen.length === 0) { setError("Isi qty positif untuk minimal satu SKU."); return; }
    if (chosen.length > 10_000) { setError("Maksimal 10.000 SKU per transaksi. Pisahkan menjadi beberapa transaksi."); return; }
    const data = {
      type, warehouseId: Number(warehouse), destinationId: type === "out" ? Number(destination) : undefined,
      date: String(form.get("date")), reference: String(form.get("reference") ?? ""),
      items: chosen.map(([productId, quantity]) => ({ productId: Number(productId), quantity })),
      replacementOfId: replacement?.id,
    };
    const signature = JSON.stringify(data);
    if (lastAttempt.current?.signature !== signature) lastAttempt.current = { signature, key: crypto.randomUUID() };
    const requestKey = lastAttempt.current.key;
    setError("");
    startTransition(async () => {
      try {
        const result = await saveWarehouseStock({ ...data, requestKey });
        if (!result.id) { setError(result.error ?? "Transaksi gagal disimpan."); return; }
        toast.success(type === "in" ? "Stock In tersimpan." : "Stok berhasil ditransfer.");
        router.push(`${STOCK_PATH}/${result.id}`);
      } catch {
        setError("Transaksi belum dapat dikonfirmasi. Coba simpan lagi dengan data yang sama.");
      }
    });
  }

  return <form onSubmit={submit}>
    <fieldset disabled={pending} className="space-y-4">
      {replacement && <p className="bg-muted rounded-lg border p-3 text-sm">
        Pengganti transaksi <Link href={`${STOCK_PATH}/${replacement.id}`} className="font-medium underline underline-offset-4">
          {replacement.number ?? `#${replacement.id}`}
        </Link>. Periksa dan sesuaikan SKU, qty, gudang, tanggal, dan referensi sebelum menyimpan.
      </p>}
      <Card size="sm">
        <CardHeader><CardTitle>Informasi transaksi</CardTitle>
          <CardDescription>{type === "out" ? "Stok gudang asal berkurang dan stok gudang tujuan bertambah saat transaksi disimpan." : "Penerimaan dapat dicatat ke semua gudang aktif."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="stock-warehouse">{type === "in" ? "Gudang penerima" : "Gudang asal"} (wajib)</Label>
            <Combobox id="stock-warehouse" options={warehouseOptions} value={warehouse} placeholder="Pilih gudang" disabled={pending}
              onValueChange={(value) => {
                if (value === warehouse) return;
                setWarehouse(value);
                if (!replacement) setQuantities({});
                setApplied(null); setProducts(null); setLoading(false);
                if (value === destination) setDestination("");
              }} />
          </div>
          {type === "out" && <div className="space-y-1.5">
            <Label htmlFor="stock-destination">Gudang tujuan (wajib)</Label>
            <Combobox id="stock-destination" options={warehouseOptions.filter((row) => row.value !== warehouse)}
              value={destination} onValueChange={setDestination} placeholder="Pilih gudang tujuan" disabled={pending} />
          </div>}
          <div className="space-y-1.5"><Label htmlFor="stock-date">Tanggal (wajib)</Label>
            <Input id="stock-date" name="date" type="date" defaultValue={defaultDate} required /></div>
          <div className="space-y-1.5"><Label htmlFor="stock-reference">Nomor referensi</Label>
            <Input id="stock-reference" name="reference" maxLength={60} defaultValue={replacement?.reference ?? ""}
              placeholder="Nomor Order / Surat Jalan / Dokumen" /></div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader><CardTitle>SKU dan kuantitas</CardTitle>
          <CardDescription>Isi qty dalam satuan dasar. Qty kosong atau nol dilewati. Isian tetap tersimpan saat berganti halaman dan filter.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5"><Label htmlFor="stock-scope">Tampilkan SKU</Label>
              <select id="stock-scope" className="border-input bg-background h-8 rounded-md border px-2 text-sm" value={scope}
                onChange={(event) => { setScope(event.target.value as Scope); setScopeId(""); }}>
                <option value="all">Semua SKU</option><option value="type">Per Tipe</option><option value="brand">Per Brand</option>
              </select>
            </div>
            {scope !== "all" && <div className="min-w-52 space-y-1.5"><Label htmlFor="stock-scope-id">{scope === "type" ? "Tipe Produk" : "Brand"}</Label>
              <Combobox id="stock-scope-id" className="block" options={scopeOptions} value={scopeId} onValueChange={setScopeId}
                placeholder={scope === "type" ? "Pilih tipe" : "Pilih brand"} disabled={pending} /></div>}
            <Button type="button" variant="outline" disabled={!warehouse || (scope !== "all" && !scopeId) || pending}
              onClick={() => {
                setApplied({ scope, scopeId: scope === "all" ? undefined : Number(scopeId), warehouseId: Number(warehouse) });
                setPage(1); setQuery("");
              }}>{scope === "all" ? "Tampilkan Semua SKU" : "Tampilkan SKU"}</Button>
            <span className="text-muted-foreground ml-auto text-sm">{chosen.length} SKU terisi</span>
            <Button type="button" variant="ghost" disabled={chosen.length === 0 || pending} onClick={() => setQuantities({})}>Kosongkan qty</Button>
          </div>
          {!warehouse && <p className="text-muted-foreground text-sm">Pilih gudang untuk menampilkan SKU dan saldo stoknya.</p>}
          {applied && <Input aria-label="Cari SKU" placeholder="Cari nama produk atau SKU" value={q} maxLength={200}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="max-w-sm" />}
          {productError && <p role="alert" className="text-destructive text-sm">{productError}</p>}
          {applied && !ready && !productError && <p role="status" className="text-muted-foreground text-sm">Memuat SKU…</p>}
          {ready && products && <>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader><TableRow><TableHead>SKU / Produk</TableHead><TableHead>Brand · Tipe</TableHead>
                  <TableHead className="text-right">Stok tersedia</TableHead><TableHead>Satuan dasar</TableHead><TableHead className="w-36">Qty</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {products.data.rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground py-6 text-center">Tidak ada SKU yang cocok.</TableCell></TableRow>}
                  {products.data.rows.map((row) => <TableRow key={row.id}>
                    <TableCell><p className="font-medium">{row.name}</p><p className="text-muted-foreground text-xs">{row.code ?? "—"}</p></TableCell>
                    <TableCell>{row.brand ?? "—"} · {row.type ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{stockQuantity(row.quantity)}</TableCell><TableCell>{row.unit}</TableCell>
                    <TableCell><Input aria-label={`Qty ${row.name}`} type="number" min="0" step={row.allowFraction ? "0.000001" : "1"}
                      value={quantities[row.id] ?? ""} placeholder="0"
                      onChange={(event) => setQuantities((current) => ({ ...current, [row.id]: event.target.value }))} /></TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </div>
            <ServerTablePagination pagination={products.data.pagination} pending={loading || pending} onPage={setPage}
              onPageSize={(size) => { setPageSize(size); setPage(1); }} />
          </>}
        </CardContent>
      </Card>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={!warehouse || (type === "out" && (!destination || destination === warehouse)) || chosen.length === 0 || pending}>
          {pending ? "Menyimpan…" : type === "in" ? "Simpan Stock In" : "Simpan Stock Out"}
        </Button>
      </div>
    </fieldset>
  </form>;
}
