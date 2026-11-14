"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useProgressTransition } from "@/components/action-progress";
import { ReceiptPreview } from "@/components/document-printer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { savePrinterSettings } from "@/lib/actions/printers";
import { DEFAULT_PRINT_SETTINGS, SAMPLE_DOCUMENT, type PrintSettings } from "@/lib/print-config";

export function PrinterForm({ initial }: { initial: PrintSettings }) {
  const [settings, setSettings] = useState(initial), [error, setError] = useState("");
  const [pending, startTransition] = useProgressTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    startTransition(async () => {
      try { const result = await savePrinterSettings(settings); if (result.ok) toast.success("Template cetak tersimpan."); else setError(result.error ?? "Gagal menyimpan."); }
      catch { setError("Pengaturan belum dapat disimpan."); }
    });
  }
  return <div className="grid items-start gap-4 xl:grid-cols-2"><form onSubmit={submit}><fieldset disabled={pending} className="space-y-4 rounded-xl border p-4">
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="print-paper">Ukuran kertas</Label><select id="print-paper" className="bg-background h-9 w-full rounded-md border px-2 text-sm" value={settings.paper} onChange={(event) => {
      const paper = event.target.value as PrintSettings["paper"];
      setSettings((value) => ({ ...value, paper, width: paper === "custom" ? value.width : paper === "A4" ? 210 : Number(paper), margin: paper === "A4" ? 10 : 3, fontSize: paper === "58" ? 10 : 11 }));
    }}><option value="58">Thermal 58 mm</option><option value="80">Thermal 80 mm</option><option value="76">Nota 76 mm</option><option value="A4">A4</option><option value="custom">Custom</option></select></div>
      <div className="space-y-1.5"><Label htmlFor="print-width">Lebar (mm)</Label><Input id="print-width" type="number" min="48" max="210" required disabled={settings.paper !== "custom"} value={settings.width} onChange={(event) => setSettings((value) => ({ ...value, width: Number(event.target.value) }))} /></div>
      <div className="space-y-1.5"><Label htmlFor="print-margin">Margin setiap sisi (mm)</Label><Input id="print-margin" type="number" min="0" max="20" required value={settings.margin} onChange={(event) => setSettings((value) => ({ ...value, margin: Number(event.target.value) }))} /></div>
      <div className="space-y-1.5"><Label htmlFor="print-font">Ukuran huruf (px)</Label><Input id="print-font" type="number" min="8" max="16" required value={settings.fontSize} onChange={(event) => setSettings((value) => ({ ...value, fontSize: Number(event.target.value) }))} /></div>
    </div>
    <div className="space-y-1.5"><Label htmlFor="print-template">Template</Label><select id="print-template" className="bg-background h-9 w-full rounded-md border px-2 text-sm" value={settings.template} onChange={(event) => setSettings((value) => ({ ...value, template: event.target.value as PrintSettings["template"] }))}><option value="compact">Ringkas · Thermal</option><option value="detailed">Detail · Gudang, order, jatuh tempo</option></select></div>
    <div className="space-y-1.5"><Label htmlFor="print-header">Teks tambahan header</Label><Input id="print-header" maxLength={200} value={settings.header} onChange={(event) => setSettings((value) => ({ ...value, header: event.target.value }))} /></div>
    <div className="space-y-1.5"><Label htmlFor="print-footer">Footer / Pesan pelanggan</Label><Textarea id="print-footer" maxLength={1000} value={settings.footer} onChange={(event) => setSettings((value) => ({ ...value, footer: event.target.value }))} /></div>
    <div className="flex flex-wrap gap-4 text-sm">{([['showLogo','Logo'],['showSku','Kode SKU'],['showAddress','Alamat']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={settings[key]} onChange={(event) => setSettings((value) => ({ ...value, [key]: event.target.checked }))} />{label}</label>)}</div>
    <p className="text-muted-foreground text-sm">Pasang driver printer USB atau pasangkan printer Bluetooth di perangkat, lalu pilih printer tersebut pada dialog cetak browser. Pilihan PDF menggunakan Simpan sebagai PDF. Lebar kertas printer harus sama dengan template, skala 100%, dan header/footer browser dimatikan.</p>
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan Template"}</Button><Button type="button" variant="outline" onClick={() => setSettings(initial)}>Batalkan perubahan</Button>
      <Button type="button" variant="ghost" onClick={() => setSettings(DEFAULT_PRINT_SETTINGS as PrintSettings)}>Default 80 mm</Button>
      <Button variant="outline" render={<Link href="/print/test" target="_blank" rel="noopener noreferrer" />} nativeButton={false}>Uji cetak template tersimpan</Button></div>
    {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
  </fieldset></form><div className="space-y-2"><p className="text-muted-foreground text-sm">Pratinjau langsung · Data contoh</p><div className="overflow-auto rounded-xl border bg-neutral-100 p-4"><ReceiptPreview document={SAMPLE_DOCUMENT} settings={settings} /></div></div></div>;
}
