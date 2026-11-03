import { describe, expect, it } from 'vitest';
import { fromPaise, isValidAmountString, toPaise } from '../../src/domain/money';

describe('money conversion', () => {
  it('parses decimal strings into exact paise', () => {
    expect(toPaise('1000')).toBe(100_000);
    expect(toPaise('333.33')).toBe(33_333);
    expect(toPaise('0.1')).toBe(10);
    expect(toPaise('-12.5')).toBe(-1_250);
    expect(toPaise(0.1 + 0.2)).toBe(30);
  });

  it('formats paise as 2-decimal strings', () => {
    expect(fromPaise(33_334)).toBe('333.34');
    expect(fromPaise(5)).toBe('0.05');
    expect(fromPaise(-1_250)).toBe('-12.50');
    expect(fromPaise(0)).toBe('0.00');
  });

  it('rejects amounts with more than two decimals', () => {
    expect(isValidAmountString('1.234')).toBe(false);
    expect(isValidAmountString('abc')).toBe(false);
    expect(() => toPaise('1.234')).toThrow();
  });
});
