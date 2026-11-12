"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { useActionProgress, useProgressTransition } from "@/components/action-progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServerTablePagination } from "@/components/server-table-pagination";
import { loadWarehouseReversalLines, reverseWarehouseStock } from "@/lib/actions/warehouse-stock";
import { STOCK_PATH, stockQuantity } from "@/lib/stock";
import type { PageSize } from "@/lib/table-query";

export function StockCorrection({ id, number, type, allowReverse, allowReplacement, replacementForId = id }: {
  id: number; number: string | null; type: "in" | "out";
  allowReverse: boolean; allowReplacement: boolean;
  replacementForId?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useProgressTransition();
  const [mode, setMode] = useState("all");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [q, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadWarehouseReversalLines>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  useActionProgress(open && mode === "partial" && loading);

  useEffect(() => {
    if (!open || mode !== "partial") return;
    let disposed = false;
    const timer = setTimeout(() => {
      setLoading(true); setLoadError("");
      void loadWarehouseReversalLines({ movementId: id, q, page, pageSize }).then((result) => {
        if (!disposed) setData(result);
      }).catch(() => { if (!disposed) setLoadError("Rincian gagal dimuat. Buka ulang dialog untuk mencoba lagi."); })
        .finally(() => { if (!disposed) setLoading(false); });
    }, 200);
    return () => { disposed = true; clearTimeout(timer); };
  }, [open, mode, id, q, page, pageSize]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) { setError("Alasan pembalikan wajib diisi."); return; }
    const items = mode === "partial" ? Object.entries(quantities).filter(([, value]) => value.trim() && Number(value) !== 0)
      .map(([productId, quantity]) => ({ productId: Number(productId), quantity })) : undefined;
    if (items && !items.length) { setError("Isi qty pembatalan untuk minimal satu SKU."); return; }
    const signature = JSON.stringify({ id, reason: trimmed, items });
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    const requestKey = attempt.current.key;
    setError("");
    startTransition(async () => {
      try {
        const result = await reverseWarehouseStock({ movementId: id, requestKey, reason: trimmed, items });
        if (!result.id) { setError(result.error ?? "Pembalikan gagal disimpan."); return; }
        toast.success("Transaksi berhasil dibalik.");
        setOpen(false);
        router.push(`${STOCK_PATH}/${result.id}`);
        startTransition(() => router.refresh());
      } catch {
        setError("Pembalikan belum dapat dikonfirmasi. Coba lagi dengan alasan yang sama.");
      }
    });
  }

  return <>
    {allowReverse && <Button variant="destructive" onClick={() => setOpen(true)}>Batalkan / Balikkan transaksi</Button>}
    {allowReplacement && <Button render={<Link href={`${STOCK_PATH}/new?replace=${replacementForId}`} />} nativeButton={false}>
      Buat transaksi pengganti
    </Button>}
    <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
      <DialogContent className={mode === "partial" ? "max-h-[90vh] overflow-y-auto sm:max-w-3xl" : undefined}>
        <DialogHeader>
          <DialogTitle>Balikkan transaksi {number ?? `#${id}`}?</DialogTitle>
          <DialogDescription>
            {type === "in" ? "Pembalikan mengurangi kembali qty yang diterima gudang." : "Pembalikan mengembalikan stok dari gudang tujuan ke gudang asal."}
            {" "}Pilih seluruh sisa qty atau sebagian SKU. Alasan dan pengguna dicatat dalam riwayat aktivitas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="cancel-mode">Jumlah yang dibatalkan</Label>
            <select id="cancel-mode" disabled={pending} className="bg-background h-9 w-full rounded-md border px-2 text-sm" value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="all">Seluruh sisa qty transaksi</option><option value="partial">Sebagian · pilih SKU dan qty</option>
            </select>
          </div>
          {mode === "partial" && <div className="space-y-2">
            <Input aria-label="Cari SKU pembatalan" placeholder="Cari SKU atau produk" value={q} disabled={pending} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
            <p className="text-muted-foreground text-xs">Isi qty yang ingin dibatalkan. Pilihan tersimpan saat berpindah halaman.</p>
            {loading && <p role="status" className="text-muted-foreground text-sm">Memuat rincian…</p>}
            {loadError && <p role="alert" className="text-destructive text-sm">{loadError}</p>}
            {data && <>
              <div className="max-h-72 overflow-auto rounded-lg border"><Table>
                <TableHeader><TableRow><TableHead>SKU / Produk</TableHead><TableHead>Sisa qty</TableHead><TableHead>Qty dibatalkan</TableHead></TableRow></TableHeader>
                <TableBody>
                  {!data.rows.length && <TableRow><TableCell colSpan={3}>Tidak ada SKU yang cocok.</TableCell></TableRow>}
                  {data.rows.map((row) => <TableRow key={row.productId}><TableCell><p>{row.name ?? "Produk tidak tersedia"}</p><p className="text-muted-foreground text-xs">{row.code ?? "—"} · {row.unit ?? "—"}</p></TableCell>
                    <TableCell>{stockQuantity(row.remaining)}</TableCell><TableCell><Input aria-label={`Qty pembatalan ${row.name}`} type="number" min="0" max={row.remaining} step={row.allowFraction ? "0.000001" : "1"}
                      disabled={pending || loading || Number(row.remaining) <= 0} value={quantities[row.productId] ?? ""} onChange={(event) => setQuantities((values) => ({ ...values, [row.productId]: event.target.value }))} className="w-32" /></TableCell></TableRow>)}
                </TableBody>
              </Table></div>
              <ServerTablePagination pagination={data.pagination} pending={loading || pending} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
            </>}
          </div>}
          <div className="space-y-1.5">
            <Label htmlFor="stock-reversal-reason">Alasan pembalikan (wajib)</Label>
            <Textarea id="stock-reversal-reason" required maxLength={1000} disabled={pending}
              value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }}
              placeholder="Contoh, qty salah input atau gudang tujuan keliru." />
          </div>
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Kembali</Button>
            <Button type="submit" variant="destructive" disabled={pending || mode === "partial" && (loading || !data || !!loadError)}>{pending ? "Memproses…" : "Konfirmasi Pembalikan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
