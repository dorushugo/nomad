import { authClient } from "../lib/auth-client";
import { ApiError, type ApiErrorCode } from "./errors";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.nomad.app";
const DEFAULT_TIMEOUT_MS = 10_000;

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  422: "VALIDATION",
};

interface RequestInitWithTimeout extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(path: string, init: RequestInitWithTimeout = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = init;
  const cookie = await authClient.getCookie();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "omit",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as { name?: string })?.name === "AbortError") {
      throw new ApiError("Délai d'attente dépassé", "TIMEOUT");
    }
    throw new ApiError("Erreur réseau", "NETWORK");
  }
  clearTimeout(timeout);

  if (!res.ok) {
    let body: { error?: string; code?: ApiErrorCode; details?: unknown } | null = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON error body
    }
    const code = body?.code ?? STATUS_TO_CODE[res.status] ?? "INTERNAL";
    const message = body?.error ?? `HTTP ${res.status}`;
    throw new ApiError(message, code, res.status, body?.details);
  }

  // Some endpoints respond with no body (e.g. 204).
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInitWithTimeout) => request<T>(path, init),
  post: <T>(path: string, body?: unknown, init?: RequestInitWithTimeout) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown, init?: RequestInitWithTimeout) =>
    request<T>(path, {
      ...init,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, init?: RequestInitWithTimeout) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
