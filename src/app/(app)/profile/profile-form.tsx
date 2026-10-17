"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, type AuthFormState } from "@/lib/actions/auth";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

export function ProfileForm({
  name,
  email,
  code,
  roleName,
  organizationName,
}: {
  name: string;
  email: string;
  code: string | null;
  roleName: string;
  organizationName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<AuthFormState>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await changePassword(undefined, formData);
      setState(result);

      if (result?.ok) {
        formRef.current?.reset();
        toast.success("Password updated.");
        return;
      }

      if (result?.error) toast.error(result.error);
    });
  }

  const errors = state?.fieldErrors ?? {};

  return (
    <div className="space-y-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Managed by your administrator. Contact them to change these details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail label="Full name" value={name} />
          <Detail label="Email" value={email} />
          <Detail label="Role" value={roleName} />
          <Detail label="Staff code" value={code ?? "—"} />
          <Detail label="Organization" value={organizationName} />
        </CardContent>
      </Card>

      <form ref={formRef} action={handleSubmit}>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Enter your current password, then choose a new one of at least 8
              characters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-current">Current password</Label>
              <Input
                id="profile-current"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
              <FieldError message={errors.currentPassword} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-password">New password</Label>
              <Input
                id="profile-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldError message={errors.password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-confirm">Confirm new password</Label>
              <Input
                id="profile-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldError message={errors.confirmPassword} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Update password
          </Button>
        </div>
      </form>
    </div>
  );
}
