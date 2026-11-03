import type { Category } from './types';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

/** "1234.5" -> "₹1,234.50" (display only - never used for arithmetic). */
export function formatINR(amount: string | number): string {
  return inr.format(Number(amount));
}

export function formatDate(value: string): string {
  // Dates without a time component are calendar dates; render them in UTC so they don't shift
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: value.length === 10 ? 'UTC' : undefined,
  });
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export const CATEGORY_LABELS: Record<Category, string> = {
  FOOD: 'Food & drinks',
  TRAVEL: 'Travel',
  ACCOMMODATION: 'Accommodation',
  ENTERTAINMENT: 'Entertainment',
  SHOPPING: 'Shopping',
  UTILITIES: 'Utilities',
  OTHER: 'Other',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  FOOD: 'bg-orange-400',
  TRAVEL: 'bg-sky-500',
  ACCOMMODATION: 'bg-violet-500',
  ENTERTAINMENT: 'bg-pink-500',
  SHOPPING: 'bg-emerald-500',
  UTILITIES: 'bg-amber-500',
  OTHER: 'bg-slate-400',
};
