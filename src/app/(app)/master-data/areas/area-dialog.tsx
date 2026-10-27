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
import { createArea, deleteArea, updateArea } from "@/lib/actions/areas";

import type { AreaRow } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function AreaDialog({
  area,
  open,
  onOpenChange,
}: {
  area: AreaRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  const isEdit = area !== null;

  function handleSubmit(formData: FormData) {
    if (area) formData.set("id", String(area.id));

    startTransition(async () => {
      const result = area
        ? await updateArea(undefined, formData)
        : await createArea(undefined, formData);

      if (result?.ok) {
        toast.success(area ? "Area diperbarui." : "Area dibuat.");
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
    if (!area) return;

    const formData = new FormData();
    formData.set("id", String(area.id));

    startTransition(async () => {
      const result = await deleteArea(formData);

      if (result?.ok) {
        toast.success("Area dihapus.");
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus area ini.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah area" : "Area baru"}</DialogTitle>
          <DialogDescription>
            Area mengelompokkan gudang dan outlet berdasarkan wilayah.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="area-name">Nama</Label>
            <Input
              id="area-name"
              name="name"
              defaultValue={area?.name ?? ""}
              placeholder="Jakarta Metro"
              required
            />
            <FieldError message={errors.name} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Simpan area" : "Buat area"}
            </Button>
          </DialogFooter>
        </form>

        {isEdit && area ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Gudang di area ini akan menjadi belum ditugaskan.
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
                  Hapus area
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
