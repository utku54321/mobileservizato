import { API_URL } from "./config";

/**
 * Talks to the existing Servizato Next.js backend.
 *
 * Auth: the backend uses NextAuth session cookies. React Native's networking
 * layer on Android keeps a persistent native cookie jar, so the session cookie
 * set at sign-in is sent automatically on every later request.
 *
 * Origin: several backend write routes (finance, push, address lookup, job
 * assignment) only accept requests whose Origin matches the site. A native app
 * has no browser origin, so we send the site's own origin explicitly.
 */
export class ApiError extends Error {
  status: number;
  issues?: { path?: (string | number)[]; message: string }[];
  constructor(message: string, status: number, issues?: ApiError["issues"]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

const ORIGIN = new URL(API_URL).origin;

function messageFrom(body: unknown, status: number): { message: string; issues?: ApiError["issues"] } {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const issues = Array.isArray(b.issues) ? (b.issues as ApiError["issues"]) : undefined;
    if (typeof b.error === "string") {
      const first = issues?.[0]?.message;
      return { message: first ? `${b.error} ${first}` : b.error, issues };
    }
    if (Array.isArray(b.error) && b.error[0]?.message)
      return { message: String(b.error[0].message), issues: b.error as ApiError["issues"] };
    if (typeof b.message === "string") return { message: b.message };
  }
  if (status === 401) return { message: "Please sign in again." };
  if (status === 403) return { message: "You don't have access to this." };
  if (status === 404) return { message: "Not found." };
  return { message: "Something went wrong. Please try again." };
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: Record<string, string>;
  signal?: AbortSignal;
  /** Don't trigger the global sign-out on 401 (used by auth calls). */
  quiet401?: boolean;
};

export async function request<T = any>(path: string, options: Options = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    Origin: ORIGIN,
    "X-Requested-With": "servizato-mobile",
  };
  let body: string | undefined;
  if (options.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(options.form).toString();
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  } else if (options.method && options.method !== "GET") {
    // Finance-guarded routes require a JSON content type even without a body.
    headers["Content-Type"] = "application/json";
    body = "{}";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body,
      credentials: "include",
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ApiError("No internet connection. Check your network and try again.", 0);
  }

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const { message, issues } = messageFrom(data, response.status);
    if (response.status === 401 && !options.quiet401) onUnauthorized?.();
    throw new ApiError(message, response.status, issues);
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T = any>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T = any>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T = any>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T = any>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function errorText(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  return String(error);
}
