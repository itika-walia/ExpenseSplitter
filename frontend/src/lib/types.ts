/** Shapes returned by the Express API. Money values are 2-decimal strings. */

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  groupId: string;
  createdAt: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  expenseCount: number;
  totalSpent: string;
  members: Member[];
}

export const SPLIT_TYPES = ['EQUAL', 'EXACT', 'PERCENTAGE'] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

export const CATEGORIES = [
  'FOOD',
  'TRAVEL',
  'ACCOMMODATION',
  'ENTERTAINMENT',
  'SHOPPING',
  'UTILITIES',
  'OTHER',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface ExpenseShare {
  id: string;
  memberId: string;
  memberName: string;
  shareAmount: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: string;
  date: string;
  category: Category;
  splitType: SplitType;
  groupId: string;
  paidById: string;
  paidBy: { id: string; name: string };
  createdAt: string;
  shares: ExpenseShare[];
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  fromMember: { id: string; name: string };
  toMember: { id: string; name: string };
  amount: string;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  createdAt: string;
  createdById: string | null;
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
}

export interface MemberBalance {
  memberId: string;
  name: string;
  email: string;
  totalPaid: string;
  totalShare: string;
  settlementsPaid: string;
  settlementsReceived: string;
  net: string;
}

export interface SettleSuggestion {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: string;
}

export interface GroupBalances {
  groupId: string;
  totalSpent: string;
  balances: MemberBalance[];
  suggestions: SettleSuggestion[];
  categoryTotals: { category: Category; amount: string }[];
}

export interface NewExpenseInput {
  description: string;
  amount: string;
  paidById: string;
  date: string;
  category: Category;
  splitType: SplitType;
  shares: { memberId: string; value?: string }[];
}

export interface NewSettlementInput {
  fromMemberId: string;
  toMemberId: string;
  amount: string;
  date?: string;
  note?: string;
}
