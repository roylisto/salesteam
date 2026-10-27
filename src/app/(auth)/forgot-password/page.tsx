import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Atur ulang kata sandi" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
