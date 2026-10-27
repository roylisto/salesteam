"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { CheckIcon, CopyIcon, Loader2Icon, LogInIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  createMember,
  deleteMember,
  resetMemberPassword,
  updateMember,
} from "@/lib/actions/account";
import { SYSTEM_ADMIN_ROLE_VALUE } from "@/lib/permissions";

import type { AreaOption, MemberRow, RoleOption, WarehouseOption } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

type DialogProps = {
  roles: RoleOption[];
  areas: AreaOption[];
  warehouses: WarehouseOption[];
  assignableAreas: AreaOption[];
  members: MemberRow[];
  currentUserId: number;
  isAdmin: boolean;
};

/** Warehouse ids grouped by the area they belong to. */
function useWarehousesByArea(warehouses: WarehouseOption[]) {
  return useMemo(() => {
    const map = new Map<number, number[]>();
    for (const warehouse of warehouses) {
      const list = map.get(warehouse.areaOfficeId) ?? [];
      list.push(warehouse.id);
      map.set(warehouse.areaOfficeId, list);
    }
    return map;
  }, [warehouses]);
}

function useAllowedAreas(
  areas: AreaOption[],
  assignableAreas: AreaOption[],
  members: MemberRow[],
  reportsTo: string,
  actorIsAdmin: boolean,
) {
  return useMemo(() => {
    const reporter =
      reportsTo === "" ? null : members.find((m) => String(m.id) === reportsTo) ?? null;
    if (!reporter) {
      return actorIsAdmin ? areas : assignableAreas;
    }
    if (reporter.isOrganizationOwner || reporter.isAdmin) {
      return actorIsAdmin ? areas : assignableAreas;
    }
    const reporterSet = new Set(reporter.areaIds);
    const base = areas.filter((area) => reporterSet.has(area.id));
    if (actorIsAdmin) return base;
    const allowedSet = new Set(assignableAreas.map((area) => area.id));
    return base.filter((area) => allowedSet.has(area.id));
  }, [areas, assignableAreas, members, reportsTo, actorIsAdmin]);
}

