export function parsePositiveInt(value, fieldName) {
  const raw = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(raw)) {
    return { error: `${fieldName} must be a positive integer` };
  }
  return { value: Number(raw) };
}

export function parseNonNegativeInt(value, fieldName) {
  const raw = String(value ?? '').trim();
  if (!/^(0|[1-9]\d*)$/.test(raw)) {
    return { error: `${fieldName} must be a non-negative integer` };
  }
  return { value: Number(raw) };
}

export function parseOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === '') return { value: null };
  return parsePositiveInt(value, fieldName);
}

export function parsePagination(query, options = {}) {
  const {
    defaultPage = 1,
    defaultPerPage = 10,
    maxPerPage = 100,
  } = options;

  const pageRaw = query.page ?? String(defaultPage);
  const perPageRaw = query.per_page ?? String(defaultPerPage);
  const page = parsePositiveInt(pageRaw, 'page');
  if (page.error) return { error: page.error };

  const perPage = parsePositiveInt(perPageRaw, 'per_page');
  if (perPage.error) return { error: perPage.error };
  if (perPage.value > maxPerPage) {
    return { error: `per_page must be less than or equal to ${maxPerPage}` };
  }

  return {
    page: page.value,
    perPage: perPage.value,
    offset: (page.value - 1) * perPage.value,
  };
}

export function requireTrimmedString(value, fieldName) {
  if (typeof value !== 'string') return { error: `${fieldName} is required` };
  const trimmed = value.trim();
  if (!trimmed) return { error: `${fieldName} is required` };
  return { value: trimmed };
}

export function optionalTrimmedString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

export function optionalEnum(value, allowed, fieldName) {
  if (value === undefined || value === null || value === '') return { value: null };
  const trimmed = String(value).trim();
  if (!allowed.includes(trimmed)) {
    return { error: `${fieldName} must be one of: ${allowed.join(', ')}` };
  }
  return { value: trimmed };
}

export function requireEnum(value, allowed, fieldName) {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return { error: `${fieldName} must be one of: ${allowed.join(', ')}` };
  }
  return { value };
}

export function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function optionalDateOnly(value, fieldName) {
  if (value === undefined || value === null || value === '') return { value: null };
  const trimmed = String(value).trim();
  if (!isDateOnly(trimmed)) {
    return { error: `${fieldName} must be a valid YYYY-MM-DD date` };
  }
  return { value: trimmed };
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return { error: 'Email is required' };
  const email = value.trim().toLowerCase();
  if (!email) return { error: 'Email is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email must be valid' };
  }
  return { value: email };
}
