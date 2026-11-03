/**
 * Client-side money helpers for form validation and live split previews.
 * They mirror the API's paise arithmetic; the API remains the source of truth.
 */

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function isValidAmount(value: string): boolean {
  return AMOUNT_PATTERN.test(value.trim());
}

/** "333.3" -> 33330, or null when the input isn't a valid amount. */
export function toPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!isValidAmount(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function fromPaise(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Same rule as the API: leftover paise go to the last members. */
export function previewEqualSplit(totalPaise: number, count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise - base * count;
  return Array.from({ length: count }, (_, index) => base + (index >= count - remainder ? 1 : 0));
}
