/**
 * Money helpers. All arithmetic is done in integer paise (1 INR = 100 paise)
 * so that totals are exact; values are converted to/from 2-decimal strings
 * only at the database and API boundaries.
 */

/** Largest value that fits in numeric(12,2): 9,999,999,999.99 */
export const MAX_PAISE = 999_999_999_999;

const AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/** True when the value is a plain decimal with at most 2 fractional digits. */
export function isValidAmountString(value: string): boolean {
  return AMOUNT_PATTERN.test(value);
}

/**
 * Converts a decimal amount ("333.3", "1000", 12.5, Prisma.Decimal) to paise
 * using string parsing, so binary floating point never touches the value.
 */
export function toPaise(value: string | number | { toString(): string }): number {
  const str = typeof value === 'number' ? value.toFixed(2) : value.toString().trim();
  if (!isValidAmountString(str)) {
    throw new Error(`Invalid money amount: "${str}"`);
  }
  const negative = str.startsWith('-');
  const [whole, fraction = ''] = (negative ? str.slice(1) : str).split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return negative ? -paise : paise;
}

/** Converts paise back to a 2-decimal string, e.g. 33334 -> "333.34". */
export function fromPaise(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw new Error(`Paise must be a safe integer, got ${paise}`);
  }
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Sum of a list of paise values. */
export function sumPaise(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
