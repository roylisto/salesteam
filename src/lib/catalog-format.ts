export function formatCatalogPrice(amount: string, currency: string) {
  const options = {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  } as const;
  try {
    return new Intl.NumberFormat("id-ID", options).format(amount as `${number}`);
  } catch {
    return `${currency} ${amount}`;
  }
}
