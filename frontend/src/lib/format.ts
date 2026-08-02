export function formatNumber(value: number | string | null | undefined): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric)
    ? numeric.toLocaleString()
    : '0';
}

export function formatPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '0%';
}

export function nullableText(value: string | number | null | undefined, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}
