"use client";
import { useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { useProgressTransition } from "@/components/action-progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordOrderPayment, transitionOrder } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/order";

export function OrderControls({ id, status, outstanding, canPay }: { id: number; status: string; outstanding: string | null; canPay: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"confirm" | "deliver" | "cancel" | "payment" | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useProgressTransition();
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const labels = { confirm: "Konfirmasi Sales Order", deliver: "Barang Diserahkan", cancel: "Batalkan Order", payment: "Catat Pembayaran" };
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const form = new FormData(event.currentTarget);
    const input = { orderId: id, amount: String(form.get("amount") ?? ""), method: String(form.get("method") ?? ""), reference: String(form.get("reference") ?? "") };
    const signature = JSON.stringify(input);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    const requestKey = attempt.current.key;
    setError("");
    startTransition(async () => {
      try {
        const result = dialog === "payment" ? await recordOrderPayment({ ...input, requestKey }) : await transitionOrder({ id, action: dialog, reason: String(form.get("reason") ?? "") });
        if (!result.id) { setError(result.error ?? "Proses gagal."); return; }
        toast.success("Transaksi tersimpan."); setDialog(null); router.refresh();
      } catch { setError("Proses belum dapat dikonfirmasi. Coba ulang dengan data yang sama."); }
    });
  }
  const open = (value: typeof dialog) => { setError(""); setDialog(value); };
  return <>
    {status === "quotation" && <Button onClick={() => open("confirm")}>Konfirmasi Sales Order</Button>}
    {status === "confirmed" && <Button onClick={() => open("deliver")}>Barang Diserahkan</Button>}
    {(status === "quotation" || status === "confirmed") && <Button variant="destructive" onClick={() => open("cancel")}>Batalkan Order</Button>}
    {status === "fulfilled" && canPay && Number(outstanding) > 0 && <Button onClick={() => open("payment")}>Catat Pembayaran</Button>}
    <Dialog open={!!dialog} onOpenChange={(value) => { if (!pending && !value) setDialog(null); }}><DialogContent><DialogHeader>
      <DialogTitle>{dialog ? labels[dialog] : "Order"}</DialogTitle>
      <DialogDescription>{dialog === "deliver" ? "Konfirmasi setelah barang benar-benar diserahkan. Stok fisik Sales dan stok dipesan berkurang, lalu invoice diterbitkan."
        : dialog === "confirm" ? "Stok Sales tersedia akan dipesan untuk order ini. Harga tetap mengikuti penawaran yang tersimpan."
        : dialog === "cancel" ? "Stok yang dipesan akan dilepas dan kembali tersedia dijual. Riwayat order tetap tersimpan."
        : `Sisa tagihan ${formatMoney(outstanding ?? "0")}. Catat hanya pembayaran yang sudah diterima.`}</DialogDescription>
    </DialogHeader><form onSubmit={submit} className="space-y-3"><fieldset disabled={pending} className="space-y-3">
      {dialog === "cancel" && <div className="space-y-1.5"><Label htmlFor="order-cancel-reason">Alasan pembatalan</Label><Textarea id="order-cancel-reason" name="reason" maxLength={1000} required /></div>}
      {dialog === "payment" && <>
        <div className="space-y-1.5"><Label htmlFor="pay-amount">Nominal diterima</Label><Input id="pay-amount" name="amount" type="number" min="0.01" max={outstanding ?? undefined} step="0.01" required /></div>
        <div className="space-y-1.5"><Label htmlFor="pay-method">Metode</Label><select id="pay-method" name="method" className="bg-background h-9 w-full rounded-md border px-2 text-sm">{["Tunai", "Transfer", "QRIS", "Lainnya"].map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="pay-reference">Referensi pembayaran</Label><Input id="pay-reference" name="reference" maxLength={150} /></div>
      </>}
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={pending}>Kembali</Button><Button type="submit" disabled={pending}>{pending ? "Memproses…" : "Konfirmasi"}</Button></DialogFooter>
    </fieldset></form></DialogContent></Dialog>
  </>;
}
