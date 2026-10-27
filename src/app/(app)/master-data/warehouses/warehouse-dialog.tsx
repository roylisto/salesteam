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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  createWarehouse,
  deleteWarehouse,
  updateWarehouse,
} from "@/lib/actions/warehouses";

import type { AreaOption, WarehouseRow } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function WarehouseDialog({
  warehouse,
  areas,
  open,
  onOpenChange,
}: {
  warehouse: WarehouseRow | null;
  areas: AreaOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [areaOfficeId, setAreaOfficeId] = useState<string>(
    warehouse?.areaOfficeId ? String(warehouse.areaOfficeId) : "",
  );
  const [active, setActive] = useState(warehouse?.isActive ?? true);

  const isEdit = warehouse !== null;
  const selectedAreaName =
    areas.find((area) => String(area.id) === areaOfficeId)?.name ?? undefined;

  function handleSubmit(formData: FormData) {
    if (warehouse) formData.set("id", String(warehouse.id));
    formData.set("areaOfficeId", areaOfficeId);
    formData.set("isActive", active ? "true" : "false");

    startTransition(async () => {
      const result = warehouse
        ? await updateWarehouse(undefined, formData)
        : await createWarehouse(undefined, formData);

      if (result?.ok) {
        toast.success(warehouse ? "Gudang diperbarui." : "Gudang dibuat.");
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
    if (!warehouse) return;

    const formData = new FormData();
    formData.set("id", String(warehouse.id));

    startTransition(async () => {
      const result = await deleteWarehouse(formData);

      if (result?.ok) {
        toast.success("Gudang dihapus.");
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus gudang ini.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah gudang" : "Gudang baru"}</DialogTitle>
          <DialogDescription>
            Setiap gudang termasuk dalam satu area. Satu area dapat menampung banyak gudang.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="warehouse-area">Area</Label>
            <Select
              value={areaOfficeId}
              onValueChange={(value) => setAreaOfficeId(value ?? "")}
            >
              <SelectTrigger id="warehouse-area" className="w-full">
                <SelectValue placeholder="Pilih area">
                  {selectedAreaName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={String(area.id)}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.areaOfficeId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-name">Nama</Label>
            <Input
              id="warehouse-name"
              name="name"
              defaultValue={warehouse?.name ?? ""}
              placeholder="Gudang Utama"
              required
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-type">Tipe depo</Label>
            <Input
              id="warehouse-type"
              name="depotType"
              defaultValue={warehouse?.depotType ?? ""}
              placeholder="Opsional, mis. Utama / Transit"
            />
            <FieldError message={errors.depotType} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="warehouse-active">Aktif</Label>
              <p className="text-muted-foreground text-xs">
                Gudang tidak aktif disembunyikan dari penugasan baru.
              </p>
            </div>
            <Switch
              id="warehouse-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Simpan gudang" : "Buat gudang"}
            </Button>
          </DialogFooter>
        </form>

        {isEdit && warehouse ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Outlet dan stok yang terkait dengan gudang ini akan menyimpan riwayatnya.
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
                  Hapus gudang
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
