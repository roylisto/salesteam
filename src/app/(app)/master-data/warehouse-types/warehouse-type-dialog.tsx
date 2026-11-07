"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [active, setActive] = useState(warehouseType?.isActive ?? true);

  const isEdit = warehouseType !== null;

  function handleSubmit(formData: FormData) {
    if (warehouseType) formData.set("id", String(warehouseType.id));
    formData.set("isActive", active ? "true" : "false");

    startTransition(async () => {
      const result = warehouseType
        ? await updateWarehouseType(undefined, formData)
        : await createWarehouseType(undefined, formData);

      if (result?.ok) {
        toast.success(warehouseType ? "Tipe gudang diperbarui." : "Tipe gudang dibuat.");
        setErrors({});
        onOpenChange(false);
        router.refresh();
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
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus tipe gudang ini.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
