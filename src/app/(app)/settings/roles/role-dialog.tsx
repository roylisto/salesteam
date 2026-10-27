"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createRole, deleteRole, updateRole } from "@/lib/actions/roles";
import { ASSIGNABLE_PERMISSIONS } from "@/lib/permissions";

import type { RoleDetail } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function RoleDialog({
  role,
  open,
  onOpenChange,
}: {
  role: RoleDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>(
    role?.permissions ?? ["dashboard"],
  );
  const [confirming, setConfirming] = useState(false);

  const isEdit = role !== null;

  function toggle(key: string) {
    setSelected((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
    );
  }

  function handleSubmit(formData: FormData) {
    for (const key of selected) formData.append("permissions", key);
    if (role) formData.set("id", String(role.id));

    startTransition(async () => {
      const result = role
        ? await updateRole(undefined, formData)
        : await createRole(undefined, formData);

      if (result?.ok) {
        toast.success(role ? "Peran diperbarui." : "Peran dibuat.");
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
    if (!role) return;

    const formData = new FormData();
    formData.set("id", String(role.id));

    startTransition(async () => {
      const result = await deleteRole(formData);

      if (result?.ok) {
        toast.success("Peran dihapus.");
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus peran ini.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah peran" : "Peran baru"}</DialogTitle>
          <DialogDescription>
            Pilih modul mana yang dapat diakses peran ini. Modul khusus Admin
            tetap pada Admin sistem.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Nama</Label>
            <Input
              id="role-name"
              name="name"
              defaultValue={role?.name ?? ""}
              placeholder="Manajer regional"
              required
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-description">Deskripsi</Label>
            <Input
              id="role-description"
              name="description"
              defaultValue={role?.description ?? ""}
              placeholder="Opsional"
            />
            <FieldError message={errors.description} />
          </div>

          <div className="space-y-2">
            <Label>Izin</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {ASSIGNABLE_PERMISSIONS.map((permission) => {
                const checked = selected.includes(permission.key);
                return (
                  <label
                    key={permission.key}
                    className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(permission.key)}
                    />
                    {permission.label}
                  </label>
                );
              })}
            </div>
            <FieldError message={errors.permissions} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Simpan peran" : "Buat peran"}
            </Button>
          </DialogFooter>
        </form>

        {isEdit && role ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                {role.memberCount > 0
                  ? `${role.memberCount} anggota menggunakan peran ini.`
                  : "Tidak ada anggota yang menggunakan peran ini."}
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
                  Hapus peran
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
