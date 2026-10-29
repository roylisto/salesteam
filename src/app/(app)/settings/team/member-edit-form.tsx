"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  deleteMember,
  resetMemberPassword,
  updateMember,
} from "@/lib/actions/account";
import { SYSTEM_ADMIN_ROLE_VALUE } from "@/lib/permissions";

import {
  AreaChecklist,
  FieldError,
  ReportingSelect,
  RoleSelect,
  UserTypeSelect,
  WarehouseChecklist,
  useAllowedAreas,
  useWarehousesByArea,
} from "./member-fields";
import type { AreaOption, MemberRow, RoleOption, WarehouseOption } from "./types";

const LIST_PATH = "/settings/team";

export function MemberEditForm({
  member,
  roles,
  areas,
  warehouses,
  assignableAreas,
  members,
  currentUserId,
  isAdmin: actorIsAdmin,
}: {
  member: MemberRow;
  roles: RoleOption[];
  areas: AreaOption[];
  warehouses: WarehouseOption[];
  assignableAreas: AreaOption[];
  members: MemberRow[];
  currentUserId: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const passwordForm = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roleId, setRoleId] = useState(
    member.isOrganizationOwner || member.isAdmin
      ? SYSTEM_ADMIN_ROLE_VALUE
      : member.roleId
        ? String(member.roleId)
        : "",
  );
  const [userType, setUserType] = useState<"back_office" | "sales">(
    member.userType ?? "back_office",
  );
  const [reportsTo, setReportsTo] = useState(
    member.reportsTo ? String(member.reportsTo) : "",
  );
  const [areaIds, setAreaIds] = useState<number[]>(member.areaIds);
  const [warehouseIds, setWarehouseIds] = useState<number[]>(member.warehouseIds);
  const [active, setActive] = useState(member.isActive);
  const [confirming, setConfirming] = useState(false);

  const allowedAreas = useAllowedAreas(areas, assignableAreas, members, reportsTo, actorIsAdmin);
  const warehousesByArea = useWarehousesByArea(warehouses);

  const isProtected = member.isOrganizationOwner || member.id === currentUserId;
  // Only an Admin can set someone else's password; members change their own
  // from the profile page.
  const canResetPassword = actorIsAdmin && member.id !== currentUserId;

  /** Drop any selected warehouse whose area is no longer part of the selection. */
  function pruneWarehouses(keptAreaIds: number[]) {
    const keep = new Set<number>();
    for (const areaId of keptAreaIds) {
      for (const warehouseId of warehousesByArea.get(areaId) ?? []) {
        keep.add(warehouseId);
      }
    }
    setWarehouseIds((prev) => prev.filter((id) => keep.has(id)));
  }

  function toggleArea(id: number) {
    const next = areaIds.includes(id)
      ? areaIds.filter((item) => item !== id)
      : [...areaIds, id];
    setAreaIds(next);
    pruneWarehouses(next);
  }

  function toggleWarehouse(id: number) {
    setWarehouseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleProfile(formData: FormData) {
    formData.set("id", String(member.id));
    formData.set("roleId", roleId);
    formData.set("userType", userType);
    formData.set("reportsTo", reportsTo);
    formData.delete("areaIds");
    for (const id of areaIds) formData.append("areaIds", String(id));
    formData.delete("warehouseIds");
    for (const id of warehouseIds) formData.append("warehouseIds", String(id));
    formData.set("isActive", active ? "true" : "false");

    startTransition(async () => {
      const result = await updateMember(undefined, formData);

      if (result?.ok) {
        toast.success("Anggota diperbarui.");
        setErrors({});
        router.refresh();
        return;
      }

      setErrors(result?.fieldErrors ?? {});
      if (result?.error) toast.error(result.error);
    });
  }

  function handlePassword(formData: FormData) {
    formData.set("id", String(member.id));

    startTransition(async () => {
      const result = await resetMemberPassword(undefined, formData);

      if (result?.ok) {
        toast.success("Kata sandi diperbarui.");
        setErrors({});
        passwordForm.current?.reset();
        return;
      }

      setErrors(result?.fieldErrors ?? {});
      if (result?.error) toast.error(result.error);
    });
  }

  function handleDelete() {
    const formData = new FormData();
    formData.set("id", String(member.id));

    startTransition(async () => {
      const result = await deleteMember(formData);

      if (result?.ok) {
        toast.success("Anggota dihapus.");
        router.push(LIST_PATH);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus anggota ini.");
    });
  }

  return (
    <div className="space-y-3">
      <form action={handleProfile} className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Kiri: data diri */}
          <Card size="sm">
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-name">Nama lengkap</Label>
                <Input id="edit-name" name="name" defaultValue={member.name} required />
                <FieldError message={errors.name} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={member.email}
                  required
                />
                <FieldError message={errors.email} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Telepon</Label>
                <Input id="edit-phone" name="phone" defaultValue={member.phone ?? ""} />
                <FieldError message={errors.phone} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-code">Kode pegawai</Label>
                <Input id="edit-code" name="code" defaultValue={member.code ?? ""} />
                <FieldError message={errors.code} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-username">Nama pengguna</Label>
                <Input
                  id="edit-username"
                  name="username"
                  autoComplete="off"
                  placeholder="Opsional, mis. budi.santoso"
                  defaultValue={member.username ?? ""}
                />
                <FieldError message={errors.username} />
              </div>

              <div className="space-y-1.5">
                <Label>Tipe pengguna</Label>
                <UserTypeSelect
                  value={userType}
                  onChange={setUserType}
                  disabled={member.isOrganizationOwner}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Peran</Label>
                <RoleSelect
                  value={roleId}
                  onChange={setRoleId}
                  roles={roles}
                  actorIsAdmin={actorIsAdmin}
                  disabled={isProtected}
                />
                <FieldError message={errors.roleId} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-reports">Atasan</Label>
                <ReportingSelect
                  value={reportsTo}
                  onChange={setReportsTo}
                  members={members}
                  excludeId={member.id}
                  idPrefix="edit-reports"
                />
                <FieldError message={errors.reportsTo} />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-active">Aktif</Label>
                  <p className="text-muted-foreground text-xs">
                    {isProtected
                      ? "Pemilik organisasi dan akun Anda selalu dalam keadaan aktif."
                      : "Anggota yang tidak aktif tidak dapat masuk."}
                  </p>
                </div>
                <Switch
                  id="edit-active"
                  checked={active}
                  onCheckedChange={setActive}
                  disabled={isProtected}
                />
              </div>
            </CardContent>
          </Card>

          {/* Kanan: area & gudang */}
          <Card size="sm">
            <CardContent className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Area</Label>
                <AreaChecklist
                  options={allowedAreas}
                  selected={areaIds}
                  onToggle={toggleArea}
                />
                <FieldError message={errors.areaIds} />
              </div>

              <div className="space-y-1.5">
                <Label>Gudang</Label>
                <WarehouseChecklist
                  warehouses={warehouses}
                  areas={areas}
                  selectedAreas={areaIds}
                  selected={warehouseIds}
                  onToggle={toggleWarehouse}
                />
                <FieldError message={errors.warehouseIds} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            {member.lastLoginAt
              ? `Terakhir masuk ${new Date(member.lastLoginAt).toLocaleString("id-ID")}`
              : "Belum pernah masuk"}
          </p>
          <div className="flex gap-2">
            <Button
              render={<Link href={LIST_PATH} />}
              nativeButton={false}
              variant="outline"
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Simpan perubahan
            </Button>
          </div>
        </div>
      </form>

      {canResetPassword ? (
        <Card size="sm">
          <CardContent>
            <form
              ref={passwordForm}
              action={handlePassword}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-56 flex-1 space-y-1.5">
                <Label htmlFor="edit-password">Reset kata sandi</Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Kata sandi baru"
                  required
                />
                <FieldError message={errors.password} />
              </div>
              <Button type="submit" variant="outline" disabled={pending}>
                Perbarui kata sandi
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isProtected ? null : (
        <Card size="sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Menghapus anggota juga menghapus sesi mereka.
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
              <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
                Hapus anggota
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
