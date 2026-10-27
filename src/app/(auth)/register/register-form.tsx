"use client";

import Link from "next/link";
import { useActionState } from "react";
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
import {
  createOrganization,
  type OnboardingFormState,
} from "@/lib/actions/onboarding";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<
    OnboardingFormState,
    FormData
  >(createOrganization, undefined);

  const errors = state?.fieldErrors ?? {};

  return (
    <Card className="ring-foreground/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Buat organisasi Anda</CardTitle>
        <CardDescription>
          Anda menjadi admin pertama dan dapat mengundang tim Anda setelahnya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="organizationName">Nama organisasi</Label>
            <Input
              id="organizationName"
              name="organizationName"
              placeholder="PT Contoh Distribusi"
              required
            />
            <FieldError message={errors.organizationName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nama Anda</Label>
            <Input id="name" name="name" autoComplete="name" required />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email kantor</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
            <FieldError message={errors.email} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Kata sandi</Label>
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

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Membuat…
              </>
            ) : (
              "Buat organisasi"
            )}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Masuk
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
