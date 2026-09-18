import axios from "axios";

/**
 * Dynamically resolves the PRAHARI Backend root URL (e.g. http://192.168.1.50:8000 or http://localhost:8000).
 * Resolves to the hostname that served the frontend, preventing false-positive disconnects on LAN/IP access.
 */
export const getBackendBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "");
  }
  if (typeof window !== "undefined") {
    // Use the same-origin Next.js proxy in browsers. This avoids Windows
    // localhost/IPv4 resolution and cross-port cookie/CORS inconsistencies.
    return "/backend";
  }
  return (process.env.INTERNAL_API_URL || "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");
};

/**
 * Dynamically resolves the PRAHARI API base URL (e.g. http://<host>:8000/api).
 */
export const getApiBaseUrl = (): string => {
  return `${getBackendBaseUrl()}/api`;
};

export const API_BASE = typeof window !== "undefined" ? getApiBaseUrl() : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api");

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem("prahari_token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      if (error.response?.status === 401) {
        const reqUrl = (error.config?.url || "").toLowerCase();
        const isQueueSync = error.config?.headers?.["X-Prahari-Sync"] === "true";
        if (
          isQueueSync ||
          reqUrl.includes("/auth/login") ||
          reqUrl.includes("/auth/logout") ||
          window.location.pathname === "/login" ||
          window.location.pathname === "/"
        ) {
          return Promise.reject(error);
        }
        localStorage.removeItem("prahari_token");
        localStorage.removeItem("prahari_user");
        void fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
        void api.post("/auth/logout").catch(() => undefined);
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
