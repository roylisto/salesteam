"use client";

import Image from "next/image";
import { useEffect, useId, useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteCatalog, previewCatalogPrice, saveCatalog, searchCatalogOptions } from "@/lib/actions/catalog";
import { CATALOG_SECTIONS, type CatalogOption } from "@/lib/catalog";
import { formatCatalogPrice } from "@/lib/catalog-format";
import { toFileSrc } from "@/lib/files";

import type { CatalogEditorData } from "./data";

function Choice({ label, name, options, defaultValue, disabled }: {
  label: string; name: string; options: CatalogOption[]; defaultValue?: string; disabled?: boolean;
}) {
  const fieldId = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  return <div className="space-y-1.5">
    <Label htmlFor={fieldId}>{label}</Label>
    <Combobox id={fieldId} options={options} value={value} onValueChange={setValue} disabled={disabled} placeholder={`Pilih ${label.toLowerCase()}`} />
    <input type="hidden" name={name} value={value} />
  </div>;
}

function Lookup({ kind, label, selection, onChange }: {
  kind: "outlet" | "sell-unit"; label: string; selection: CatalogOption | null; onChange: (option: CatalogOption | null) => void;
}) {
  const fieldId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogOption[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) return;
    let disposed = false;
    const timer = setTimeout(() => {
      void searchCatalogOptions(kind, query).then((rows) => {
        if (!disposed) { setResults(rows); setFailed(false); }
      }).catch(() => { if (!disposed) setFailed(true); });
    }, 300);
    return () => { disposed = true; clearTimeout(timer); };
  }, [kind, query]);
  const options = selection && !results.some((row) => row.value === selection.value) ? [selection, ...results] : results;
  return <div className="space-y-1.5">
    <Label htmlFor={`${fieldId}-search`}>Cari {label.toLowerCase()}</Label>
    <Input id={`${fieldId}-search`} placeholder="Masukkan minimal dua karakter" value={query} onChange={(event) => {
      setQuery(event.target.value);
      setResults([]);
      setFailed(false);
    }} />
    <Label htmlFor={fieldId}>{label}</Label>
    <Combobox id={fieldId} options={options} value={selection?.value ?? ""} placeholder={`Pilih ${label.toLowerCase()}`}
      emptyText={failed ? "Pencarian gagal. Coba lagi." : "Tidak ada hasil. Cari berdasarkan nama atau kode."}
      onValueChange={(value) => onChange(options.find((row) => row.value === value) ?? null)} />
  </div>;
}

function ImageField({ stored, required = false }: { stored?: string | null; required?: boolean }) {
  const fieldId = useId();
  const src = toFileSrc(stored ?? null);
  return <div className="space-y-1.5">
    <Label htmlFor={fieldId}>Gambar {required && "(wajib)"}</Label>
    {src && <Image src={src} alt="Gambar tersimpan" width={64} height={64} unoptimized className="size-16 rounded-lg object-contain" />}
    <Input id={fieldId} name="image" type="file" accept="image/jpeg,image/png,image/webp" required={required && !stored} />
    <p className="text-muted-foreground text-xs">JPG, PNG, atau WebP. Maksimal 2 MB.</p>
  </div>;
}

function ActiveField({ active }: { active: boolean }) {
  return <label className="flex w-fit items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={active} /> Aktif</label>;
}

