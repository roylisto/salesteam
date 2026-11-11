import Link from "next/link";
import { BoxesIcon, PackageIcon, WarehouseIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STOCK_PATH, stockQuantity } from "@/lib/stock";
import { stockOptions } from "./data";
import { stockSummary } from "./summary-data";
import { SummaryControls } from "./summary-controls";

type Bar = { id: number; name: string; quantity: string; detail: string };

function StockBars({ title, description, rows, unit, color }: {
  title: string; description: string; rows: Bar[]; unit: string; color: string;
}) {
  const maximum = Math.max(...rows.map((row) => Number(row.quantity)), 0);
  return <Card className="min-w-0">
    <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent>
      {rows.length === 0 ? <p className="text-muted-foreground py-10 text-center text-sm">Belum ada saldo positif sesuai filter.</p> : (
        <ul className="space-y-4" aria-label={title}>
          {rows.map((row) => <li key={row.id} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0"><p className="truncate font-medium" title={row.name}>{row.name}</p>
                <p className="text-muted-foreground truncate text-xs">{row.detail}</p></div>
              <p className="shrink-0 whitespace-nowrap text-right font-semibold tabular-nums">
                {stockQuantity(row.quantity)} <span className="text-muted-foreground text-xs font-normal">{unit}</span>
              </p>
            </div>
            <div aria-hidden="true" className="bg-muted h-2 overflow-hidden rounded-full">
              <div className={`h-full rounded-full ${color}`}
                style={{ width: `${maximum > 0 ? Math.min(100, Math.max(0, Number(row.quantity) / maximum * 100)) : 0}%` }} />
            </div>
          </li>)}
        </ul>
      )}
    </CardContent>
  </Card>;
}

export async function StockSummary({ organizationId, params }: {
  organizationId: number;
  params: Record<string, string | string[] | undefined>;
}) {
  const [summary, options] = await Promise.all([stockSummary(organizationId, params), stockOptions(organizationId)]);
  const { selectedUnit, totals, byWarehouse, byProduct, rows, pagination } = summary;
  const unit = selectedUnit?.name ?? "";
  const cards = [
    { label: "Total stok", value: stockQuantity(totals.quantity), detail: unit || "Belum ada saldo stok", icon: BoxesIcon },
    { label: "Gudang bersaldo", value: stockQuantity(String(totals.warehouses)), detail: "Gudang dengan qty positif", icon: WarehouseIcon },
    { label: "SKU bersaldo", value: stockQuantity(String(totals.products)), detail: "SKU dengan qty positif", icon: PackageIcon },
  ];

  return <SummaryControls options={options} units={summary.units} selectedUnitId={selectedUnit?.id ?? null} pagination={pagination}>
    <p className="text-muted-foreground text-xs">
      Ringkasan dihitung dari seluruh saldo yang cocok dengan filter, dalam satuan dasar{unit ? ` ${unit}` : " yang dipilih"}.
    </p>
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map(({ label, value, detail, icon: Icon }) => <Card key={label} size="sm">
        <CardContent className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
          </div>
          <span className="bg-muted text-muted-foreground rounded-lg p-2"><Icon className="size-4" aria-hidden="true" /></span>
        </CardContent>
      </Card>)}
    </div>
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <StockBars title="Stok per Gudang" description="10 gudang dengan qty tertinggi sesuai filter."
        unit={unit} color="bg-indigo-500"
        rows={byWarehouse.map((row) => ({ ...row, detail: `${stockQuantity(String(row.products))} SKU bersaldo` }))} />
      <StockBars title="Stok per SKU" description="10 SKU dengan total qty tertinggi di seluruh gudang sesuai filter."
        unit={unit} color="bg-teal-500"
        rows={byProduct.map((row) => ({ ...row, detail: `${row.code ?? "Tanpa kode"} · ${stockQuantity(String(row.warehouses))} gudang` }))} />
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Rincian SKU per Gudang</CardTitle>
        <CardDescription>Qty di tiap gudang dan porsinya terhadap total stok SKU tersebut sesuai filter.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader><TableRow><TableHead>SKU / Produk</TableHead><TableHead>Gudang</TableHead>
              <TableHead className="text-right">Qty ({unit || "satuan dasar"})</TableHead><TableHead className="min-w-36">Porsi SKU</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                Belum ada saldo yang cocok. <Link href={`${STOCK_PATH}/new?type=in`} className="text-foreground underline underline-offset-4">Catat Stock In</Link>
              </TableCell></TableRow>}
              {rows.map((row) => {
                const share = Number(row.productTotal) > 0 ? Math.min(100, Math.max(0, Number(row.quantity) / Number(row.productTotal) * 100)) : 0;
                return <TableRow key={row.id}>
                  <TableCell><p className="font-medium">{row.product}</p><p className="text-muted-foreground text-xs">{row.code ?? "—"}</p></TableCell>
                  <TableCell>{row.warehouse}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{stockQuantity(row.quantity)}</TableCell>
                  <TableCell><div className="flex items-center gap-3">
                    <div aria-hidden="true" className="bg-muted h-1.5 min-w-12 flex-1 overflow-hidden rounded-full">
                      <div className="bg-indigo-500/70 h-full rounded-full" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums">{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(share)}%</span>
                  </div></TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </SummaryControls>;
}
