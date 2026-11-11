"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProgressTransition } from "@/components/action-progress";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { WarehouseTypeSymbol, WAREHOUSE_ICONS } from "@/components/warehouse-type-symbol";
import { DEFAULT_WAREHOUSE_COLOR, DEFAULT_WAREHOUSE_ICON, WAREHOUSE_COLORS, WAREHOUSE_ICON_KEYS } from "@/lib/warehouse-appearance";
import { cn } from "@/lib/utils";
import {
  createWarehouseType,
  deleteWarehouseType,
  updateWarehouseType,
} from "@/lib/actions/warehouse-types";

import type { WarehouseTypeRow } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function WarehouseTypeDialog({
  warehouseType,
  open,
  onOpenChange,
}: {
  warehouseType: WarehouseTypeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useProgressTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [active, setActive] = useState(warehouseType?.isActive ?? true);
  const [color, setColor] = useState(warehouseType?.color ?? DEFAULT_WAREHOUSE_COLOR);
  const [icon, setIcon] = useState(warehouseType?.icon ?? DEFAULT_WAREHOUSE_ICON);

  const isEdit = warehouseType !== null;

  function handleSubmit(formData: FormData) {
    if (warehouseType) formData.set("id", String(warehouseType.id));
    formData.set("isActive", active ? "true" : "false");
    formData.set("color", color);
    formData.set("icon", icon);

    startTransition(async () => {
      const result = warehouseType
        ? await updateWarehouseType(undefined, formData)
        : await createWarehouseType(undefined, formData);

      if (result?.ok) {
        toast.success(warehouseType ? "Tipe gudang diperbarui." : "Tipe gudang dibuat.");
        setErrors({});
        onOpenChange(false);
        startTransition(() => router.refresh());
        return;
      }

      setErrors(result?.fieldErrors ?? {});
      if (result?.error) toast.error(result.error);
    });
  }

  function handleDelete() {
    if (!warehouseType) return;

    const formData = new FormData();
    formData.set("id", String(warehouseType.id));

    startTransition(async () => {
      const result = await deleteWarehouseType(formData);

      if (result?.ok) {
        toast.success("Tipe gudang dihapus.");
        onOpenChange(false);
        startTransition(() => router.refresh());
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus tipe gudang ini.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Ubah tipe gudang" : "Tipe gudang baru"}
          </DialogTitle>
          <DialogDescription>
            Tipe gudang mengklasifikasikan depo berdasarkan fungsinya, mis. Utama,
            Transit, Cabang.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="warehouse-type-name">Nama</Label>
            <Input
              id="warehouse-type-name"
              name="name"
              defaultValue={warehouseType?.name ?? ""}
              placeholder="Utama"
              required
            />
            <FieldError message={errors.name} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Warna</legend>
            <div className="flex flex-wrap gap-2">
              {WAREHOUSE_COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={color === option.value}
                  title={option.label}
                  onClick={() => setColor(option.value)}
                  className={cn("size-8 rounded-full border-2 border-background outline-offset-2 focus-visible:outline-2", color === option.value && "ring-2 ring-foreground")}
                  style={{ backgroundColor: option.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="warehouse-type-color">Warna khusus</Label>
              <input id="warehouse-type-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border p-0.5" />
              <span className="text-muted-foreground text-xs">{color}</span>
            </div>
            <FieldError message={errors.color} />
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Ikon</legend>
            <div className="flex flex-wrap gap-2">
              {WAREHOUSE_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={icon === key}
                  aria-label={WAREHOUSE_ICONS[key].label}
                  title={WAREHOUSE_ICONS[key].label}
                  onClick={() => setIcon(key)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2",
                    icon === key ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                  )}
                >
                  <WarehouseTypeSymbol icon={key} color={color} />
                </button>
              ))}
            </div>
            <FieldError message={errors.icon} />
          </fieldset>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <WarehouseTypeSymbol icon={icon} color={color} className="size-10" />
            <div>
              <p className="text-sm font-medium">Pratinjau penanda gudang</p>
              <p className="text-muted-foreground text-xs">Warna dan ikon ini menjadi identitas tipe gudang.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="warehouse-type-active">Aktif</Label>
              <p className="text-muted-foreground text-xs">
                Tipe tidak aktif tetap ada pada gudang yang sudah ada, tetapi tidak
                dapat dipilih untuk gudang baru.
              </p>
            </div>
            <Switch
              id="warehouse-type-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Simpan tipe gudang" : "Buat tipe gudang"}
            </Button>
          </DialogFooter>
        </form>

        {isEdit && warehouseType ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Gudang yang menggunakan tipe ini akan menyimpan labelnya tetapi menjadi
                belum diatur.
              </p>
              {confirming ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={pending}
                  >
                    {pending ? <Loader2Icon className="animate-spin" /> : null}
                    Konfirmasi hapus
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirming(true)}
                >
                  Hapus tipe gudang
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
