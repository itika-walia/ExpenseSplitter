import { describe, expect, it } from 'vitest';
import { sumPaise } from '../../src/domain/money';
import { SplitError, splitByPercentage, splitEqually, splitExactly } from '../../src/domain/split';

const total = (shares: { sharePaise: number }[]) => sumPaise(shares.map((share) => share.sharePaise));

describe('splitEqually', () => {
  it('splits Rs 1,000 among 3 as 333.33, 333.33, 333.34', () => {
    const shares = splitEqually(100_000, ['a', 'b', 'c']);
    expect(shares.map((share) => share.sharePaise)).toEqual([33_333, 33_333, 33_334]);
    expect(total(shares)).toBe(100_000);
  });

  it('always adds up to the total', () => {
    for (let amount = 1; amount <= 5_000; amount += 37) {
      for (let people = 1; people <= 9; people++) {
        const ids = Array.from({ length: people }, (_, index) => `m${index}`);
        const shares = splitEqually(amount, ids);
        expect(total(shares)).toBe(amount);
        const values = shares.map((share) => share.sharePaise);
        expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('rejects empty or duplicate member lists', () => {
    expect(() => splitEqually(100, [])).toThrow(SplitError);
    expect(() => splitEqually(100, ['a', 'a'])).toThrow(SplitError);
  });
});

describe('splitExactly', () => {
  it('accepts shares that match the total', () => {
    const shares = splitExactly(4_000, [
      { memberId: 'a', value: 1_500 },
      { memberId: 'b', value: 2_500 },
    ]);
    expect(total(shares)).toBe(4_000);
  });

  it('rejects shares that do not match the total', () => {
    expect(() =>
      splitExactly(4_000, [
        { memberId: 'a', value: 1_500 },
        { memberId: 'b', value: 2_000 },
      ]),
    ).toThrow(/add up to 35.00/);
  });
});

describe('splitByPercentage', () => {
  it('splits by percentages and keeps the total exact', () => {
    const shares = splitByPercentage(100_000, [
      { memberId: 'a', value: 3_333 },
      { memberId: 'b', value: 3_333 },
      { memberId: 'c', value: 3_334 },
    ]);
    expect(shares.map((share) => share.sharePaise)).toEqual([33_330, 33_330, 33_340]);
    expect(total(shares)).toBe(100_000);
  });

  it('distributes rounding leftovers to the largest remainders', () => {
    const shares = splitByPercentage(1_001, [
      { memberId: 'a', value: 5_000 },
      { memberId: 'b', value: 5_000 },
    ]);
    expect(total(shares)).toBe(1_001);
  });

  it('requires percentages to sum to 100', () => {
    expect(() =>
      splitByPercentage(1_000, [
        { memberId: 'a', value: 5_000 },
        { memberId: 'b', value: 4_000 },
      ]),
    ).toThrow(/add up to 100/);
  });
});
