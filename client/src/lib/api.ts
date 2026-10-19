import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE } from './config';

export { API_BASE };

/**
 * Two clients:
 *  - `api` sends the access token and transparently refreshes it on 401
 *  - `plainApi` is used for the refresh call itself (and public endpoints)
 */
export const plainApi: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

type Listener = (token: string | null) => void;
let accessToken: string | null = null;
const listeners = new Set<Listener>();

export function setAccessToken(token: string | null) {
  accessToken = token;
  listeners.forEach((l) => l(token));
}
export function getAccessToken() {
  return accessToken;
}
export function onAccessTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ── Attach the bearer token ─────────────────────────────────── */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/* ── Silent refresh on 401 (single-flight) ───────────────────── */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await plainApi.post('/auth/refresh');
    const token = res.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  } finally {
    refreshPromise = null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (status === 401 && original && !original._retried && !isAuthCall && !url.includes('/auth/refresh')) {
      original._retried = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const token = await refreshPromise;
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api.request(original);
      }
    }
    if (import.meta.env.DEV) {
      // Development-only diagnostics: show exactly which URL failed.
      console.error(
        `[api] ${original?.method?.toUpperCase() ?? 'REQUEST'} ${API_BASE}/api${url} failed`,
        status ?? error.code ?? error.message,
      );
    }
    return Promise.reject(error);
  },
);

export interface ApiErrorShape {
  message: string;
  code: string;
  details?: Array<{ path: string; message: string }>;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const err = error as AxiosError<{ error?: ApiErrorShape }>;
  const data = err?.response?.data;
  if (data?.error?.message) return data.error.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the API running?';
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function getValidationErrors(error: unknown): Record<string, string> {
  const err = error as AxiosError<{ error?: ApiErrorShape }>;
  const details = err?.response?.data?.error?.details;
  if (!details) return {};
  const map: Record<string, string> = {};
  for (const d of details) {
    const key = d.path.split('.').pop() ?? d.path;
    if (!map[key]) map[key] = d.message;
  }
  return map;
}
