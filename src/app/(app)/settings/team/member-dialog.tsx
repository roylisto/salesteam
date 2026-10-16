"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Loader2Icon, LogInIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  createMember,
  deleteMember,
  resetMemberPassword,
  updateMember,
} from "@/lib/actions/account";

import type { MemberRow, RoleOption } from "./types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function CreateMemberDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roleId, setRoleId] = useState(roles[0] ? String(roles[0].id) : "");

  const selectedRoleName = useMemo(() => {
    return roles.find((r) => String(r.id) === roleId)?.name;
  }, [roles, roleId]);

  function handleSubmit(formData: FormData) {
    formData.set("roleId", roleId);

    startTransition(async () => {
      const result = await createMember(undefined, formData);

      if (result?.ok) {
        toast.success("Team member added.");
        setErrors({});
        onOpenChange(false);
        router.refresh();
        return;
      }

      setErrors(result?.fieldErrors ?? {});
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            They can sign in immediately with the password you set here.
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
              <Select value={roleId} onValueChange={(value) => setRoleId(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role">
                    {selectedRoleName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.roleId} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="member-password">Temporary password</Label>
              <Input
                id="member-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldError message={errors.password} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MemberDetailDialog({
  member,
  roles,
  currentUserId,
  open,
  onOpenChange,
}: {
  member: MemberRow;
  roles: RoleOption[];
  currentUserId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const passwordForm = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roleId, setRoleId] = useState(
    member.roleId ? String(member.roleId) : "",
  );
  const selectedRoleName = useMemo(() => {
    return roles.find((r) => String(r.id) === roleId)?.name;
  }, [roles, roleId]);
  const [active, setActive] = useState(member.isActive);
  const [confirming, setConfirming] = useState(false);

  const isProtected = member.isOrganizationOwner || member.id === currentUserId;

  function handleProfile(formData: FormData) {
    formData.set("id", String(member.id));
    formData.set("roleId", roleId);
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

        <form ref={passwordForm} action={handleProfile} className="space-y-4">
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
              <Select
                value={roleId}
                onValueChange={(value) => setRoleId(value ?? "")}
                disabled={isProtected}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role">
                    {selectedRoleName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.roleId} />
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

        <Separator />

        <form action={handlePassword} className="space-y-4">
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
