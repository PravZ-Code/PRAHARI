import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = [
  "/portal",
  "/commander",
  "/welfare",
  "/admin",
  "/approvals",
  "/what-if",
  "/recovery",
  "/safety-net",
  "/request",
  "/track",
  "/emergency",
];

const ROLE_ROUTES: Record<string, string[]> = {
  "/portal": ["personnel", "jawan", "soldier", "admin"],
  "/commander": ["commander", "admin"],
  "/welfare": ["welfare", "welfare_officer", "admin"],
  "/admin": ["admin"],
  "/approvals": ["commander", "welfare", "welfare_officer", "admin"],
  "/what-if": ["commander", "welfare", "welfare_officer", "admin"],
  "/recovery": ["welfare", "welfare_officer", "admin", "personnel", "jawan", "soldier"],
  "/safety-net": ["commander", "welfare", "welfare_officer", "admin"],
  "/request": ["personnel", "jawan", "soldier", "commander", "welfare", "welfare_officer", "admin"],
  "/track": ["personnel", "jawan", "soldier", "commander", "welfare", "welfare_officer", "admin"],
  "/emergency": ["personnel", "jawan", "soldier", "commander", "welfare", "welfare_officer", "admin"],
};

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Check cookie set by client auth
  const cookieVal = request.cookies.get("prahari_session")?.value;
  return cookieVal || null;
}

function parseTokenPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function verifyTokenWithBackend(token: string): Promise<{ valid: boolean; payload: any | null; unauthorized: boolean }> {
  const apiBase = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      return { valid: false, payload: null, unauthorized: true };
    }
    if (!response.ok) {
      return { valid: false, payload: null, unauthorized: false };
    }
    const data = await response.json();
    return { valid: true, payload: data, unauthorized: false };
  } catch {
    return { valid: false, payload: null, unauthorized: false };
  } finally {
    clearTimeout(timeout);
  }
}

function isTokenExpired(payload: any): boolean {
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if requested route is a protected defense workspace
  const matchedRoute = PROTECTED_ROUTES.find((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!matchedRoute) {
    return NextResponse.next();
  }

  // 1. Authenticated Session Check: Token must be present
  const token = getToken(request);
  const parsedPayload = token ? parseTokenPayload(token) : null;

  if (!token || !parsedPayload || isTokenExpired(parsedPayload)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(url);
    if (token) {
      redirectResponse.cookies.delete("prahari_session");
    }
    redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    redirectResponse.headers.set("Pragma", "no-cache");
    redirectResponse.headers.set("Expires", "0");
    return redirectResponse;
  }

  // 2. Validate with backend (or use parsed JWT payload if backend is warming up)
  const backendCheck = await verifyTokenWithBackend(token);
  if (backendCheck.unauthorized) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.delete("prahari_session");
    redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    redirectResponse.headers.set("Pragma", "no-cache");
    redirectResponse.headers.set("Expires", "0");
    return redirectResponse;
  }

  const effectivePayload = backendCheck.payload || parsedPayload;

  // 3. Role-Based Access Control (RBAC) & Route Isolation
  const allowedRoles = ROLE_ROUTES[matchedRoute];
  const userRole = (effectivePayload.role || "personnel").toLowerCase();

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Route user to their designated authorized role portal instead of unauthenticated login
    const targetPortal =
      userRole === "commander"
        ? "/commander"
        : userRole === "welfare" || userRole === "welfare_officer"
        ? "/welfare"
        : userRole === "admin"
        ? "/admin"
        : "/portal";

    const url = request.nextUrl.clone();
    url.pathname = targetPortal;
    url.searchParams.delete("error");
    url.searchParams.delete("redirect");
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    redirectResponse.headers.set("Pragma", "no-cache");
    redirectResponse.headers.set("Expires", "0");
    return redirectResponse;
  }

  // 4. Authorized Access: Apply hardened security and anti-caching headers
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    "/portal",
    "/portal/:path*",
    "/commander",
    "/commander/:path*",
    "/welfare",
    "/welfare/:path*",
    "/admin",
    "/admin/:path*",
    "/approvals",
    "/approvals/:path*",
    "/what-if",
    "/what-if/:path*",
    "/recovery",
    "/recovery/:path*",
    "/safety-net",
    "/safety-net/:path*",
    "/request",
    "/request/:path*",
    "/track",
    "/track/:path*",
    "/emergency",
    "/emergency/:path*",
  ],
};
