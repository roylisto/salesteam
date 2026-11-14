import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requirePermission } from "@/lib/auth";
import { getOrder, orderDetailRows } from "@/lib/order-data";
import { formatMoney, orderStatusLabel } from "@/lib/order";
import { stockQuantity } from "@/lib/stock";
import { StockDetailControls } from "../../inventory/warehouses/[id]/stock-detail-controls";
import { OrderControls } from "./order-controls";

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("orders");
  const id = Number((await params).id);
  const record = await getOrder(user, id);
  if (!record) notFound();
  const { order, invoice } = record;
  const query = await searchParams;
  const rows = await orderDetailRows(user.organization.id, id, query, query.tab === "payments");
  const money = (value: string) => formatMoney(value, order.snapshot?.currency ?? user.organization.currency);
  const print = (kind: string, label: string) => <Button key={kind} variant="outline" render={<Link href={`/print/orders/${id}?kind=${kind}`} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>{label}</Button>;
  return <div className="space-y-4"><PageHeader title={order.transactionNumber ?? `Order #${id}`} description={orderStatusLabel(order.status)}>
    <Button variant="outline" render={<Link href="/orders" />} nativeButton={false}>Daftar Order</Button>
    <OrderControls id={id} status={order.status} outstanding={invoice?.outstandingAmount ?? null} canPay={can(user, "order_payments")} />
  </PageHeader>
    <div className="grid gap-4 rounded-xl border p-4 text-sm sm:grid-cols-3">
      <div><p className="text-muted-foreground text-xs">Outlet</p><p className="font-medium">{order.snapshot?.customer ?? "—"}</p><p>{order.snapshot?.address}</p></div>
      <div><p className="text-muted-foreground text-xs">Sales / Gudang asal stok</p><p>{order.snapshot?.sales ?? "—"} · {order.snapshot?.warehouse ?? "—"}</p>
        {can(user, "sales_inventory") && <Link className="text-primary underline underline-offset-4" href={`/inventory/sales?sales=${order.salesId}&warehouse=${order.warehouseId}`}>Lihat saldo stok Sales</Link>}</div>
      <div><p className="text-muted-foreground text-xs">Tanggal / Jatuh tempo</p>{order.orderedAt ? new Intl.DateTimeFormat("id-ID", { timeZone: user.organization.timezone, dateStyle: "medium" }).format(order.orderedAt) : "—"} · {order.dueDate ?? "Tanpa jatuh tempo"}</div>
      <div><p className="text-muted-foreground text-xs">Total order</p><p className="text-lg font-semibold">{money(order.total)}</p></div>
      <div><p className="text-muted-foreground text-xs">Invoice / Pembayaran</p>{invoice ? <><p>{invoice.transactionNumber} · {invoice.status === "paid" ? "Lunas" : Number(invoice.paidAmount) > 0 ? "Dibayar sebagian" : "Belum lunas"}</p><p>Diterima {money(invoice.paidAmount)}</p></> : "Invoice terbit setelah barang diserahkan"}</div>
      <div><p className="text-muted-foreground text-xs">Sisa tagihan</p><p className="text-lg font-semibold">{invoice ? money(invoice.outstandingAmount) : "Belum ditagihkan"}</p></div>
    </div>
    {order.status === "confirmed" && <p className="bg-muted rounded-lg p-3 text-sm">Stok sudah dipesan untuk order ini dan tidak tersedia untuk order lain. Barang belum ditandai diserahkan.</p>}
    {order.status === "fulfilled" && <p className="bg-muted rounded-lg p-3 text-sm">Barang diserahkan {order.fulfilledAt ? new Intl.DateTimeFormat("id-ID", { timeZone: user.organization.timezone, dateStyle: "medium", timeStyle: "short" }).format(order.fulfilledAt) : ""}. Stok fisik Sales sudah berkurang.</p>}
    {order.notes && <p className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{order.notes}</p>}
    {order.cancellationReason && <p className="rounded-lg border p-3 text-sm">Alasan pembatalan · {order.cancellationReason}</p>}
    <div className="flex flex-wrap gap-2">
      {print("quotation", "Cetak Penawaran Harga")}
      {order.status !== "cancelled" && print("proforma", "Cetak Proforma")}
      {(order.status === "confirmed" || order.status === "fulfilled") && print("order", "Cetak Sales Order")}
      {invoice && print("invoice", "Cetak Invoice / Faktur")}
      {invoice?.status === "paid" && print("receipt", "Cetak Nota Lunas")}
    </div>
    <p className="text-muted-foreground text-xs">Penawaran untuk gambaran harga, Sales Order untuk bukti pesanan, Invoice/Faktur Penjualan untuk tagihan, dan Nota Lunas untuk pembayaran penuh. Proforma belum merupakan tagihan final. Dokumen ini bukan Faktur Pajak.</p>
    <nav className="flex gap-3 text-sm"><Link className={query.tab !== "payments" ? "font-semibold underline" : ""} href={`/orders/${id}`}>Rincian SKU</Link><Link className={query.tab === "payments" ? "font-semibold underline" : ""} href={`/orders/${id}?tab=payments`}>Riwayat Pembayaran</Link></nav>
    <StockDetailControls pagination={rows.pagination}><div className="overflow-hidden rounded-xl border"><Table><TableHeader><TableRow>
      {rows.items ? <><TableHead>SKU / Produk</TableHead><TableHead>Qty</TableHead><TableHead>Harga satuan</TableHead><TableHead className="text-right">Subtotal</TableHead></> : <><TableHead>Nomor / Tanggal</TableHead><TableHead>Metode</TableHead><TableHead>Referensi</TableHead><TableHead className="text-right">Nominal</TableHead></>}
    </TableRow></TableHeader><TableBody>
      {rows.pagination.total === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground py-8 text-center">Tidak ada data yang cocok.</TableCell></TableRow>}
      {rows.items?.map((row) => <TableRow key={row.id}><TableCell><p className="font-medium">{row.productName}</p><p className="text-muted-foreground text-xs">{row.productCode ?? "—"}</p></TableCell><TableCell>{stockQuantity(row.quantity)} {row.unitName}<p className="text-muted-foreground text-xs">{stockQuantity(row.baseQuantity ?? row.quantity)} {row.baseUnitName} dasar</p></TableCell><TableCell>{money(row.unitPrice)}</TableCell><TableCell className="text-right tabular-nums">{money(row.subtotal)}</TableCell></TableRow>)}
      {rows.payments?.map((row) => <TableRow key={row.id}><TableCell>{row.transactionNumber}<p className="text-muted-foreground text-xs">{new Intl.DateTimeFormat("id-ID", { timeZone: user.organization.timezone, dateStyle: "medium", timeStyle: "short" }).format(row.createdAt)}</p></TableCell><TableCell>{row.method}</TableCell><TableCell>{row.reference ?? "—"}</TableCell><TableCell className="text-right tabular-nums">{money(row.amount)}</TableCell></TableRow>)}
    </TableBody></Table></div></StockDetailControls>
  </div>;
}
