"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { useProgressTransition } from "@/components/action-progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reverseWarehouseStock } from "@/lib/actions/warehouse-stock";
import { STOCK_PATH } from "@/lib/stock";

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
  const attempt = useRef<{ id: number; reason: string; key: string } | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) { setError("Alasan pembalikan wajib diisi."); return; }
    if (attempt.current?.id !== id || attempt.current.reason !== trimmed) {
      attempt.current = { id, reason: trimmed, key: crypto.randomUUID() };
    }
    const requestKey = attempt.current.key;
    setError("");
    startTransition(async () => {
      try {
        const result = await reverseWarehouseStock({ movementId: id, requestKey, reason: trimmed });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Balikkan transaksi {number ?? `#${id}`}?</DialogTitle>
          <DialogDescription>
            {type === "in" ? "Pembalikan mengurangi kembali qty yang diterima gudang." : "Pembalikan mengembalikan stok dari gudang tujuan ke gudang asal."}
            {" "}Transaksi asal akan berstatus Dibatalkan. Alasan dan pengguna dicatat dalam riwayat aktivitas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stock-reversal-reason">Alasan pembalikan (wajib)</Label>
            <Textarea id="stock-reversal-reason" required maxLength={1000} disabled={pending}
              value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }}
              placeholder="Contoh, qty salah input atau gudang tujuan keliru." />
          </div>
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Kembali</Button>
            <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Memproses…" : "Konfirmasi Pembalikan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
