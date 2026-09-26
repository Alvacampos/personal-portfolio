// Shared by every /admin view that renders a MoneyAmount (~/data/admin-schema).
// No decimals — fixture and real amounts alike are whole pesos/dollars for
// a household tracker; cents aren't meaningfully tracked here.
const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatArs(amount: number): string {
  return arsFormatter.format(amount);
}

export function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}
