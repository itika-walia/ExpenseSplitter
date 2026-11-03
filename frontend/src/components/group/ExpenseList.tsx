'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { api, ApiError } from '@/lib/api';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDate, formatINR } from '@/lib/format';
import type { Expense } from '@/lib/types';

const SPLIT_LABELS = { EQUAL: 'split equally', EXACT: 'exact amounts', PERCENTAGE: 'by percentage' } as const;

interface ExpenseListProps {
  expenses: Expense[];
  onDeleted: () => Promise<void>;
}

export function ExpenseList({ expenses, onDeleted }: ExpenseListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(expense: Expense) {
    if (!window.confirm(`Delete "${expense.description}" (${formatINR(expense.amount)})? This cannot be undone.`)) {
      return;
    }
    setDeleting(expense.id);
    setError(null);
    try {
      await api.deleteExpense(expense.id);
      await onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the expense');
    } finally {
      setDeleting(null);
    }
  }

  if (expenses.length === 0) {
    return <EmptyState title="No expenses yet">Add the first shared cost to see balances.</EmptyState>;
  }

  return (
    <div className="space-y-2">
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-slate-100">
        {expenses.map((expense) => {
          const isOpen = expanded === expense.id;
          return (
            <li key={expense.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : expense.id)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_COLORS[expense.category]}`}
                      title={CATEGORY_LABELS[expense.category]}
                    />
                    <span className="truncate font-medium text-slate-900">{expense.description}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(expense.date)} · paid by {expense.paidBy.name} · {CATEGORY_LABELS[expense.category]} ·{' '}
                    {expense.shares.length} {expense.shares.length === 1 ? 'person' : 'people'},{' '}
                    {SPLIT_LABELS[expense.splitType]}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums text-slate-900">{formatINR(expense.amount)}</span>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deleting === expense.id}
                    disabled={deleting !== null}
                    onClick={() => handleDelete(expense)}
                    aria-label={`Delete ${expense.description}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {isOpen && (
                <ul className="mt-2 grid gap-1 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
                  {expense.shares.map((share) => (
                    <li key={share.id} className="flex justify-between gap-2">
                      <span className="text-slate-600">{share.memberName}</span>
                      <span className="tabular-nums text-slate-900">{formatINR(share.shareAmount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
