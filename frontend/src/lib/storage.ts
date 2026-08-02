export function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getStorageItem(key: string): string | null {
  return localStorage.getItem(key);
}

export function getJsonStorageItem<T>(key: string): T | null {
  return safeJsonParse<T>(getStorageItem(key));
}

export function setStorageItem(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function setJsonStorageItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageItem(key: string): void {
  localStorage.removeItem(key);
}
