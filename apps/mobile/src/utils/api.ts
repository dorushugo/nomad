import { authClient } from "../lib/auth-client";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nomad.app";

async function request(path: string, options: RequestInit = {}) {
  const cookie = await authClient.getCookie();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur reseau" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
};
