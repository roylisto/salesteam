"use client";

import Link from "next/link";
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
import {
  completePasswordReset,
  requestPasswordReset,
  type PasswordResetState,
} from "@/lib/actions/password-reset";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [requestState, setRequestState] = useState<PasswordResetState>();
  const [resetState, setResetState] = useState<PasswordResetState>();
  const [requestPending, startRequest] = useTransition();
  const [resetPending, startReset] = useTransition();

  function handleRequest(formData: FormData) {
    startRequest(async () => {
      const result = await requestPasswordReset(undefined, formData);
      setRequestState(result);
      if (result?.ok) setStep(2);
    });
  }

  function handleReset(formData: FormData) {
    startReset(async () => {
      const result = await completePasswordReset(undefined, formData);
      setResetState(result);
      if (result?.ok) setStep(3);
    });
  }

  if (step === 3) {
    return (
      <Card className="ring-foreground/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Kata sandi diperbarui</CardTitle>
          <CardDescription>
            Kata sandi Anda telah diubah. Anda sekarang dapat masuk dengan kata
            sandi baru Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            className="w-full"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Kembali ke halaman masuk
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    const errors = resetState?.fieldErrors ?? {};

    return (
      <Card className="ring-foreground/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            Masukkan kata sandi sementara Anda
          </CardTitle>
          <CardDescription>
            Kami mengirim kata sandi sementara ke{" "}
            <span className="text-foreground font-medium">{email}</span>.
            Masukkan kata sandi tersebut di bawah ini bersama kata sandi baru
            Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleReset} className="space-y-4">
            <input type="hidden" name="email" value={email} />

            <div className="space-y-1.5">
              <Label htmlFor="temporaryPassword">Kata sandi sementara</Label>
              <Input
                id="temporaryPassword"
                name="temporaryPassword"
                autoComplete="one-time-code"
                placeholder="Dari email yang kami kirim"
                required
              />
              <FieldError message={errors.temporaryPassword} />
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

            {resetState?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{resetState.error}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={resetPending}
            >
              {resetPending ? (
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
            Belum menerima email?{" "}
            <button
              type="button"
              onClick={() => {
                setResetState(undefined);
                setStep(1);
              }}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Minta yang baru
            </button>
          </p>
        </CardContent>
      </Card>
    );
  }

  const errors = requestState?.fieldErrors ?? {};

  return (
    <Card className="ring-foreground/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Atur ulang kata sandi Anda</CardTitle>
        <CardDescription>
          Masukkan email akun Anda dan kami akan mengirim kata sandi sementara
          untuk mengatur ulangnya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleRequest} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <FieldError message={errors.email} />
          </div>

          {requestState?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{requestState.error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={requestPending}
          >
            {requestPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Mengirim…
              </>
            ) : (
              "Kirim kata sandi sementara"
            )}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          Sudah ingat kata sandi Anda?{" "}
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
