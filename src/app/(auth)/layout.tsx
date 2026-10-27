import { Brand } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-144 -translate-x-1/2 rounded-full bg-linear-to-br from-indigo-500/15 via-violet-500/10 to-fuchsia-500/15 blur-3xl"
      />
      <div className="w-full max-w-sm space-y-6">
        <Brand className="justify-center" />
        {children}
      </div>
      <p className="text-muted-foreground mt-8 text-xs">
        Operasi penjualan multitenan, disederhanakan.
      </p>
    </div>
  );
}
