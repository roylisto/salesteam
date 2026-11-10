export function formatCatalogPrice(amount: string, currency: string) {
  const options = { style: "currency", currency, maximumFractionDigits: 2 } as const;
  try {
    return new Intl.NumberFormat("id-ID", options).format(amount as `${number}`);
  } catch {
    return `${currency} ${amount}`;
  }
}
