import { EmptyState } from '@/components/ui/Feedback';
import { formatDate, formatINR } from '@/lib/format';
import type { Settlement } from '@/lib/types';

export function SettlementHistory({ settlements }: { settlements: Settlement[] }) {
  if (settlements.length === 0) {
    return <EmptyState title="No payments recorded yet" />;
  }
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {settlements.map((settlement) => (
        <li key={settlement.id} className="flex items-start justify-between gap-3 py-2.5">
          <div>
            <p className="text-slate-700">
              <span className="font-medium text-slate-900">{settlement.fromMember.name}</span> paid{' '}
              <span className="font-medium text-slate-900">{settlement.toMember.name}</span>
            </p>
            <p className="text-xs text-slate-500">
              {formatDate(settlement.date)}
              {settlement.note ? ` · ${settlement.note}` : ''}
            </p>
          </div>
          <span className="font-semibold tabular-nums text-emerald-700">{formatINR(settlement.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
