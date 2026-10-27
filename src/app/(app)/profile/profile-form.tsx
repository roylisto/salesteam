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
  username,
  code,
  roleName,
  organizationName,
}: {
  name: string;
  email: string;
  username: string | null;
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
        toast.success("Kata sandi diperbarui.");
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
          <CardTitle>Akun</CardTitle>
          <CardDescription>
            Dikelola oleh administrator Anda. Hubungi mereka untuk mengubah
            detail ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail label="Nama lengkap" value={name} />
          <Detail label="Email" value={email} />
          <Detail label="Nama pengguna" value={username ?? "—"} />
          <Detail label="Peran" value={roleName} />
          <Detail label="Kode pegawai" value={code ?? "—"} />
          <Detail label="Organisasi" value={organizationName} />
        </CardContent>
      </Card>

      <form ref={formRef} action={handleSubmit}>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Ubah kata sandi</CardTitle>
            <CardDescription>
              Masukkan kata sandi Anda saat ini, lalu pilih kata sandi baru
              minimal 8 karakter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-current">Kata sandi saat ini</Label>
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
              <Label htmlFor="profile-password">Kata sandi baru</Label>
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
              <Label htmlFor="profile-confirm">Konfirmasi kata sandi baru</Label>
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
            Perbarui kata sandi
          </Button>
        </div>
      </form>
    </div>
  );
}
