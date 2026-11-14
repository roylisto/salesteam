"use client";
import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { toFileSrc } from "@/lib/files";
import { formatMoney } from "@/lib/order";
import { stockQuantity } from "@/lib/stock";
import type { PrintDocument, PrintSettings } from "@/lib/print-config";

const preferenceCache = new Map<string, string>();
function subscribePreferences(callback: () => void) {
  const changed = (event: Event) => { if (event instanceof StorageEvent && event.key) preferenceCache.delete(event.key); callback(); };
  window.addEventListener("storage", changed); window.addEventListener("print-preferences", changed);
  return () => { window.removeEventListener("storage", changed); window.removeEventListener("print-preferences", changed); };
}
function usePrintPreference(key: string, fallback: string) {
  const value = useSyncExternalStore(subscribePreferences, () => {
    if (preferenceCache.has(key)) return preferenceCache.get(key)!;
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }, () => fallback);
  return [value, (next: string) => { preferenceCache.set(key, next); try { localStorage.setItem(key, next); } catch {} window.dispatchEvent(new Event("print-preferences")); }] as const;
}

export function ReceiptPreview({ document: doc, settings }: { document: PrintDocument; settings: PrintSettings }) {
  const money = (value: string) => formatMoney(value, doc.currency);
  const logo = toFileSrc(doc.logo);
  return <article className="receipt bg-white text-black" style={{ width: `${settings.width}mm`, padding: `${settings.margin}mm`, fontSize: `${settings.fontSize}px`, fontFamily: "Arial, sans-serif", lineHeight: 1.4, boxSizing: "border-box", overflowWrap: "anywhere" }}>
    <header style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: 10, marginBottom: 10 }}>
      {settings.showLogo && logo && <Image src={logo} alt="" width={64} height={64} unoptimized style={{ width: 48, height: 48, objectFit: "contain", margin: "0 auto 6px" }} />}
      <strong style={{ display: "block", fontSize: "1.2em" }}>{doc.company}</strong>
      {settings.showAddress && <p>{doc.companyAddress}</p>}{doc.phone && <p>{doc.phone}</p>}
      {settings.header && <p style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{settings.header}</p>}
      <h1 style={{ fontWeight: 700, fontSize: "1.1em", marginTop: 10 }}>{doc.title}</h1><p>{doc.number}</p><strong>{doc.status}</strong>
    </header>
    <div style={{ marginBottom: 10 }}><p>{doc.date}</p><p>Pelanggan · {doc.customer}</p>{settings.showAddress && doc.address && <p>{doc.address}</p>}<p>Sales · {doc.sales}</p>
      {settings.template === "detailed" && <><p>Order · {doc.orderNumber}</p><p>Gudang asal · {doc.warehouse}</p></>}
      {doc.dueDate && <p>Jatuh tempo · {doc.dueDate}</p>}
    </div>
    <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000" }}>{doc.items.map((item, index) => <div key={index} style={{ padding: "7px 0", breakInside: "avoid", borderBottom: settings.template === "detailed" ? "1px dotted #bbb" : undefined }}>
      <p style={{ fontWeight: 600 }}>{item.name}</p>{settings.showSku && item.code && <p style={{ fontSize: ".9em" }}>{item.code}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>{stockQuantity(item.quantity)} {item.unit} × {money(item.price)}</span><strong style={{ textAlign: "right" }}>{money(item.subtotal)}</strong></div>
    </div>)}</div>
    <div style={{ padding: "10px 0", breakInside: "avoid" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "1.1em", fontWeight: 700 }}><span>TOTAL</span><span>{money(doc.total)}</span></div>
      {(doc.kind === "invoice" || doc.kind === "receipt") && <><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>Dibayar</span><span>{money(doc.paid)}</span></div><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>Sisa tagihan</span><span>{money(doc.outstanding)}</span></div></>}
    </div>
    {doc.notes && <p style={{ whiteSpace: "pre-wrap", marginBottom: 10 }}>{doc.notes}</p>}
    {doc.kind === "proforma" && <p style={{ fontWeight: 600 }}>Dokumen perkiraan tagihan. Bukan invoice final atau bukti pembayaran.</p>}
    {doc.kind === "quotation" && <p>Penawaran harga. Belum merupakan bukti pemesanan atau pembayaran.</p>}
    {doc.kind === "order" && <p>Bukti pesanan. Status penyerahan barang mengikuti order.</p>}
    <footer style={{ borderTop: "1px dashed #000", marginTop: 10, paddingTop: 10, textAlign: "center", whiteSpace: "pre-wrap" }}>{settings.footer}<p style={{ marginTop: 6, fontSize: ".85em" }}>Dokumen penjualan · Bukan Faktur Pajak</p></footer>
  </article>;
}