function ProductFields({ data }: { data: Extract<CatalogEditorData, { section: "list" }> }) {
  const { product, brandOptions, typeOptions, unitOptions } = data;
  const [alternatives, setAlternatives] = useState(() => data.alternatives.map((unit) => ({ ...unit, key: String(unit.unitId) })));
  return <>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="product-code">SKU</Label><Input id="product-code" name="code" defaultValue={product?.code ?? ""} maxLength={80} required /></div>
      <div className="space-y-1.5"><Label htmlFor="product-name">Nama produk</Label><Input id="product-name" name="name" defaultValue={product?.name} maxLength={200} required /></div>
      <Choice label="Brand" name="brandId" options={brandOptions} defaultValue={String(product?.brandId ?? "")} />
      <Choice label="Tipe produk" name="productTypeId" options={typeOptions} defaultValue={String(product?.productTypeId ?? "")} />
      <Choice label="Satuan dasar" name="baseUnitId" options={unitOptions} defaultValue={String(product?.baseUnitId ?? "")} />
      <ImageField stored={product?.imageUrl} required />
    </div>
    <div className="space-y-1.5"><Label htmlFor="product-description">Deskripsi</Label>
      <Textarea id="product-description" name="description" defaultValue={product?.description ?? ""} maxLength={2000} />
    </div>
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Satuan jual tambahan</legend>
      <p className="text-muted-foreground text-xs">Isi jumlah satuan dasar dalam satu satuan jual. Contoh satu dus berisi 12 botol.</p>
      {alternatives.map((unit) => <div key={unit.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <div className="space-y-1.5"><Label htmlFor={`unit-${unit.key}`}>Satuan</Label>
          <Combobox id={`unit-${unit.key}`} options={unitOptions} value={unit.unitId ? String(unit.unitId) : ""}
            onValueChange={(value) => setAlternatives((rows) => rows.map((row) => row.key === unit.key ? { ...row, unitId: Number(value) } : row))} />
        </div>
        <div className="space-y-1.5"><Label htmlFor={`factor-${unit.key}`}>Isi satuan dasar</Label>
          <Input id={`factor-${unit.key}`} type="number" min="0.000001" step="0.000001" value={unit.factor} required
            onChange={(event) => setAlternatives((rows) => rows.map((row) => row.key === unit.key ? { ...row, factor: event.target.value } : row))} />
        </div>
        <Button type="button" size="icon" variant="outline" aria-label="Lepas satuan jual" onClick={() => setAlternatives((rows) => rows.filter((row) => row.key !== unit.key))}><Trash2Icon /></Button>
      </div>)}
      <input type="hidden" name="alternatives" value={JSON.stringify(alternatives.map(({ unitId, factor }) => ({ unitId, factor })))} />
      <Button type="button" variant="outline" size="sm" disabled={alternatives.length >= 50} onClick={() => setAlternatives((rows) => [...rows, { key: crypto.randomUUID(), unitId: 0, factor: "" }])}>
        <PlusIcon /> Tambah satuan jual
      </Button>
    </fieldset>
    <ActiveField active={!product || product.status === "active"} />
  </>;
}

function PriceFields({ data }: { data: Extract<CatalogEditorData, { section: "prices" }> }) {
  const { price, typeOptions, areaOptions, warehouseOptions } = data;
  const [selection, setSelection] = useState<CatalogOption | null>(price ? { value: String(price.sellUnitId), label: price.label } : null);
  const [scope, setScope] = useState(price?.warehouseId ? "warehouse" : price?.areaId ? "area" : "global");
  return <>
    <Lookup kind="sell-unit" label="Produk dan satuan jual" selection={selection} onChange={setSelection} />
    <input type="hidden" name="sellUnitId" value={selection?.value ?? ""} />
    <Choice label="Tipe outlet" name="outletTypeId" options={typeOptions} defaultValue={String(price?.outletTypeId ?? "")} />
    <div className="space-y-1.5"><Label htmlFor="price-scope">Cakupan harga</Label>
      <select id="price-scope" name="scope" className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm" value={scope} onChange={(event) => setScope(event.target.value)}>
        <option value="global">Global · semua area dan gudang</option><option value="area">Area tertentu</option><option value="warehouse">Gudang tertentu</option>
      </select>
    </div>
    {scope === "area" && <Choice key="area" label="Area" name="locationId" options={areaOptions} defaultValue={String(price?.areaId ?? "")} />}
    {scope === "warehouse" && <Choice key="warehouse" label="Gudang" name="locationId" options={warehouseOptions} defaultValue={String(price?.warehouseId ?? "")} />}
    <div className="space-y-1.5"><Label htmlFor="price-amount">Harga jual</Label><Input id="price-amount" name="amount" type="number" min="0" step="0.01" required defaultValue={price?.amount} /></div>
  </>;
}

export function CatalogEditor({ data, onClose }: { data: CatalogEditorData; onClose: () => void }) {
  const entity = data.section === "list" ? data.product : data.section === "prices" ? data.price : data.reference;
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    if (image instanceof File && image.size > 2 * 1024 * 1024) { setError("Ukuran gambar maksimal 2 MB."); return; }
    if (entity) form.set("id", String(entity.id));
    setError("");
    startTransition(async () => {
      try {
        const result = await saveCatalog(data.section, form);
        if (result.ok) { toast.success("Data tersimpan."); onClose(); }
        else setError(result.error ?? "Data tidak dapat disimpan.");
      } catch { setError("Data tidak dapat disimpan. Silakan coba lagi."); }
    });
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{entity ? "Ubah" : "Tambah"} {CATALOG_SECTIONS[data.section].title === "Daftar Produk" ? "Produk" : CATALOG_SECTIONS[data.section].title}</DialogTitle>
        <DialogDescription>{data.section === "prices" ? "Harga berlaku untuk satu satuan jual, tipe outlet, dan cakupan." : "Lengkapi data untuk katalog organisasi Anda."}</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {data.section === "list" ? <ProductFields data={data} /> : data.section === "prices" ? <PriceFields data={data} /> : <>
          <div className="space-y-1.5"><Label htmlFor="catalog-name">Nama</Label><Input id="catalog-name" name="name" defaultValue={data.reference?.name} maxLength={150} required /></div>
          {data.section === "brands" && <ImageField stored={data.reference?.imageUrl} />}
          {data.section === "units" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowFraction" defaultChecked={data.reference?.allowFraction} /> Kuantitas boleh pecahan</label>}
          <ActiveField active={data.reference?.isActive ?? true} />
        </>}
        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
        {confirmDelete && <p className="text-sm">{data.section === "list" ? "Hapus produk beserta satuan dan harga jualnya?" : "Hapus data ini?"}</p>}
        <DialogFooter>
          {entity && <Button type="button" disabled={pending} variant="destructive" onClick={() => {
            if (!confirmDelete) { setConfirmDelete(true); return; }
            setError("");
            startTransition(async () => {
              try {
                const result = await deleteCatalog(data.section, entity.id);
                if (result.ok) { toast.success("Data dihapus."); onClose(); }
                else setError(result.error ?? "Data tidak dapat dihapus.");
              } catch { setError("Data tidak dapat dihapus. Silakan coba lagi."); }
            });
          }}>{confirmDelete ? "Konfirmasi hapus" : "Hapus"}</Button>}
          <Button type="button" variant="outline" disabled={pending} onClick={confirmDelete ? () => setConfirmDelete(false) : onClose}>Batal</Button>
          {!confirmDelete && <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>}
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function CatalogPricePreview({ currency, onClose }: { currency: string; onClose: () => void }) {
  const [unit, setUnit] = useState<CatalogOption | null>(null);
  const [outlet, setOutlet] = useState<CatalogOption | null>(null);
  const [result, setResult] = useState<{ key: string; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const key = `${unit?.value}:${outlet?.value}`;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90svh] overflow-y-auto">
      <DialogHeader><DialogTitle>Pratinjau harga efektif</DialogTitle>
        <DialogDescription>Harga dihitung dari tipe outlet dan gudang yang terdaftar pada outlet.</DialogDescription></DialogHeader>
      <Lookup kind="sell-unit" label="Produk dan satuan jual" selection={unit} onChange={setUnit} />
      <Lookup kind="outlet" label="Outlet" selection={outlet} onChange={setOutlet} />
      {result?.key === key && <p role="status" className="rounded-lg border p-3 text-sm font-medium">{result.text}</p>}
      <DialogFooter><Button disabled={!unit || !outlet || pending} onClick={() => {
        if (!unit || !outlet) return;
        startTransition(async () => {
          try {
            const price = await previewCatalogPrice(Number(unit.value), Number(outlet.value));
            setResult({ key, text: price ? `${formatCatalogPrice(price.amount, currency)} · ${price.source}` : "Harga belum diatur." });
          } catch { setResult({ key, text: "Harga gagal diperiksa. Coba lagi." }); }
        });
      }}>{pending ? "Memeriksa…" : "Periksa harga"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
