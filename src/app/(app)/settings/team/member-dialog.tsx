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

import type { AreaOption, MemberRow, RoleOption } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

type DialogProps = {
  roles: RoleOption[];
  areas: AreaOption[];
  assignableAreas: AreaOption[];
  members: MemberRow[];
  currentUserId: number;
  isAdmin: boolean;
};

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
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  roles: RoleOption[];
  actorIsAdmin: boolean;
  disabled?: boolean;
}) {
  const selectedName =
    value === SYSTEM_ADMIN_ROLE_VALUE
      ? "Admin (system)"
      : (roles.find((r) => String(r.id) === value)?.name ?? undefined);
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a role">{selectedName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SYSTEM_ADMIN_ROLE_VALUE}>
          Admin (system)
        </SelectItem>
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
      ? "No reporting line"
      : (options.find((m) => String(m.id) === value)?.name ?? undefined);
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger id={idPrefix} className="w-full">
        <SelectValue placeholder="Select who they report to">
          {selectedName}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">No reporting line</SelectItem>
        {options.map((member) => (
          <SelectItem key={member.id} value={String(member.id)}>
            {member.name} · {member.roleName ?? "Unassigned"}
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
        No areas available for this reporting line yet.
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

export function CreateMemberDialog({
  open,
  onOpenChange,
  roles,
  areas,
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
  // Admin is a virtual system role and is shown by default.
  const [roleId, setRoleId] = useState<string>(SYSTEM_ADMIN_ROLE_VALUE);
  const [reportsTo, setReportsTo] = useState<string>("");
  const [areaIds, setAreaIds] = useState<number[]>([]);
  // Credentials are generated by the system, so the result is shown here.
  const [created, setCreated] = useState<{
    name: string;
    email: string;
    password: string;
    emailSent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const allowedAreas = useAllowedAreas(areas, assignableAreas, members, reportsTo, actorIsAdmin);

  function toggleArea(id: number) {
    setAreaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleReportsChange(value: string) {
    setReportsTo(value);
    // Drop areas that are no longer handed down by the new reporting line.
    setAreaIds((prev) => {
      if (value === "") return actorIsAdmin ? prev : [];
      const reporter = members.find((m) => String(m.id) === value);
      if (!reporter || reporter.isOrganizationOwner || reporter.isAdmin) return prev;
      const allowed = new Set(reporter.areaIds);
      return prev.filter((id) => allowed.has(id));
    });
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the password and copy it manually.");
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

    startTransition(async () => {
      const result = await createMember(undefined, formData);

      if (result?.ok && result.temporaryPassword) {
        setErrors({});
        setCreated({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: result.temporaryPassword,
          emailSent: result.emailSent ?? false,
        });
        if (result.emailSent) toast.success("Team member added.");
        else
          toast.warning(
            "Member added, but the email could not be sent. Share the password below.",
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
              <DialogTitle>{created.name} added</DialogTitle>
              <DialogDescription>
                {created.emailSent
                  ? `A temporary password was emailed to ${created.email}.`
                  : `The email to ${created.email} could not be sent. Share this password with them manually.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="created-password">Temporary password</Label>
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
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p
                id="created-password"
                className="font-mono text-lg font-semibold tracking-widest"
              >
                {created.password}
              </p>
              <p className="text-muted-foreground text-xs">
                The member will be asked to choose their own password the
                first time they sign in.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Assign their role, reporting line, and areas. Areas must be handed
            down from who they report to.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="member-name">Full name</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="member-phone">Phone</Label>
              <Input id="member-phone" name="phone" />
              <FieldError message={errors.phone} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member-code">Staff code</Label>
              <Input id="member-code" name="code" placeholder="Optional" />
              <FieldError message={errors.code} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Role</Label>
              <RoleSelect
                value={roleId}
                onChange={setRoleId}
                roles={roles}
                actorIsAdmin={actorIsAdmin}
              />
              <FieldError message={errors.roleId} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="member-reports">Reports to</Label>
              <ReportingSelect
                value={reportsTo}
                onChange={handleReportsChange}
                members={members}
                idPrefix="member-reports"
              />
              <FieldError message={errors.reportsTo} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Areas</Label>
              <AreaChecklist
                options={allowedAreas}
                selected={areaIds}
                onToggle={toggleArea}
              />
              <FieldError message={errors.areaIds} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Temporary password</Label>
              <p className="text-muted-foreground text-xs">
                Generated automatically and emailed to the member. They will
                set their own password on first sign-in.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Add member
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
  const [active, setActive] = useState(member.isActive);
  const [confirming, setConfirming] = useState(false);

  const allowedAreas = useAllowedAreas(areas, assignableAreas, members, reportsTo, actorIsAdmin);

  const isProtected = member.isOrganizationOwner || member.id === currentUserId;
  // Only an Admin can set someone else's password; members change their own
  // from the profile page.
  const canResetPassword = actorIsAdmin && member.id !== currentUserId;

  function toggleArea(id: number) {
    setAreaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleProfile(formData: FormData) {
    formData.set("id", String(member.id));
    formData.set("roleId", roleId);
    formData.set("reportsTo", reportsTo);
    formData.delete("areaIds");
    for (const id of areaIds) formData.append("areaIds", String(id));
    formData.set("isActive", active ? "true" : "false");

    startTransition(async () => {
      const result = await updateMember(undefined, formData);

      if (result?.ok) {
        toast.success("Member updated.");
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
        toast.success("Password updated.");
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
        toast.success("Member removed.");
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result?.error ?? "Unable to remove this member.");
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
                Owner
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>

        <form action={handleProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-name">Full name</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                name="phone"
                defaultValue={member.phone ?? ""}
              />
              <FieldError message={errors.phone} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-code">Staff code</Label>
              <Input
                id="edit-code"
                name="code"
                defaultValue={member.code ?? ""}
              />
              <FieldError message={errors.code} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Role</Label>
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
              <Label htmlFor="edit-reports">Reports to</Label>
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
              <Label>Areas</Label>
              <AreaChecklist
                options={allowedAreas}
                selected={areaIds}
                onToggle={toggleArea}
              />
              <FieldError message={errors.areaIds} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
              <div className="space-y-0.5">
                <Label htmlFor="edit-active">Active</Label>
                <p className="text-muted-foreground text-xs">
                  {isProtected
                    ? "The organization owner always stays active."
                    : "Inactive members cannot sign in."}
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
              Save changes
            </Button>
          </DialogFooter>
        </form>

        {canResetPassword ? (
          <>
            <Separator />

            <form ref={passwordForm} action={handlePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-password">Reset password</Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="New password"
                  required
                />
                <FieldError message={errors.password} />
              </div>
              <DialogFooter>
                <Button type="submit" variant="outline" disabled={pending}>
                  {pending ? <Loader2Icon className="animate-spin" /> : null}
                  Update password
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
                Removing a member also deletes their sessions.
              </div>
              {confirming ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={pending}
                  >
                    {pending ? <Loader2Icon className="animate-spin" /> : null}
                    Confirm removal
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirming(true)}
                >
                  Remove member
                </Button>
              )}
            </div>
          </>
        )}

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <LogInIcon className="size-3.5" />
          {member.lastLoginAt
            ? `Last signed in ${new Date(member.lastLoginAt).toLocaleString()}`
            : "Never signed in"}
        </p>
      </DialogContent>
    </Dialog>
  );
}