export function DocumentPrinter({ document, settings: savedSettings, organizationId }: { document: PrintDocument; settings: PrintSettings; organizationId: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(297), [printing, setPrinting] = useState(false);
  const [target, setTarget] = usePrintPreference(`print-target:${organizationId}`, "printer");
  const [paper, setPaper] = usePrintPreference(`print-paper:${organizationId}`, "organization");
  const override = ["58", "76", "80", "A4"].includes(paper) ? paper : null;
  const settings: PrintSettings = override ? { ...savedSettings, paper: override as PrintSettings["paper"], width: override === "A4" ? 210 : Number(override),
    margin: override === "A4" ? 10 : 3, fontSize: override === "58" ? 10 : savedSettings.fontSize } : savedSettings;
  const [error, setError] = useState("");
  async function print() {
    setPrinting(true); setError("");
    try {
      await window.document.fonts.ready;
      await Promise.all(Array.from(ref.current?.querySelectorAll("img") ?? []).map((image) => image.decode().catch(() => {})));
      const measured = (ref.current?.getBoundingClientRect().height ?? 400) * 25.4 / 96;
      flushSync(() => setHeight(settings.paper === "A4" ? 297 : Math.min(2000, Math.max(80, Math.ceil(measured + 2)))));
      window.print();
    } catch { setError("Dialog cetak gagal dibuka. Coba kembali atau gunakan menu cetak browser."); }
    finally { setPrinting(false); }
  }
  return <main className="print-document min-h-screen bg-neutral-100 p-4 text-black">
    <style>{`@page { size: ${settings.width}mm ${height}mm; margin: 0; } @media print { html,body { background:white!important; margin:0!important; padding:0!important; } .print-document { padding:0!important; background:white!important; } .print-toolbar, .action-progress, #nprogress { display:none!important; } .print-sheet { margin:0!important; box-shadow:none!important; width:${settings.width}mm!important; } .receipt { print-color-adjust:exact; } }`}</style>
    <div className="print-toolbar mx-auto mb-4 max-w-3xl space-y-2 rounded-xl bg-white p-4 text-sm"><div className="flex flex-wrap items-center gap-3">
      <label>Tujuan cetak <select className="ml-2 rounded border p-1" value={target} onChange={(event) => setTarget(event.target.value)}><option value="printer">Printer USB / Bluetooth</option><option value="pdf">PDF</option></select></label>
      <label>Kertas perangkat ini <select className="ml-2 rounded border p-1" value={paper} onChange={(event) => setPaper(event.target.value)}><option value="organization">Template organisasi</option><option value="58">58 mm</option><option value="76">76 mm</option><option value="80">80 mm</option><option value="A4">A4</option></select></label>
      <Button onClick={print} disabled={printing}>{printing ? "Membuka cetak…" : target === "pdf" ? "Simpan PDF melalui dialog cetak" : "Cetak dokumen"}</Button>
      <span>{settings.paper === "A4" ? "A4" : `${settings.width} mm`} · {settings.template === "compact" ? "Ringkas" : "Detail"}</span>
    </div><p>{target === "pdf" ? "Pilih Save as PDF / Simpan sebagai PDF di dialog cetak." : "Pilih printer yang sudah dipasang melalui USB atau dipasangkan via Bluetooth di sistem perangkat. Pilih ukuran kertas yang sesuai, skala 100%, dan matikan header/footer browser."}</p>
      <p className="text-neutral-500">Browser meminta konfirmasi printer setiap kali mencetak. Status cetak tidak mengubah status order atau pembayaran.</p>{error && <p role="alert">{error}</p>}
    </div>
    <div ref={ref} className="print-sheet mx-auto w-fit shadow-sm"><ReceiptPreview document={document} settings={settings} /></div>
  </main>;
}
