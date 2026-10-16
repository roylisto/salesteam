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
          <CardTitle className="text-lg">Password updated</CardTitle>
          <CardDescription>
            Your password has been changed. You can now sign in with your new
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            className="w-full"
            render={<Link href="/login" />}
          >
            Back to sign in
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
            Enter your temporary password
          </CardTitle>
          <CardDescription>
            We emailed a temporary password to{" "}
            <span className="text-foreground font-medium">{email}</span>. Enter
            it below together with your new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleReset} className="space-y-4">
            <input type="hidden" name="email" value={email} />

            <div className="space-y-1.5">
              <Label htmlFor="temporaryPassword">Temporary password</Label>
              <Input
                id="temporaryPassword"
                name="temporaryPassword"
                autoComplete="one-time-code"
                placeholder="From the email we sent"
                required
              />
              <FieldError message={errors.temporaryPassword} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
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
                  Updating…
                </>
              ) : (
                "Set new password"
              )}
            </Button>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            Didn&apos;t receive the email?{" "}
            <button
              type="button"
              onClick={() => {
                setResetState(undefined);
                setStep(1);
              }}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Request a new one
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
        <CardTitle className="text-lg">Reset your password</CardTitle>
        <CardDescription>
          Enter your account email and we&apos;ll send a temporary password to
          reset it.
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
                Sending…
              </>
            ) : (
              "Send temporary password"
            )}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
