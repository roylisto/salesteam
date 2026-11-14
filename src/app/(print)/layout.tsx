import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/change-password");
  return children;
}
