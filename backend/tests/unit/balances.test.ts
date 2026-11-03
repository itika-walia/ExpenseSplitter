import { describe, expect, it } from 'vitest';
import { computeNetBalances, suggestSettlements, type LedgerExpense } from '../../src/domain/balances';
import { splitEqually } from '../../src/domain/split';

function expense(paidById: string, amountPaise: number, memberIds: string[]): LedgerExpense {
  return { paidById, amountPaise, shares: splitEqually(amountPaise, memberIds) };
}

function sum(balances: Map<string, number>) {
  return [...balances.values()].reduce((a, b) => a + b, 0);
}

/** Applies suggested transfers as settlements and returns the resulting balances. */
function applyTransfers(balances: Map<string, number>, transfers: ReturnType<typeof suggestSettlements>) {
  const result = new Map(balances);
  for (const transfer of transfers) {
    result.set(transfer.fromMemberId, (result.get(transfer.fromMemberId) ?? 0) + transfer.amountPaise);
    result.set(transfer.toMemberId, (result.get(transfer.toMemberId) ?? 0) - transfer.amountPaise);
  }
  return result;
}

describe('computeNetBalances', () => {
  it('credits the payer and debits each sharer', () => {
    const balances = computeNetBalances(['a', 'b', 'c'], [expense('a', 30_000, ['a', 'b', 'c'])], []);
    expect(Object.fromEntries(balances)).toEqual({ a: 20_000, b: -10_000, c: -10_000 });
  });

  it('applies settlements: payer owes less, receiver is owed less', () => {
    const balances = computeNetBalances(
      ['a', 'b', 'c'],
      [expense('a', 30_000, ['a', 'b', 'c'])],
      [{ fromMemberId: 'b', toMemberId: 'a', amountPaise: 10_000 }],
    );
    expect(Object.fromEntries(balances)).toEqual({ a: 10_000, b: 0, c: -10_000 });
  });

  it('includes members with no activity at zero', () => {
    const balances = computeNetBalances(['a', 'b', 'z'], [expense('a', 1_000, ['a', 'b'])], []);
    expect(balances.get('z')).toBe(0);
  });
});

describe('suggestSettlements', () => {
  it('returns nothing when everyone is settled', () => {
    expect(suggestSettlements(new Map([['a', 0], ['b', 0]]))).toEqual([]);
  });

  it('clears all balances with at most members - 1 payments (randomised)', () => {
    // Park-Miller PRNG so the run is reproducible
    let seed = 42;
    const random = () => {
      seed = (seed * 16_807) % 2_147_483_647;
      return seed / 2_147_483_647;
    };

    for (let round = 0; round < 300; round++) {
      const memberCount = 2 + Math.floor(random() * 9);
      const members = Array.from({ length: memberCount }, (_, index) => `m${index}`);
      const expenses: LedgerExpense[] = [];
      for (let i = 0; i < 1 + Math.floor(random() * 8); i++) {
        const sharers = members.filter(() => random() > 0.4);
        if (sharers.length === 0) sharers.push(members[0]);
        const payer = members[Math.floor(random() * memberCount)];
        expenses.push(expense(payer, 1 + Math.floor(random() * 1_000_000), sharers));
      }

      const balances = computeNetBalances(members, expenses, []);
      expect(sum(balances)).toBe(0);

      const transfers = suggestSettlements(balances);
      expect(transfers.length).toBeLessThanOrEqual(memberCount - 1);
      for (const transfer of transfers) {
        expect(transfer.amountPaise).toBeGreaterThan(0);
        expect(transfer.fromMemberId).not.toBe(transfer.toMemberId);
      }
      const after = applyTransfers(balances, transfers);
      expect([...after.values()].every((value) => value === 0)).toBe(true);
    }
  });
});
