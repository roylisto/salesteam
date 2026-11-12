"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SALES_STOCK_PATH } from "@/lib/stock";
import { cn } from "@/lib/utils";

export function SalesTabs() {
  const active = useSearchParams().get("tab") ?? "balance";
  return <nav aria-label="Tampilan Stok Sales" className="bg-muted mb-3 inline-flex flex-wrap gap-1 rounded-lg p-1">
    {[["balance", "Saldo Stok"], ["history", "Riwayat Transaksi"], ["audit", "Riwayat Aktivitas"]].map(([tab, label]) => (
      <Link key={tab} href={tab === "balance" ? SALES_STOCK_PATH : `${SALES_STOCK_PATH}?tab=${tab}`}
        prefetch={false} aria-current={active === tab ? "page" : undefined}
        className={cn("rounded-md px-3 py-1.5 text-sm font-medium", active === tab ? "bg-primary text-white hover:text-white" : "text-muted-foreground hover:text-foreground")}>
        {label}
      </Link>
    ))}
  </nav>;
}
