import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/**
 * Resolve an image URL for rendering: absolute URLs (http(s)://, data:, blob:)
 * pass through unchanged. Relative paths (e.g. /uploads/...) are prefixed with
 * VITE_API_URL (API_BASE) when set so they resolve correctly in split
 * deployments. If unset, relative paths remain relative (works for same-origin).
 */
export function imageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Hide a broken <img> instead of showing the browser's broken-image icon. */
export function onImgError(e: { currentTarget: HTMLImageElement }) {
  e.currentTarget.style.opacity = '0';
}

const CURRENCY_RATES: Record<string, number> = {
  usd: 1,
  bdt: 122.5, // 1 USD ≈ 122.5 BDT (override via API config in future)
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  bdt: '৳',
};

export type CurrencyCode = 'usd' | 'bdt';

export function formatPrice(amount: number, currency: CurrencyCode = 'usd', locale = 'en-US'): string {
  const rate = CURRENCY_RATES[currency] ?? 1;
  const converted = amount * rate;
  const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: currency === 'bdt' ? 0 : 2,
    maximumFractionDigits: currency === 'bdt' ? 0 : 2,
  }).format(converted);
  return currency === 'bdt' ? `${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = {}) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  }).format(date);
}

export function formatDateTime(value: string | Date) {
  return formatDate(value, { hour: '2-digit', minute: '2-digit' });
}

export function discountPercent(price: number, compareAt?: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function getOrderStatusMeta(status: string) {
  const map: Record<string, { label: string; className: string; dot: string }> = {
    pending: { label: 'Pending', className: 'bg-warning/15 text-warning', dot: 'bg-warning' },
    paid: { label: 'Paid', className: 'bg-accent-soft text-accent', dot: 'bg-accent' },
    shipped: { label: 'Shipped', className: 'bg-accent-soft text-accent', dot: 'bg-accent' },
    delivered: { label: 'Delivered', className: 'bg-success/15 text-success', dot: 'bg-success' },
    cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
    refunded: { label: 'Refunded', className: 'bg-danger/15 text-danger', dot: 'bg-danger' },
  };
  return map[status] ?? { label: status, className: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
