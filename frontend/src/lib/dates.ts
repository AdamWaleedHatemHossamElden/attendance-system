const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value);
}

export function normalizeDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return isDateOnly(value) ? value : null;
}

export function formatDateOnly(value: string | null | undefined): string {
  return normalizeDateOnly(value) ?? '';
}

export function dateOnlyParts(value: string | null | undefined): {
  year: number;
  month: number;
  day: number;
} | null {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  return { year, month, day };
}

export function formatDateOnlyForDisplay(value: string | null | undefined): string {
  const parts = dateOnlyParts(value);
  if (!parts) return '';

  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
}
