import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Buat organisasi" };

export default function RegisterPage() {
  return <RegisterForm />;
}
