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
  createOutletType,
  deleteOutletType,
  updateOutletType,
} from "@/lib/actions/outlet-types";

import type { OutletTypeRow } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function OutletTypeDialog({
  outletType,
  open,
  onOpenChange,
}: {
  outletType: OutletTypeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [active, setActive] = useState(outletType?.isActive ?? true);

  const isEdit = outletType !== null;

  function handleSubmit(formData: FormData) {
    if (outletType) formData.set("id", String(outletType.id));
    formData.set("isActive", active ? "true" : "false");

    startTransition(async () => {
      const result = outletType
        ? await updateOutletType(undefined, formData)
        : await createOutletType(undefined, formData);

      if (result?.ok) {
        toast.success(outletType ? "Tipe outlet diperbarui." : "Tipe outlet dibuat.");
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
    if (!outletType) return;

    const formData = new FormData();
    formData.set("id", String(outletType.id));

    startTransition(async () => {
      const result = await deleteOutletType(formData);

      if (result?.ok) {
        toast.success("Tipe outlet dihapus.");
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus tipe outlet ini.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Ubah tipe outlet" : "Tipe outlet baru"}
          </DialogTitle>
          <DialogDescription>
            Tipe outlet mengklasifikasikan toko berdasarkan saluran, mis. Retail, Grosir, Horeca.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="outlet-type-name">Nama</Label>
            <Input
              id="outlet-type-name"
              name="name"
              defaultValue={outletType?.name ?? ""}
              placeholder="Retail"
              required
            />
            <FieldError message={errors.name} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="outlet-type-active">Aktif</Label>
              <p className="text-muted-foreground text-xs">
                Tipe tidak aktif tetap ada pada outlet yang sudah ada, tetapi tidak
                dapat dipilih untuk outlet baru.
              </p>
            </div>
            <Switch
              id="outlet-type-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Simpan tipe outlet" : "Buat tipe outlet"}
            </Button>
          </DialogFooter>
        </form>

        {isEdit && outletType ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Outlet yang menggunakan tipe ini akan menyimpan labelnya tetapi menjadi
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
                  Hapus tipe outlet
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
