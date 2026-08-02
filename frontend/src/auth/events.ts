export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export function dispatchUnauthorized(): void {
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
}

export function subscribeUnauthorized(listener: () => void): () => void {
  window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
}
