import { User } from "./types";

export type UserProfile = User;

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours (aligned with JWT_EXPIRY_HOURS)
const LAST_ACTIVITY_KEY = "prahari_last_activity";
const TOKEN_EXPIRY_KEY = "prahari_token_expiry";

function getStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const getStoredUser = (): User | null => {
  return getStored<User>("prahari_user");
};

export const setAuthData = (token: string, user: User): void => {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp ? payload.exp * 1000 : Date.now() + SESSION_TIMEOUT_MS;
    setStored(TOKEN_EXPIRY_KEY, expiry);
    setStored(LAST_ACTIVITY_KEY, Date.now());
  } catch {
    // If token can't be parsed, set a default timeout
    setStored(TOKEN_EXPIRY_KEY, Date.now() + SESSION_TIMEOUT_MS);
    setStored(LAST_ACTIVITY_KEY, Date.now());
  }
  localStorage.setItem("prahari_token", token);
  localStorage.setItem("prahari_user", JSON.stringify(user));

  window.dispatchEvent(new CustomEvent("prahari_auth_change", { detail: { user } }));
};

export const clearAuthData = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("prahari_token");
  localStorage.removeItem("prahari_user");
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);

  window.dispatchEvent(new CustomEvent("prahari_auth_change", { detail: { user: null } }));
};

/**
 * Canonical logout — clears ALL auth state atomically.
 * Deletes:  localStorage tokens + user, frontend session cookie, backend JWT cookie.
 * Every logout button MUST call this instead of doing it piecemeal.
 */
export const logout = async (): Promise<void> => {
  // Capture token before we wipe localStorage
  const token =
    typeof window !== "undefined" ? localStorage.getItem("prahari_token") : null;

  // 1. Wipe localStorage and dispatch auth-change event
  clearAuthData();

  // 2. Delete the Next.js HttpOnly session cookie
  void fetch("/api/session", { method: "DELETE", credentials: "include" }).catch(
    () => undefined
  );

  // 3. Delete the FastAPI HttpOnly prahari_session cookie (best-effort)
  try {
    let host = window.location.hostname;
    if (host === "localhost" || host === "::1" || host === "[::1]") {
      host = "127.0.0.1";
    }
    const proto = window.location.protocol;
    void fetch(`${proto}//${host}:8000/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => undefined);
  } catch {
    // Non-fatal — cookies expire on their own
  }
};

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;
  const user = getStoredUser();
  if (!user) return false;
  // Check if token is expired
  const expiry = getStored<number>(TOKEN_EXPIRY_KEY);
  if (expiry && Date.now() > expiry) {
    clearAuthData();
    return false;
  }
  return true;
};

export const isSessionExpired = (): boolean => {
  const expiry = getStored<number>(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() > expiry;
};

export const getSessionRemainingMs = (): number => {
  const expiry = getStored<number>(TOKEN_EXPIRY_KEY);
  if (!expiry) return 0;
  return Math.max(0, expiry - Date.now());
};

export const recordActivity = (): void => {
  if (typeof window === "undefined") return;
  setStored(LAST_ACTIVITY_KEY, Date.now());
};

export const getSessionTimeoutMs = (): number => SESSION_TIMEOUT_MS;
