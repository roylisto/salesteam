import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Ubah kata sandi" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/change-password");
  if (!user.mustChangePassword) redirect("/dashboard");

  return <ChangePasswordForm />;
}
