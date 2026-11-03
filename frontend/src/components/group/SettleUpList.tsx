'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { api, ApiError } from '@/lib/api';
import { formatINR } from '@/lib/format';
import type { SettleSuggestion } from '@/lib/types';

interface SettleUpListProps {
  groupId: string;
  suggestions: SettleSuggestion[];
  onSettled: () => Promise<void>;
}

/** Minimum set of payments that clears every balance, each recordable in one click. */
export function SettleUpList({ groupId, suggestions, onSettled }: SettleUpListProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function record(suggestion: SettleSuggestion) {
    const key = `${suggestion.fromMemberId}-${suggestion.toMemberId}`;
    setPending(key);
    setError(null);
    try {
      await api.createSettlement(groupId, {
        fromMemberId: suggestion.fromMemberId,
        toMemberId: suggestion.toMemberId,
        amount: suggestion.amount,
        note: 'Settle-up suggestion',
      });
      await onSettled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the payment');
    } finally {
      setPending(null);
    }
  }

  if (suggestions.length === 0) {
    return <EmptyState title="Everyone is settled up 🎉">No payments are needed right now.</EmptyState>;
  }

  return (
    <div className="space-y-2">
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-slate-100">
        {suggestions.map((suggestion) => {
          const key = `${suggestion.fromMemberId}-${suggestion.toMemberId}`;
          return (
            <li key={key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{suggestion.fromName}</span> pays{' '}
                <span className="font-medium text-slate-900">{suggestion.toName}</span>{' '}
                <span className="font-semibold tabular-nums text-brand-700">{formatINR(suggestion.amount)}</span>
              </p>
              <Button
                size="sm"
                variant="secondary"
                loading={pending === key}
                disabled={pending !== null}
                onClick={() => record(suggestion)}
              >
                Mark as paid
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
