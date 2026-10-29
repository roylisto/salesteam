"use client";

import { useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { SYSTEM_ADMIN_ROLE_VALUE } from "@/lib/permissions";

import type { AreaOption, MemberRow, RoleOption, WarehouseOption } from "./types";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

/** Warehouse ids grouped by the area they belong to. */
export function useWarehousesByArea(warehouses: WarehouseOption[]) {
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

export function useAllowedAreas(
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

const USER_TYPE_OPTIONS: ComboboxOption[] = [
  { value: "back_office", label: "Back Office" },
  { value: "sales", label: "Sales" },
];

export function UserTypeSelect({
  value,
  onChange,
  disabled,
}: {
  value: "back_office" | "sales";
  onChange: (value: "back_office" | "sales") => void;
  disabled?: boolean;
}) {
  return (
    <Combobox
      options={USER_TYPE_OPTIONS}
      value={value}
      onValueChange={(next) => onChange(next === "sales" ? "sales" : "back_office")}
      placeholder="Pilih tipe pengguna"
      disabled={disabled}
    />
  );
}

export function RoleSelect({
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
  const options = useMemo(() => {
    const list: ComboboxOption[] = roles.map((role) => ({
      value: String(role.id),
      label: role.name,
    }));
    // Admin is virtual: only offered to Admins, but kept visible when it is
    // already the member's role.
    if (actorIsAdmin || value === SYSTEM_ADMIN_ROLE_VALUE) {
      list.unshift({ value: SYSTEM_ADMIN_ROLE_VALUE, label: "Admin (sistem)" });
    }
    return list;
  }, [roles, actorIsAdmin, value]);

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="Pilih peran"
      emptyText="Peran tidak ditemukan."
      disabled={disabled}
    />
  );
}

export function ReportingSelect({
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
  const options = useMemo(
    () => [
      { value: "", label: "Tanpa garis atasan" },
      ...members
        .filter((member) => member.id !== excludeId)
        .map((member) => ({
          value: String(member.id),
          label: `${member.name} · ${member.roleName ?? "Belum ditugaskan"}`,
        })),
    ],
    [members, excludeId],
  );

  return (
    <Combobox
      id={idPrefix}
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="Pilih atasan"
      emptyText="Anggota tidak ditemukan."
    />
  );
}

export function AreaChecklist({
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
export function WarehouseChecklist({
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
