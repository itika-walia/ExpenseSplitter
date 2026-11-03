/**
 * Balance and settle-up calculations, all in integer paise.
 * Net balance: positive = the member gets money back, negative = they owe.
 */

export interface LedgerExpense {
  paidById: string;
  amountPaise: number;
  shares: { memberId: string; sharePaise: number }[];
}

export interface LedgerSettlement {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

export interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

/**
 * Net balance per member:
 *   + what they paid for expenses
 *   - their share of expenses
 *   + settlement payments they made (their debt shrinks)
 *   - settlement payments they received (they are owed less)
 * Because every expense's shares sum to its amount and every settlement adds
 * and subtracts the same value, the balances always sum to exactly 0.
 */
export function computeNetBalances(
  memberIds: string[],
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[],
): Map<string, number> {
  const balances = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const adjust = (memberId: string, delta: number) => {
    balances.set(memberId, (balances.get(memberId) ?? 0) + delta);
  };

  for (const expense of expenses) {
    adjust(expense.paidById, expense.amountPaise);
    for (const share of expense.shares) {
      adjust(share.memberId, -share.sharePaise);
    }
  }
  for (const settlement of settlements) {
    adjust(settlement.fromMemberId, settlement.amountPaise);
    adjust(settlement.toMemberId, -settlement.amountPaise);
  }
  return balances;
}

/**
 * Greedy settle-up: repeatedly match the largest debtor with the largest
 * creditor and transfer the smaller of the two amounts. Every transfer
 * clears at least one member, so the result never has more than
 * (members with a non-zero balance - 1) <= (members - 1) payments.
 */
export function suggestSettlements(balances: Map<string, number>): Transfer[] {
  const debtors = [...balances]
    .filter(([, amount]) => amount < 0)
    .map(([memberId, amount]) => ({ memberId, amount: -amount }));
  const creditors = [...balances]
    .filter(([, amount]) => amount > 0)
    .map(([memberId, amount]) => ({ memberId, amount }));

  const byAmountDesc = (a: { memberId: string; amount: number }, b: { memberId: string; amount: number }) =>
    b.amount - a.amount || a.memberId.localeCompare(b.memberId);

  const transfers: Transfer[] = [];
  debtors.sort(byAmountDesc);
  creditors.sort(byAmountDesc);

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.amount, creditor.amount);
    transfers.push({ fromMemberId: debtor.memberId, toMemberId: creditor.memberId, amountPaise: amount });

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
    debtors.sort(byAmountDesc);
    creditors.sort(byAmountDesc);
  }
  return transfers;
}
