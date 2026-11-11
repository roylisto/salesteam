"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { STOCK_PATH } from "@/lib/stock";
import { cn } from "@/lib/utils";

export function StockTabs() {
  const params = useSearchParams();
  const active = params.get("tab") ?? "balance";
  return <nav aria-label="Tampilan stok gudang" className="bg-muted mb-3 inline-flex flex-wrap gap-1 rounded-lg p-1">
    {[["balance", "Saldo Stok"], ["summary", "Ringkasan Stok"], ["history", "Riwayat Transaksi"], ["audit", "Riwayat Aktivitas"]].map(([tab, label]) => (
      <Link key={tab} href={tab === "balance" ? STOCK_PATH : `${STOCK_PATH}?tab=${tab}`} prefetch={false}
        aria-current={active === tab ? "page" : undefined}
        className={cn("rounded-md px-3 py-1.5 text-sm font-medium",
          active === tab ? "bg-primary text-white hover:text-white" : "text-muted-foreground hover:text-foreground")}>{label}</Link>
    ))}
  </nav>;
}
