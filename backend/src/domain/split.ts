import { sumPaise } from './money';

/**
 * Split calculators. Every function returns shares in paise whose sum is
 * exactly the expense total - any leftover paise from rounding are handed
 * out one at a time so nothing is lost or invented.
 */

export class SplitError extends Error {}

export interface ShareInput {
  memberId: string;
  /** Exact amount in paise (EXACT) or basis points 0..10000 (PERCENTAGE). */
  value?: number;
}

export interface ComputedShare {
  memberId: string;
  sharePaise: number;
}

function assertUniqueMembers(memberIds: string[]): void {
  if (memberIds.length === 0) {
    throw new SplitError('Select at least one member to share the expense');
  }
  if (new Set(memberIds).size !== memberIds.length) {
    throw new SplitError('A member can only appear once in a split');
  }
}

/**
 * Equal split. The remainder is given to the last members, one paisa each,
 * so Rs 1,000 among 3 gives 333.33, 333.33, 333.34.
 */
export function splitEqually(totalPaise: number, memberIds: string[]): ComputedShare[] {
  assertUniqueMembers(memberIds);
  const count = memberIds.length;
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise - base * count;
  return memberIds.map((memberId, index) => ({
    memberId,
    sharePaise: base + (index >= count - remainder ? 1 : 0),
  }));
}

/** Exact split: each member's amount is given; they must add up to the total. */
export function splitExactly(totalPaise: number, shares: ShareInput[]): ComputedShare[] {
  assertUniqueMembers(shares.map((share) => share.memberId));
  const computed = shares.map((share) => {
    if (share.value === undefined || !Number.isInteger(share.value) || share.value < 0) {
      throw new SplitError('Each exact share must be a non-negative amount');
    }
    return { memberId: share.memberId, sharePaise: share.value };
  });
  const allocated = sumPaise(computed.map((share) => share.sharePaise));
  if (allocated !== totalPaise) {
    throw new SplitError(
      `Exact shares add up to ${(allocated / 100).toFixed(2)} but the expense is ${(totalPaise / 100).toFixed(2)}`,
    );
  }
  return computed;
}

/**
 * Percentage split using basis points (1% = 100 bp) so 33.33% is exact.
 * Uses the largest-remainder method: everyone gets the floor of their exact
 * share, then leftover paise go to the largest fractional parts.
 */
export function splitByPercentage(totalPaise: number, shares: ShareInput[]): ComputedShare[] {
  assertUniqueMembers(shares.map((share) => share.memberId));
  for (const share of shares) {
    if (share.value === undefined || !Number.isInteger(share.value) || share.value < 0) {
      throw new SplitError('Each percentage must be between 0 and 100 with at most 2 decimals');
    }
  }
  const totalBasisPoints = sumPaise(shares.map((share) => share.value as number));
  if (totalBasisPoints !== 10_000) {
    throw new SplitError(`Percentages must add up to 100 (got ${(totalBasisPoints / 100).toFixed(2)})`);
  }

  const provisional = shares.map((share, index) => {
    const exact = totalPaise * (share.value as number);
    return {
      index,
      memberId: share.memberId,
      sharePaise: Math.floor(exact / 10_000),
      remainder: exact % 10_000,
    };
  });
  let leftover = totalPaise - sumPaise(provisional.map((share) => share.sharePaise));
  const byRemainder = [...provisional].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const share of byRemainder) {
    if (leftover === 0) break;
    share.sharePaise += 1;
    leftover -= 1;
  }
  return provisional.map(({ memberId, sharePaise }) => ({ memberId, sharePaise }));
}
