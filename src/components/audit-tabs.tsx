"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function AuditTabs({ path, label = "Data", map = false }: {
  path: string;
  label?: string;
  map?: boolean;
}) {
  const params = useSearchParams();
  const tab = params.get("tab");
  const active = tab === "audit" ? "audit" : map && tab === "map" ? "map" : "data";
  const href = (tab?: string) => {
    const query = new URLSearchParams(params.toString());
    query.delete("tab");
    query.delete("auditPage");
    if (tab) query.set("tab", tab);
    return query.size ? `${path}?${query}` : path;
  };
  const tabs = [
    { id: "data", text: label, href: href() },
    ...(map ? [{ id: "map", text: "Peta Gudang", href: href("map") }] : []),
    { id: "audit", text: "Riwayat Aktivitas", href: href("audit") },
  ];
  return (
    <nav aria-label="Tampilan halaman" className="bg-muted mb-3 inline-flex flex-wrap gap-1 rounded-lg p-1">
      {tabs.map((tab) => (
        <Link key={tab.id} href={tab.href} prefetch={false} aria-current={active === tab.id ? "page" : undefined}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium", active === tab.id
            ? "bg-primary text-white hover:text-white"
            : "text-muted-foreground hover:text-foreground")}>
          {tab.text}
        </Link>
      ))}
    </nav>
  );
}
