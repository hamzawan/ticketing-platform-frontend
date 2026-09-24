import { ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";

export function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}
