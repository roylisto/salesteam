"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { changePassword, logout, type AuthFormState } from "@/lib/actions/auth";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<AuthFormState>();
  const [pending, startTransition] = useTransition();
  const [signOutPending, startSignOut] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await changePassword(undefined, formData);
      setState(result);
      // The flag is cleared, so the dashboard renders without bouncing back.
      if (result?.ok) router.replace("/dashboard");
    });
  }

  function handleSignOut() {
    startSignOut(async () => {
      await logout();
    });
  }

  const errors = state?.fieldErrors ?? {};

  return (
    <Card className="ring-foreground/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Pilih kata sandi baru</CardTitle>
        <CardDescription>
          Ini adalah pertama kali Anda masuk. Tetapkan kata sandi Anda sendiri
          untuk melanjutkan ke dasbor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Kata sandi saat ini</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Kata sandi sementara yang Anda gunakan untuk masuk"
              required
            />
            <FieldError message={errors.currentPassword} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Kata sandi baru</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <FieldError message={errors.password} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Konfirmasi kata sandi baru</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <FieldError message={errors.confirmPassword} />
          </div>

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Memperbarui…
              </>
            ) : (
              "Simpan kata sandi baru"
            )}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          Kata sandi sementara tidak berfungsi?{" "}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOutPending}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Keluar
          </button>{" "}
          lalu gunakan tautan &ldquo;Lupa kata sandi?&rdquo; di halaman masuk.
        </p>
      </CardContent>
    </Card>
  );
}