function RoleSelect({
  value,
  onChange,
  roles,
  actorIsAdmin,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  roles: RoleOption[];
  actorIsAdmin: boolean;
  disabled?: boolean;
}) {
  const showAdminOption = actorIsAdmin || value === SYSTEM_ADMIN_ROLE_VALUE;
  const selectedName =
    value === SYSTEM_ADMIN_ROLE_VALUE
      ? "Admin (sistem)"
      : (roles.find((r) => String(r.id) === value)?.name ?? undefined);
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih peran">{selectedName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showAdminOption ? (
          <SelectItem value={SYSTEM_ADMIN_ROLE_VALUE}>
            Admin (sistem)
          </SelectItem>
        ) : null}
        {roles.map((role) => (
          <SelectItem key={role.id} value={String(role.id)}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReportingSelect({
  value,
  onChange,
  members,
  excludeId,
  idPrefix,
}: {
  value: string;
  onChange: (value: string) => void;
  members: MemberRow[];
  excludeId?: number;
  idPrefix: string;
}) {
  const options = members.filter((m) => m.id !== excludeId);
  const selectedName =
    value === ""
      ? "Tanpa garis atasan"
      : (options.find((m) => String(m.id) === value)?.name ?? undefined);
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger id={idPrefix} className="w-full">
        <SelectValue placeholder="Pilih atasan">
          {selectedName}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Tanpa garis atasan</SelectItem>
        {options.map((member) => (
          <SelectItem key={member.id} value={String(member.id)}>
            {member.name} · {member.roleName ?? "Belum ditugaskan"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AreaChecklist({
  options,
  selected,
  onToggle,
}: {
  options: AreaOption[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Belum ada area yang tersedia untuk garis atasan ini.
      </p>
    );
  }
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {options.map((area) => {
        const checked = selected.includes(area.id);
        return (
          <label
            key={area.id}
            className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(area.id)}
            />
            {area.name}
          </label>
        );
      })}
    </div>
  );
}

/**
 * Warehouse checklist grouped and separated by area. Only areas that have been
 * selected above are shown, so an area must be chosen before any of its
 * warehouses can be picked. A member may select multiple warehouses per area.
 */
function WarehouseChecklist({
  warehouses,
  areas,
  selectedAreas,
  selected,
  onToggle,
}: {
  warehouses: WarehouseOption[];
  areas: AreaOption[];
  selectedAreas: number[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  if (selectedAreas.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Pilih area terlebih dahulu untuk memilih gudangnya.
      </p>
    );
  }

  const groups = areas
    .filter((area) => selectedAreas.includes(area.id))
    .map((area) => ({
      area,
      items: warehouses.filter((warehouse) => warehouse.areaOfficeId === area.id),
    }));

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Area yang dipilih belum memiliki gudang.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(({ area, items }) => (
        <div key={area.id} className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">{area.name}</p>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Tidak ada gudang di area ini.
            </p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {items.map((warehouse) => {
                const checked = selected.includes(warehouse.id);
                return (
                  <label
                    key={warehouse.id}
                    className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(warehouse.id)}
                    />
                    {warehouse.name}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function CreateMemberDialog({
  open,
  onOpenChange,
  roles,
  areas,
  warehouses,
  assignableAreas,
  members,
  isAdmin: actorIsAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & DialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Admin is a virtual system role; only pre-selected when the actor may grant it.
  const [roleId, setRoleId] = useState<string>(
    actorIsAdmin ? SYSTEM_ADMIN_ROLE_VALUE : "",
  );
  const [reportsTo, setReportsTo] = useState<string>("");
  const [areaIds, setAreaIds] = useState<number[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<number[]>([]);
  // Credentials are generated by the system, so the result is shown here.
  const [created, setCreated] = useState<{
    name: string;
    email: string;
    username: string;
    password: string;
    emailSent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const allowedAreas = useAllowedAreas(areas, assignableAreas, members, reportsTo, actorIsAdmin);
  const warehousesByArea = useWarehousesByArea(warehouses);

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

  function handleReportsChange(value: string) {
    setReportsTo(value);
    // Drop areas that are no longer handed down by the new reporting line.
    let next = areaIds;
    if (value === "") {
      next = actorIsAdmin ? areaIds : [];
    } else {
      const reporter = members.find((m) => String(m.id) === value);
      if (reporter && !reporter.isOrganizationOwner && !reporter.isAdmin) {
        const allowed = new Set(reporter.areaIds);
        next = areaIds.filter((id) => allowed.has(id));
      }
    }
    setAreaIds(next);
    pruneWarehouses(next);
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Tidak dapat menyalin. Pilih kata sandi dan salin secara manual.");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCreated(null);
      setCopied(false);
      setErrors({});
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(formData: FormData) {
    formData.set("roleId", roleId);
    formData.set("reportsTo", reportsTo);
    formData.delete("areaIds");
    for (const id of areaIds) formData.append("areaIds", String(id));
    formData.delete("warehouseIds");
    for (const id of warehouseIds) formData.append("warehouseIds", String(id));

    startTransition(async () => {
      const result = await createMember(undefined, formData);

      if (result?.ok && result.temporaryPassword) {
        setErrors({});
        setCreated({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          username: String(formData.get("username") ?? "").trim().toLowerCase(),
          password: result.temporaryPassword,
          emailSent: result.emailSent ?? false,
        });
        if (result.emailSent) toast.success("Anggota tim ditambahkan.");
        else
          toast.warning(
            "Anggota ditambahkan, tetapi email tidak dapat dikirim. Bagikan kata sandi di bawah ini.",
          );
        router.refresh();
        return;
      }

      setErrors(result?.fieldErrors ?? {});
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {created ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{created.name} ditambahkan</DialogTitle>
              <DialogDescription>
                {created.emailSent
                  ? `Kata sandi sementara telah dikirim melalui email ke ${created.email}.`
                  : `Email ke ${created.email} tidak dapat dikirim. Bagikan kata sandi ini kepada mereka secara manual.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="created-password">Kata sandi sementara</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  {copied ? "Tersalin" : "Salin"}
                </Button>
              </div>
              <p
                id="created-password"
                className="font-mono text-lg font-semibold tracking-widest"
              >
                {created.password}
              </p>
              <p className="text-muted-foreground text-xs">
                Anggota akan diminta memilih kata sandi sendiri saat pertama kali
                masuk.
              </p>
              {created.username ? (
                <p className="text-muted-foreground text-xs">
                  Nama pengguna:{" "}
                  <span className="text-foreground font-medium">
                    {created.username}
                  </span>
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Selesai
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle>Tambah anggota tim</DialogTitle>
          <DialogDescription>
            Tetapkan peran, garis atasan, area, dan gudang mereka. Area harus
            diturunkan dari atasan mereka, dan gudang dipilih di dalam area
            tersebut.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="member-name">Nama lengkap</Label>
              <Input id="member-name" name="name" required />
              <FieldError message={errors.name} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                name="email"
                type="email"
                placeholder="teammate@company.com"
                required
              />
              <FieldError message={errors.email} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="member-username">Nama pengguna</Label>
              <Input
                id="member-username"
                name="username"
                autoComplete="off"
                placeholder="Opsional, mis. budi.santoso"
              />
              <p className="text-muted-foreground text-xs">
                Bisa dipakai untuk masuk selain email.
              </p>
              <FieldError message={errors.username} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member-phone">Telepon</Label>
              <Input id="member-phone" name="phone" />
              <FieldError message={errors.phone} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member-code">Kode pegawai</Label>
              <Input id="member-code" name="code" placeholder="Opsional" />
              <FieldError message={errors.code} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Peran</Label>
              <RoleSelect
                value={roleId}
                onChange={setRoleId}
                roles={roles}
                actorIsAdmin={actorIsAdmin}
              />
              <FieldError message={errors.roleId} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="member-reports">Atasan</Label>
              <ReportingSelect
                value={reportsTo}
                onChange={handleReportsChange}
                members={members}
                idPrefix="member-reports"
              />
              <FieldError message={errors.reportsTo} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Area</Label>
              <AreaChecklist
                options={allowedAreas}
                selected={areaIds}
                onToggle={toggleArea}
              />
              <FieldError message={errors.areaIds} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
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

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Kata sandi sementara</Label>
              <p className="text-muted-foreground text-xs">
                Dibuat secara otomatis dan dikirim melalui email ke anggota.
                Mereka akan menetapkan kata sandi sendiri saat pertama kali masuk.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Tambah anggota
            </Button>
          </DialogFooter>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function MemberDetailDialog({
  member,
  roles,
  areas,
  warehouses,
  assignableAreas,
  members,
  currentUserId,
  isAdmin: actorIsAdmin,
  open,
  onOpenChange,
}: {
  member: MemberRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & DialogProps) {
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
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Tidak dapat menghapus anggota ini.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {member.name}
            {member.isOrganizationOwner ? (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheckIcon className="size-3" />
                Pemilik
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {member.username ? `@${member.username} · ${member.email}` : member.email}
          </DialogDescription>
        </DialogHeader>

        <form action={handleProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-name">Nama lengkap</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={member.name}
                required
              />
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

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-username">Nama pengguna</Label>
              <Input
                id="edit-username"
                name="username"
                autoComplete="off"
                defaultValue={member.username ?? ""}
                placeholder="Opsional, mis. budi.santoso"
              />
              <p className="text-muted-foreground text-xs">
                Bisa dipakai untuk masuk selain email.
              </p>
              <FieldError message={errors.username} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Telepon</Label>
              <Input
                id="edit-phone"
                name="phone"
                defaultValue={member.phone ?? ""}
              />
              <FieldError message={errors.phone} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-code">Kode pegawai</Label>
              <Input
                id="edit-code"
                name="code"
                defaultValue={member.code ?? ""}
              />
              <FieldError message={errors.code} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
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

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Area</Label>
              <AreaChecklist
                options={allowedAreas}
                selected={areaIds}
                onToggle={toggleArea}
              />
              <FieldError message={errors.areaIds} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
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

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
              <div className="space-y-0.5">
                <Label htmlFor="edit-active">Aktif</Label>
                <p className="text-muted-foreground text-xs">
                  {isProtected
                    ? "Pemilik organisasi selalu dalam keadaan aktif."
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
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Simpan perubahan
            </Button>
          </DialogFooter>
        </form>

        {canResetPassword ? (
          <>
            <Separator />

            <form ref={passwordForm} action={handlePassword} className="space-y-4">
              <div className="space-y-1.5">
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
              <DialogFooter>
                <Button type="submit" variant="outline" disabled={pending}>
                  {pending ? <Loader2Icon className="animate-spin" /> : null}
                  Perbarui kata sandi
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}

        {isProtected ? null : (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-muted-foreground text-xs">
                Menghapus anggota juga menghapus sesi mereka.
              </div>
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
                  Hapus anggota
                </Button>
              )}
            </div>
          </>
        )}

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <LogInIcon className="size-3.5" />
          {member.lastLoginAt
            ? `Terakhir masuk ${new Date(member.lastLoginAt).toLocaleString()}`
            : "Belum pernah masuk"}
        </p>
      </DialogContent>
    </Dialog>
  );
}
