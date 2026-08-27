import { getApiUrl } from "./public-urls";

export type Role = "SUPER_ADMIN" | "STORE_OWNER" | "CASHIER";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_KEY = "ngl_access";
const REFRESH_KEY = "ngl_refresh";
const USER_KEY = "ngl_user";
const SESSION_EXPIRED_EVENT = "ngl:session-expired";

/** Paralel 401'lerde refresh token rotation yarışını önler. */
let refreshInFlight: Promise<string | null> | null = null;

export function getStoredTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeSession(tokens: Tokens, user: AuthUser) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export function onSessionExpired(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

function decodeJwtExp(accessToken: string): number | null {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function accessTokenExpiringSoon(accessToken: string, skewSec = 90): boolean {
  const exp = decodeJwtExp(accessToken);
  if (!exp) return false;
  return Date.now() >= (exp - skewSec) * 1000;
}

async function refreshAccess(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const tokens = getStoredTokens();
    if (!tokens?.refreshToken) return null;

    try {
      const res = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
          notifySessionExpired();
        }
        return null;
      }

      const data = (await res.json()) as Tokens & { user: AuthUser };
      storeSession(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user,
      );
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function ensureValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.accessToken) return null;
  if (!accessTokenExpiringSoon(tokens.accessToken)) {
    return tokens.accessToken;
  }
  return refreshAccess();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Oturum gerçekten bitti — UI hata banner'ı göstermeden login'e yönlendirilir. */
export class SessionExpiredError extends ApiError {
  constructor() {
    super(401, "SESSION_EXPIRED");
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  let accessToken = await ensureValidAccessToken();

  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${getApiUrl()}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    accessToken = await refreshAccess();
    if (accessToken) return api<T>(path, options, false);
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Multipart upload — do not set Content-Type (browser sets boundary). */
export async function apiUpload<T>(
  path: string,
  file: File,
  fieldName = "file",
): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  return api<T>(path, { method: "POST", body: form });
}

/** Auth’lu dosya indirme (CSV vb.) — JSON değil blob. */
export async function apiDownload(
  path: string,
  filename: string,
  retry = true,
): Promise<void> {
  let accessToken = await ensureValidAccessToken();
  const headers = new Headers();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${getApiUrl()}${path}`, { headers });

  if (res.status === 401 && retry) {
    accessToken = await refreshAccess();
    if (accessToken) return apiDownload(path, filename, false);
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    let message = `İndirme başarısız (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let message = "Giriş başarısız";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
  storeSession(
    { accessToken: data.accessToken, refreshToken: data.refreshToken },
    data.user,
  );
  return data.user;
}

export function homePathForRole(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/platform";
    case "STORE_OWNER":
      return "/metrics";
    case "CASHIER":
      return "/counter";
    default:
      return "/login";
  }
}
